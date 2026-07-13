# Improvements Checklist

**Generated from review:** _dev/reviews/002/critical_analysis.md
**Date:** 2026-07-13

---

## P0 — Blockers

None identified.

## P1 — Pre-release

- [ ] **[Testing]** Make tests exercise the real `src/` functions instead of re-implemented copies (extract pure helpers like `countWords`/`escapeRegExp`/`shouldCleanup` into an importable module and test those) — `tests/background.test.ts:6`, `tests/content.test.ts:6,13` — Effort: M
- [ ] **[Testing]** Add coverage for the highlight/`removeHighlights` DOM round-trip and the message-router branches — Effort: M
- [ ] **[Error Handling]** Surface `chrome.runtime.lastError` on `sendMessage` beyond debug-gated logging so failed sends are observable with `DEBUG = false` — `src/content/index.ts:57-59` — Effort: S
- [ ] **[Docs]** Fix the dead CHANGELOG release/compare links or create the `v0.2.0` tag they reference — `CHANGELOG.md:21-22` — Effort: S

## P2 — Should-fix

- [ ] **[API]** Remove or implement the unhandled `openPopup` / `pageAnalyzed` message actions; wire a shared typed message contract across popup/content/background — `src/content/index.ts:203`, `src/background/index.ts:19` — Effort: M
- [ ] **[Conventions]** Remove the orphaned `build/build-css.ts` (no script or caller references it) — `build/build-css.ts` — Effort: S
- [ ] **[Conventions]** Reconcile the two asset-copy paths: `build/copy-assets.ts` (via `copy:assets`) duplicates `build-all.ts`'s inline logic — delete one or have build-all call it — `build/copy-assets.ts` — Effort: S
- [ ] **[CI/CD]** Move `git config core.hooksPath` out of the `prepare` lifecycle (or guard it) so a plain `bun install` / CI install does not set repo-local git config as a side effect — `package.json:22` — Effort: S
- [ ] **[Docs]** Document the test suite (`bun run test`) and CI pipeline in the README — `readme.md` — Effort: S

## P3 — Nice-to-have

- [ ] **[CI/CD]** Add a release workflow that packages a store-ready `.zip`, generates a checksum, and tags the version — Effort: M
- [ ] **[Performance]** Evaluate reducing the ~400 KB popup bundle (code-splitting or a lighter runtime such as Preact) — `dist/index.js` — Effort: M
- [ ] **[Performance]** Narrow or debounce the content-script `MutationObserver` used only for URL-change detection — `src/content/index.ts:184-192` — Effort: S
- [ ] **[Error Handling]** Check `chrome.runtime.lastError` after fire-and-forget storage/badge writes — `src/background/index.ts:14,33-34,81` — Effort: S
- [ ] **[Safety]** Drop the misleading `async` on `runCleanup` (it never awaits) or convert its storage access to the promise API — `src/background/index.ts:65` — Effort: S
- [ ] **[Docs]** Add a `version` field to `package.json` and note the `typescript@7.0.2` toolchain requirement — `package.json` — Effort: S

---

## Progress

**Total items:** 15
**P0:** 0 | **P1:** 4 | **P2:** 5 | **P3:** 6
