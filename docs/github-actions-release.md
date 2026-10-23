# Releasing Posh with GitHub Actions

Status: **planned, not implemented.** This note records the setup we agreed on;
the workflow files come later.

## Goal

Push a version tag and get installers for every supported desktop OS, attached
to a draft GitHub Release. No release build depends on a developer's laptop.

Supported targets for the first pass:

| OS | Artifacts |
| --- | --- |
| Linux (x86_64) | `.deb`, `.rpm`, `.AppImage` |
| Windows (x86_64) | `.msi`, NSIS `.exe` |

Not included: Android, iOS, macOS, code signing, and auto-update. Each can be
added later without changing the shape below.

## Triggers

| Event | What happens |
| --- | --- |
| Push tag `v*` (e.g. `v0.1.0`) | Check, build both platforms, create a **draft** release |
| Manual `workflow_dispatch` | Check and build, upload artifacts only — no release |

Draft releases are reviewed by hand before publishing, so a bad tag never
reaches the shop.

## Jobs

1. **verify** (`ubuntu-latest`)
   - Checkout, Bun, Rust toolchain.
   - `bun run check`, `bunx vitest run`.
   - `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
     `cargo test`.
   - Fail if the tag does not match `version` in `desktop/src-tauri/tauri.conf.json`.
   - The build jobs depend on this job.

2. **build-linux** (`ubuntu-22.04`)
   - Install Tauri system packages: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`,
     `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`, `rpm`.
   - `bun install`, then `tauri-action` with
     `--bundles deb,rpm,appimage`.
   - Upload the bundles as workflow artifacts and to the draft release.

3. **build-windows** (`windows-latest`)
   - Bun and Rust; WebView2 is present on the runner.
   - `bun install`, then `tauri-action` with the default MSI/NSIS bundles.
   - Upload the installers as workflow artifacts and to the draft release.

4. **release**
   - `tauri-action` creates or updates the draft release for the tag.
   - Release notes start as a placeholder; edit them on GitHub before publishing.
   - `permissions: contents: write`; no personal access token needed.

## Repository assumptions

- Workflow files live at `.github/workflows/`.
- The app is in `desktop/`; `tauri-action` receives `projectPath: desktop`.
- Bun is the package manager (lockfile committed). `Cargo.lock` stays committed.
- Standard GitHub-hosted runners are x86_64 only.

## Dependencies and caching

- `oven-sh/setup-bun` for Bun.
- `dtolnay/rust-toolchain` with `stable`.
- `Swatinem/rust-cache` with `workspaces: desktop/src-tauri`.
- Linux bundling downloads `linuxdeploy` once per run from GitHub; the runner is
  disposable, so there is no persistent cache to seed.

## Versions

The version lives in `desktop/src-tauri/tauri.conf.json` and
`desktop/package.json`. Release procedure:

1. Bump both to the new version and commit.
2. Tag the commit: `git tag v0.1.0 && git push origin v0.1.0`.
3. Wait for the workflow; review the draft release.
4. Publish. Tills install the artifact for their OS.

The tag must match the config version, otherwise `verify` fails.

## Secrets and signing

Nothing secret is needed for the first pass. Unsigned builds are usable but show:

- Windows SmartScreen — "More info → Run anyway".
- macOS Gatekeeper — not applicable until macOS is added.

Later additions:

| Addition | Secrets |
| --- | --- |
| Windows code signing | Certificate + password |
| macOS signing/notarization | Apple Developer account, certificates |
| Auto-update | `TAURI_SIGNING_PRIVATE_KEY` + password |

Secrets belong in GitHub repository settings, never in the repo.

## Cost

- Public repository: free.
- Private repository: GitHub Free includes 2,000 minutes/month.
  Windows minutes count 2×, macOS 10× (macOS is not in the first pass).
- A release run is roughly 10–15 minutes of wall time; platform builds run in
  parallel.

## Open questions

- Public or private repository.
- Whether to add macOS later (needs an Apple Developer account for clean installs).
- Whether to add Windows signing.
- Whether auto-update is wanted; it needs Tauri's updater plugin, a signing key,
  and a release feed.

## Future work

- [ ] Add `.github/workflows/ci.yml` for push/PR checks.
- [ ] Add `.github/workflows/release.yml` for tags and manual dispatch.
- [ ] Create the GitHub repository and push `main`.
- [ ] Tag `v0.1.0` and verify the draft release.
- [ ] Install the artifacts on a Fedora and a Windows machine.
- [ ] Document the install and SmartScreen steps in `desktop/README.md`.
