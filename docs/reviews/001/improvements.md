# Improvements Checklist

**Generated from review:** _dev/reviews/001/critical_analysis.md
**Date:** 2026-07-12

---

## P0 — Blockers

- [ ] **[Safety]** Fix failing type-check: narrow `items[key]` before reading `.timestamp` in the cleanup loop — `src/background/index.ts:60-61` — Effort: S
- [ ] **[Testing]** Add a test harness and at least smoke tests for page analysis, highlight round-trip, and storage counter — repository-wide — Effort: M
- [ ] **[CI/CD]** Add `.github/workflows/ci.yml` running `bun install --frozen-lockfile`, `bun run type-check`, `bun run build`, and `bun audit` on push/PR to `master` — Effort: M
- [ ] **[CI/CD]** Resolve the divergent manifest version: single source of truth for extension version (`build/build-all.ts:20` = `1.0.0` vs `src/manifest.json:4` = `0.2.0`) — Effort: S
- [ ] **[Release]** Ship an icon: declare `icons`/`action.default_icon` in the manifest and produce PNGs (or reference the existing SVGs), since `copy-assets.ts:43-44` currently looks for non-existent `.png` files — `src/manifest.json`, `build/copy-assets.ts` — Effort: M

## P1 — Pre-release

- [ ] **[Docs]** Add a `LICENSE` file (readme claims MIT but none exists) — `readme.md:157-159` — Effort: S
- [ ] **[Docs]** Fix README script/file drift: `bun run build:all` → `build`; `build.js`/`tailwind.config.js`/`postcss.config.js` → `.ts` equivalents — `readme.md:32,57-59,73` — Effort: S
- [ ] **[Safety]** Escape user input before building the highlight regex to avoid throws/mis-highlights on metacharacters — `src/content/index.ts:105` — Effort: S
- [ ] **[Error Handling]** Ensure every message-handler branch calls `sendResponse` (or returns `false`) so sender callbacks don't hang — `src/background/index.ts:18-29` — Effort: S
- [ ] **[Concurrency]** Replace `setInterval` cleanup with `chrome.alarms`; MV3 service workers are suspended and the interval will not fire reliably — `src/background/index.ts:53-68` — Effort: S
- [ ] **[Dependencies]** Declare `@tailwindcss/cli` as a dependency so `bun run build` does not mutate `bun.lock` at build time — `package.json`, `build/build-all.ts:73` — Effort: S

## P2 — Should-fix

- [ ] **[Dependencies]** Move build/type-only packages (`@types/*`, `autoprefixer`, `postcss`, `tailwindcss`) from `dependencies` to `devDependencies` — `package.json:22-31` — Effort: S
- [ ] **[Conventions]** Add `build/` to `tsconfig.json` `include` (or a second tsconfig) so build scripts are type-checked — `tsconfig.json:23` — Effort: S
- [ ] **[Conventions]** Add a `lint`/`format` script wired to `dprint` and enforce it (locally + CI) — `package.json:7-18`, `dprint.json` — Effort: S
- [ ] **[API]** Introduce a shared, typed message contract (union/enum) imported by popup/content/background instead of stringly-typed `request.action` — Effort: M
- [ ] **[Docs]** Reconcile extension name across README and manifest ("React Browser Extension" vs `prototype_extension`) — `readme.md:1-2`, `src/manifest.json:3` — Effort: S

## P3 — Nice-to-have

- [ ] **[Performance]** Evaluate reducing the 400 KB popup bundle (code-splitting or Preact) — `dist/index.js` — Effort: M
- [ ] **[Performance]** Narrow the content-script `MutationObserver` or debounce URL-change detection instead of observing the full subtree — `src/content/index.ts:174-182` — Effort: S
- [ ] **[Conventions]** Remove or gate production `console.log`/`console.warn` behind a debug flag — `src/background/index.ts`, `src/content/index.ts` — Effort: S
- [ ] **[API]** Remove the misleading `export` from the content-script entrypoint (unreachable when bundled as an IIFE) — `src/content/index.ts:198` — Effort: S
- [ ] **[Docs]** Add a `CHANGELOG.md` and a `SECURITY.md` reporting contact — Effort: S

---

## Progress

**Total items:** 21
**P0:** 5 | **P1:** 6 | **P2:** 5 | **P3:** 5
