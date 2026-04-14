# Release Notes

[:material-rocket-launch: Backend](backend.md){ .md-button }
[:material-web: Frontend](frontend.md){ .md-button }
[:material-desktop-classic: TruConnect](truconnect.md){ .md-button }

Each component cuts releases independently. The history on the pages above
is pulled from GitHub Releases on every documentation build.

## How releases happen

- **`truload-backend`** and **`truload-frontend`** use
  [release-please](https://github.com/googleapis/release-please). Every
  merge to `main` updates a rolling "release PR" collecting
  conventional-commit entries. Merging that PR cuts the tag, writes
  `CHANGELOG.md`, and publishes the GitHub Release.
- **TruConnect** uses `scripts/release.sh` plus `electron-builder`. A
  patch release is cut on every merge to `master` (excluding release
  commits), and the signed Windows installer is uploaded as a release
  asset.

## Upstream

- <https://github.com/Bengo-Hub/truload-backend/releases>
- <https://github.com/Bengo-Hub/truload-frontend/releases>
- <https://github.com/Bengo-Hub/TruConnect/releases>
