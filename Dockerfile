# syntax=docker/dockerfile:1.7

# Stage 1 — build the MkDocs site and generate PDFs via Playwright.
FROM python:3.12-slim AS build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_VERSION=20

# Install Node.js (for Playwright-based PDF export and the release-notes fetcher),
# plus the Chromium runtime deps Playwright needs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg git \
      libnss3 libatk-bridge2.0-0 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 \
      libpango-1.0-0 libcairo2 libgtk-3-0 libdrm2 \
 && curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /docs

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi \
 && npx playwright install chromium

COPY . .

# Pull the latest GitHub release notes into the release-notes pages. Fails
# open — if the network or the API is unavailable, the placeholder stays and
# the site still builds.
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=${GITHUB_TOKEN}
RUN node scripts/fetch-releases.mjs || echo "fetch-releases skipped"

# Build without --strict: the git-revision-date-localized-plugin emits
# warnings inside Docker since there's no real git history.
# Strict validation is already handled by the CI validate job.
RUN mkdocs build

# Generate the three PDFs from the built site and copy them into site/pdf/
# so they are served alongside the HTML.
RUN node scripts/export-pdf.mjs \
 && mkdir -p site/pdf \
 && cp site/exports/*.pdf site/pdf/

# Stage 2 — minimal NGINX runtime.
FROM nginx:alpine

COPY --from=build /docs/site /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
