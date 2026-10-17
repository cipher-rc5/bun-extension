# Browser Extension

A Chromium Manifest V3 extension built with Preact, TypeScript, Tailwind CSS v4, and Bun.
The extension name in `src/manifest.json` is `prototype_extension`; the current development version is `0.2.0`.

## Features

- Popup showing the active tab title/URL and a persistent click counter.
- Counter controls wait for hydration and completed saves, expose failures, and support retry/reset.
- Content script reporting word, link, and image counts on page load and SPA URL changes.
- Internal content-message actions for literal text highlighting and scrolling to the top.
- Hourly MV3 alarm for removing expired `temp_*` storage entries.

Highlight and scroll actions are available through the internal content-message API.

## Requirements

- Bun 1.4.3 (the package and CI toolchain selector).
- Chrome or Edge 111+, or a Chromium browser providing the same extension APIs and CSS features.
- `minimum_chrome_version` is declared in the manifest. Tailwind v4 requires this browser floor.

Project scripts use Bun and Web APIs. The committed bunfig.toml forces Bun's runtime and shell for JavaScript tools,
including browser-test workers; Node.js, npm, and npx are not required. Lint enforces this policy for first-party code.

## Install and run

```sh
bun install --frozen-lockfile
bun run build
```

In `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/`.

```sh
bun run dev
```

Development watches `src/` and `tailwind.config.ts`, serializes rebuilds, and emits linked JavaScript source maps.
Reload the extension in the browser after a build. Production builds are minified and omit source maps.

## Commands

| Command                           | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `bun run build`                   | Clean and build the complete unpacked extension                              |
| `bun run build:css`               | Compile CSS using the Tailwind compiler/scanner and Lightning CSS            |
| `bun run build:extension`         | Bundle only the popup                                                        |
| `bun run build:content`           | Bundle only the content script                                               |
| `bun run build:background`        | Bundle only the background worker                                            |
| `bun run copy:assets`             | Copy required manifest, HTML, and icons; fail if any are missing             |
| `bun run generate:icons`          | Generate PNG icons without external image libraries                          |
| `bun run type-check`              | Strictly check application, build, unit-test, and browser-test code          |
| `bun run test`                    | Run Bun unit and failure-path tests                                          |
| `bun run browser:install`         | Install the current test browser using Bun                                   |
| `bun run test:browser`            | Run native Chromium and installed-extension regressions after building       |
| `bun run test:compat`             | Run fixture tests with `COMPAT_CHROMIUM_EXECUTABLE` pointing to Chromium 111 |
| `bun run browser:install:compat`  | Download Chromium 111 for the Linux CI runner                                |
| `bun run lint` / `bun run format` | Check/apply project formatting with dprint                                   |
| `bun run check:bun`               | Enforce Bun-only APIs and script commands                                    |
| `bun audit`                       | Audit the locked dependency graph                                            |
| `bun run scan:secrets`            | Run the optional betterleaks repository scanner                              |
| `bun run release:check v0.2.0`    | Verify a stable release tag equals package and manifest versions             |
| `bun run clean`                   | Remove generated `dist/` output                                              |

Install the current test browser once with `bun run browser:install`.
See [testing](docs/TESTING.md) for the browser-floor check and failure reproduction details.

## Structure and customization

- `src/popup/Popup.tsx`: Preact UI; `index.tsx` mounts it.
- `src/background/index.ts`: message adapter and background-owned counter/analysis writers.
- `src/content/index.ts`: page analysis and validated content actions.
- `src/shared/messages.ts`: action-specific protocol, runtime validation, and background client.
- `src/lib/`: highlight ownership/traversal, navigation observation, persistence queues, and lifecycle helpers.
- `src/styles/globals.css`: CSS entry, explicitly loading `tailwind.config.ts`.
- `build/`: CSS compiler, bundling, asset copy, icon generation, dev watcher, and release validation.
- `tests/` and `e2e/`: unit/failure-path and native browser/extension tests.

Change colors/animations in `tailwind.config.ts`, loaded by the stylesheet's `@config` directive.
The CSS scanner reads only application source.
See [architecture](docs/ARCHITECTURE.md) for the protocol and storage design.

## CI and releases

Pushes and pull requests to `main` run frozen install, type-check, formatting, unit tests, build,
native browser/installed-extension tests, Chromium 111 compatibility fixtures, and dependency audit on Bun 1.4.3.
Repository-authored CI steps run Bun scripts for downloads, packaging, checksums, and provenance-bundle copying.
External actions use immutable commit SHAs; Dependabot checks those action references weekly.

Pushing a stable `vMAJOR.MINOR.PATCH` tag triggers release validation and repeats all checks before publishing.
The tag, `package.json`, and manifest versions must agree. Releases include the extension zip, SHA-256 checksums,
a CycloneDX SBOM, and a Sigstore provenance bundle for the archive and SBOM.

```sh
sha256sum --check extension-v0.2.0.zip.sha256
gh attestation verify extension-v0.2.0.zip --repo cipher-rc5/bun-extension
```

The checksum file covers both the zip and SBOM, so download both before checking it. Provenance generation uses
GitHub Actions OIDC; no release-signing key is stored in the repository. Nothing is published by a local build.

## Storage, permissions, and privacy

The counter is stored in Chrome sync storage and serialized by one background worker per browser profile.
Chrome sync replicates asynchronously across devices; simultaneous edits on different devices use Chrome's
last-writer-wins behavior, not a globally atomic counter.

The most recent page analysis (title, URL, counts, timestamp) is stored locally on the device. No analysis is sent
to a server. The static `<all_urls>` content-script match provides automatic analysis across eligible pages.
`activeTab`, `storage`, and `alarms` enable tab information, persistence, and cleanup. Browser-internal and other
restricted pages do not accept ordinary content scripts.

## Security and contributions

Report vulnerabilities privately through [SECURITY.md](SECURITY.md).
The betterleaks pre-commit hook is installed on `bun install`; install the scanner with `brew install betterleaks`.
Without that optional scanner the hook prints a warning. CI's dependency audit is required independently.
See [CONTRIBUTING.md](CONTRIBUTING.md) for checks and release procedures. MIT license; see [LICENSE](LICENSE).
