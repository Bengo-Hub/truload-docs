// Pulls the last N releases for each TruLoad component from the GitHub REST
// API and injects them into the release-notes markdown pages. Runs at docs
// build time before `mkdocs build`.
//
// Works without a token (subject to GitHub's anonymous rate limit). Set
// `GITHUB_TOKEN` in the environment to raise the limit.
//
// Usage: node scripts/fetch-releases.mjs

import fs from "node:fs";
import path from "node:path";

const repos = [
  { owner: "Bengo-Hub", repo: "truload-backend", file: "docs/release-notes/backend.md" },
  { owner: "Bengo-Hub", repo: "truload-frontend", file: "docs/release-notes/frontend.md" },
  { owner: "Bengo-Hub", repo: "TruConnect", file: "docs/release-notes/truconnect.md" },
];

const MAX_RELEASES = 20;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchReleases(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${MAX_RELEASES}`;
  const headers = { "Accept": "application/vnd.github+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`[fetch-releases] ${owner}/${repo} returned ${res.status}; skipping`);
    return null;
  }
  return res.json();
}

function formatRelease(r) {
  const date = r.published_at ? new Date(r.published_at).toISOString().slice(0, 10) : "unreleased";
  const title = r.name || r.tag_name;
  const body = (r.body || "").trim();
  const assetLines = (r.assets || [])
    .filter((a) => /\.(exe|msi|zip|dmg|AppImage|deb|rpm)$/i.test(a.name))
    .map((a) => `- [${a.name}](${a.browser_download_url}) (${Math.round(a.size / 1024 / 1024)} MB)`)
    .join("\n");
  const assetsBlock = assetLines ? `\n\n**Downloads**\n\n${assetLines}\n` : "";
  const bodyBlock = body ? `\n\n${body}\n` : "";
  return `### ${title} — ${date}\n\n[View on GitHub](${r.html_url})${assetsBlock}${bodyBlock}`;
}

function inject(filePath, marker, content) {
  const full = path.resolve(filePath);
  const src = fs.readFileSync(full, "utf8");
  const begin = `<!-- BEGIN:${marker} -->`;
  const end = `<!-- END:${marker} -->`;
  const startIdx = src.indexOf(begin);
  const endIdx = src.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    console.warn(`[fetch-releases] markers for ${marker} not found in ${filePath}`);
    return;
  }
  const next = src.slice(0, startIdx + begin.length) + "\n\n" + content + "\n\n" + src.slice(endIdx);
  fs.writeFileSync(full, next);
  console.log(`[fetch-releases] injected ${marker}`);
}

for (const { owner, repo, file } of repos) {
  try {
    const releases = await fetchReleases(owner, repo);
    if (!releases) continue;
    if (releases.length === 0) {
      inject(file, `release-notes:${repo}`, `_No releases yet for ${owner}/${repo}._`);
      continue;
    }
    const body = releases.map(formatRelease).join("\n\n---\n\n");
    inject(file, `release-notes:${repo}`, body);
  } catch (err) {
    console.warn(`[fetch-releases] failed for ${owner}/${repo}:`, err.message);
  }
}
