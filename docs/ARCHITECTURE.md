# Architecture

This is a Chrome Manifest V3 browser extension built with Bun, React 19, TypeScript, and Tailwind CSS. It demonstrates the
three MV3 runtime surfaces communicating over a single typed message contract, with pure business logic factored out for
unit testing.

## Overview

The extension has three runtime surfaces, each a separate bundle:

- **Popup** (`src/popup/index.tsx`) — the React 19 UI shown when the toolbar icon is clicked. Renders the active tab's
  title/URL and a persistent click counter backed by `chrome.storage.sync`.
- **Content script** (`src/content/index.ts`) — injected into every page (`<all_urls>`). Analyzes the page (word, link,
  and image counts), highlights text, scrolls to top, and watches for SPA URL changes via a `MutationObserver`.
- **Background service worker** (`src/background/index.ts`) — the event-driven coordinator. Handles install-time
  initialization, message routing, badge updates, storing the latest page analysis, and periodic storage cleanup.

Shared, DOM-free logic lives in `src/lib/` and `src/shared/` so it can be imported by any surface and unit-tested in
isolation.

## Message contract

All cross-surface communication uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`, typed against the
discriminated union `ExtensionMessage` in `src/shared/messages.ts`. Each variant is tagged by its `action` field, so a
`switch (request.action)` narrows the payload type at compile time. Responses are similarly typed via the
`ExtensionResponse` union and the `SendResponse` callback, so a wrong-shaped `sendResponse` is a compile error.

`routeAction(action)` is a pure function that maps an action string to the surface that owns it (`'background'`,
`'content'`, or `'unknown'`). It encodes the routing decision without touching `chrome` or the DOM, which makes the
contract independently unit-testable (`tests/messages.test.ts`).

| Action          | Handling surface | Purpose                                                           |
| --------------- | ---------------- | ----------------------------------------------------------------- |
| `getTabInfo`    | background       | Return the sender tab's `id` / `url` / `title`.                   |
| `updateBadge`   | background       | Set the toolbar badge text and background color for the tab.      |
| `pageAnalyzed`  | background       | Persist the latest `PageData` analysis to `chrome.storage.local`. |
| `getPageData`   | content          | Analyze the current page and return `PageData`.                   |
| `highlightText` | content          | Highlight all occurrences of a search term on the page.           |
| `scrollToTop`   | content          | Smooth-scroll the page to the top.                                |

Both the background and content `onMessage` listeners `return true` to keep the message channel open for the response.
The content script also proactively sends `pageAnalyzed` on load and whenever the SPA URL changes.

## Shared logic

Pure functions are deliberately kept out of the DOM/`chrome`-bound entry files so they can be imported by both the runtime
surfaces and the test suite:

- `src/lib/text.ts` — `countWords`, `escapeRegExp`, `splitForHighlight` (highlight tokenization).
- `src/lib/cleanup.ts` — `shouldCleanup`, the TTL predicate driving storage pruning.
- `src/shared/messages.ts` — the `ExtensionMessage` / `ExtensionResponse` types, `MessageAction`, and `routeAction`.

The content and background entry files import these helpers rather than reimplementing them, so the logic exercised by
tests is the same logic that runs in the browser.

## Storage & lifecycle

The extension uses both `chrome.storage` areas:

- **`chrome.storage.sync`** — user-facing, synced state: `count` (click counter) and `settings` (`theme`,
  `notifications`), initialized on `onInstalled`.
- **`chrome.storage.local`** — transient/device-local state: `lastPageAnalysis` (the most recent `PageData` plus a
  timestamp) and any `temp_*` scratch keys.

MV3 service workers are suspended when idle, so `setInterval` is unreliable for periodic work. Instead the background
script registers a `chrome.alarms` alarm named `cleanup` (hourly, idempotent by name). On each alarm it scans
`chrome.storage.local` and removes stale entries using the `shouldCleanup` predicate — a `temp_*` key whose `timestamp`
is older than the 24-hour TTL. The `alarms` permission is declared in the manifest.

## Build pipeline

`bun run build` runs `build/build-all.ts`, which:

1. Copies static assets via `build/copy-assets.ts` — `src/manifest.json` → `dist/manifest.json`,
   `src/popup/index.html` → `dist/index.html`, and `src/assets/icon{16,32,48,128}.png` → `dist/assets/`.
2. Compiles Tailwind CSS (`@tailwindcss/cli`, minified) from `src/styles/globals.css` → `dist/styles.css`.
3. Bundles each surface with `bun build` (`--target browser --minify`): popup → `dist/index.js`, content →
   `dist/content.js`, background → `dist/background.js`.

The output directory `dist/` is a ready-to-load unpacked extension. Icons are produced by `build/generate-icons.ts`, a
dependency-free PNG encoder (RGBA buffer → `node:zlib` deflate + hand-rolled CRC32) that renders a rounded blue-gradient
square with a white "R" glyph at each required size.

## Testing & CI

`bun test` runs the suite in `tests/` against the pure functions in `src/lib/` and `src/shared/`
(`background.test.ts` → `shouldCleanup`, `content.test.ts` → text helpers, `messages.test.ts` → `routeAction`). The tests
require no browser or DOM because the logic under test is isolated from the runtime surfaces.

CI (`.github/workflows/ci.yml`, on push/PR to `main`) runs a fixed gate sequence on Bun: **type-check → lint (dprint
check) → test → build → audit**. Release (`.github/workflows/release.yml`) is triggered by `v*` tags; it repeats the same
checks, then packages `dist/` into a versioned zip, generates a SHA-256 checksum and a CycloneDX SBOM, and publishes a
GitHub Release.
