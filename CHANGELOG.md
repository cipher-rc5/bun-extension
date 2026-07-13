# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Added

- React 19 popup interface showing the active tab's title and URL, plus a persistent click counter backed by the Chrome
  storage API.
- Content script that analyzes the current page (counts words, links, and images) and can highlight text on the page.
- Background service worker that handles extension lifecycle events, message passing between the popup and content
  scripts, and storage-backed state.
- Chrome Extension Manifest V3 configuration with `activeTab` and `storage` permissions.

## Releases

`0.2.0` is the current in-development version, tracked via `src/manifest.json` and `package.json`. No `v0.2.0` git tag or
GitHub Release has been cut yet, so the `[0.2.0]` link below points at the `main` tree rather than a tagged release. A
tagged release is produced by pushing a `v*` tag, which triggers `.github/workflows/release.yml`.

[Unreleased]: https://github.com/cipher-rc5/bun-extension/commits/main
[0.2.0]: https://github.com/cipher-rc5/bun-extension/tree/main
