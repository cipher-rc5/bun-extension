# Architecture

The extension has three separately bundled Manifest V3 surfaces: a Preact popup, an isolated-world content script,
and an event-driven background service worker. Runtime dependencies consist of Preact; build and test tooling is
kept in devDependencies. Bun emits self-contained IIFE bundles suitable for classic extension scripts.

## Message contract

`src/shared/messages.ts` maps each action to its payload and successful response data. Replies are either
`{ ok: true, action, data }` or `{ ok: false, error }`. Success data is correlated with its action at compile time;
Chrome's untyped request/response boundaries are validated at runtime. Unexpected fields are dropped from requests.
Malformed payloads, unsupported surface routes, and senders outside this extension receive explicit errors.

| Action             | Destination | Successful data                                                   |
| ------------------ | ----------- | ----------------------------------------------------------------- |
| `getTabInfo`       | background  | `{ tabId, url?, title? }` for the sender's tab                    |
| `getCounter`       | background  | `{ count }` after loading saved state                             |
| `incrementCounter` | background  | `{ count }` after persistence                                     |
| `resetCounter`     | background  | `{ count: 0 }` after persistence                                  |
| `updateBadge`      | background  | `null` after the badge APIs complete                              |
| `pageAnalyzed`     | background  | `null` after this analysis or a newer coalesced analysis is saved |
| `getPageData`      | content     | `{ title, url, wordCount, linkCount, imageCount }`                |
| `highlightText`    | content     | `null` after DOM work completes                                   |
| `scrollToTop`      | content     | `null` after requesting a smooth scroll                           |

Popup/content code uses `sendBackground` / `chrome.runtime.sendMessage` for background actions.
To target a page, extension code uses `chrome.tabs.sendMessage(tabId, message)`; runtime.sendMessage does not
forward content actions automatically. `routeAction` is used by the actual listeners to enforce the destination.

Background listeners return `true` while awaiting effects and respond only on completion or failure. Content
listeners complete synchronously and return `false`. DOM/storage/badge errors become error envelopes.
Request strings/counts are bounded and validated; counter values are nonnegative safe integers.

## Counter persistence

`createCounterStore` owns a bounded serial queue in the background worker. Every get/increment/reset waits behind
earlier operations. Increment reads saved state, checks overflow, awaits the sync-storage write, and only then
returns the authoritative count. Failed operations leave the queue usable. Missing counts default to zero without
writing over synchronized data; invalid values require an explicit reset. There is no install-time counter reset.

Popup editing stays disabled during hydration and writes. It displays only confirmed counts, exposes errors, and
supports read retry and explicit reset. A synchronous busy guard prevents events within one render from overlapping.
Chrome sync's asynchronous, last-writer-wins replication across devices is documented; this queue serializes
operations within one browser profile, not transactions across devices.

## Page analysis and navigation

The content script counts visible whitespace-delimited words, links, and images. It sends an initial analysis when
a document_idle body exists. URL observation combines popstate/hashchange with a 500 ms URL-only poll, since a page's
main-world pushState is invisible to history wrappers in the isolated content world. URL changes are debounced by
250 ms; pagehide pauses timers, pageshow resumes them, and the observer returns a disposer.

`createAnalysisWriter` writes immediately when idle. While storage is busy, it retains the newest pending analysis
and all accepted callers wait for that batch's write. It uses no delayed flush timer. Message replies keep the worker
alive while writes finish. The waiting-sender count is bounded; overload and storage errors are observable rather
than silently discarded. `lastPageAnalysis` in local storage contains the most recent accepted snapshot globally
across the profile, not a per-tab history.

## Highlight safety and work bounds

Highlighting uses an iterative DOM traversal and literal regular expressions. Raw-text elements, form controls,
editable subtrees, templates, and non-HTML namespaces are excluded. A WeakSet records inserted marks; matching CSS
class names never grant ownership. Cleanup unwraps owned marks while preserving children a page inserted and
normalizes only disjoint affected subtrees once. Native browser tests cover textarea values, CSS, scripts, contenteditable,
SVG, class collisions, host-inserted controls, and dense matches.

A search is limited to 1,000 characters, 200,000 visited nodes, 2 million scanned text characters, and 10,000 matches.
Traversal/match budgets are checked before inserting marks, so oversized requests fail without partial highlighting.
Shadow roots and separate frames are not traversed by the top-frame content script.

## Lifecycle

The worker checks for the existing `cleanup` alarm and creates it only when absent. Worker restarts preserve its
hourly schedule. Cleanup removes `temp_*` objects with finite timestamps older than 24 hours in one storage call;
failed reads/removals and alarm setup are reported in the worker console. Counter and analysis keys are unaffected.

## Build and release

`build/build-css.ts` calls the Tailwind compiler and native scanner directly, then Lightning CSS targets Chrome 111.
The stylesheet explicitly loads the theme configuration. No filesystem watcher dependency is needed for production
CSS generation. `build/build-all.ts` clears generated output, builds the three bundles, and copies required assets;
missing assets and bundler errors fail the build. Development emits linked JS maps and serializes watched rebuilds.

CI gates type-check application/tests, check formatting, run unit and installed-extension browser tests, build, and
audit the frozen graph. Release verifies stable tag/package/manifest equality before repeating the gates. All external
actions are pinned by full SHA, and Syft is version-pinned. Release packaging creates a zip, SBOM, checksums, and
GitHub OIDC provenance attestations before a single publish step. See README verification commands.
