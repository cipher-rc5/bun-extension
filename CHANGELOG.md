# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Popup uses Preact 11 directly and displays confirmed counter state, with hydration gating, retry, and storage errors.
- Counter operations share a bounded background queue; page-analysis writes retain the newest pending snapshot.
- Highlighting preserves forms, editable content, styles, and page-owned controls; cleanup normalizes each parent once.
- SPA URL detection works across isolated worlds, and cleanup alarms preserve their schedule on worker restart.
- Messages use validated, action-specific success/error envelopes; browser support starts at Chromium 111.
- CSS builds use the Tailwind compiler/scanner directly; development builds include linked JavaScript source maps.
- Word counting scans without token arrays; highlighting reuses one matcher and plans each text node once.
- Hidden tabs pause navigation polling and catch up on visibility restoration; wide highlight trees reject before queuing children.
- Independent build tasks run concurrently and finish before the build reports a result.
- Page-analysis persistence strips extra payload fields; code comments focus on constraints and invariants.

### Added

- Native DOM, installed-extension, lifecycle, persistence-failure, and release-version regression tests.
- Release version validation, immutable action pins, automated action updates, and archive/SBOM provenance attestations.
- Repeatable word-count benchmarks, performance documentation, and deterministic traversal and navigation regressions.

## [0.2.0]

### Added

- Preact popup interface showing the active tab's title and URL, plus a persistent click counter backed by the Chrome
  storage API.
- Content script that analyzes the current page (counts words, links, and images) and can highlight text on the page.
- Background service worker that handles extension lifecycle events, message passing between the popup and content
  scripts, and storage-backed state.
- Chrome Extension Manifest V3 configuration with `activeTab` and `storage` permissions.

## Releases

`0.2.0` is tracked in `src/manifest.json` and `package.json`; the `[0.2.0]` link below points at the `main` tree.
Pushing a matching stable `vMAJOR.MINOR.PATCH` tag triggers `.github/workflows/release.yml`.

[Unreleased]: https://github.com/cipher-rc5/bun-extension/commits/main
[0.2.0]: https://github.com/cipher-rc5/bun-extension/tree/main
