# Performance

## Runtime work

- Word counting scans non-whitespace runs with `RegExp.test`. Time is linear in input length, with constant auxiliary
  storage; it does not build arrays of words. JavaScript whitespace semantics match the original split-based count.
- Highlighting compiles one case-insensitive literal matcher per request, reads each eligible text node once, and
  retains a bounded plan before inserting marks. It rejects more than 1,000 search characters, 200,000 visited or
  queued nodes, 2 million scanned text characters, or 10,000 matches. Wide child lists are checked before queuing.
- Cleanup scans for owned marks once. When marks exist, it preserves host-inserted children and normalizes disjoint
  affected subtrees; when none exist, it returns immediately after the scan.
- Navigation polls only the URL every 500 ms in visible, active documents. Hidden tabs and pagehide cancel polling
  and the 250 ms debounce. Resuming checks the current URL and coalesces hidden route changes into one notification.
  Initial document analysis still runs when the content script loads with a body, including in a hidden tab.
- Counter operations serialize through a bounded background queue. Analysis writes retain the newest pending
  snapshot while storage is busy. Message parsing strips extra analysis fields before writing local storage.
- Builds clean output first, then run CSS compilation, three JavaScript bundles, and asset copying concurrently.
  All writers settle before success or failure is reported; development rebuilds remain serialized.

## Word-count benchmark

```sh
bun run bench:text
```

`build/benchmark.ts` uses fixed 20-, 10,000-, and 100,000-word strings with spaces, tabs, and newlines. Each fixture
warms up for 20 calls, then reports the median of seven batches. Batch sizes are 50,000, 100, and 10 calls,
respectively. A checksum consumes every result. No timing threshold runs in CI.

Measured on macOS arm64 with Bun 1.4.3 on 2026-10-17:

| Fixture                              | Split/filter baseline, ms/call | Streaming scan, ms/call | Relative speed |
| ------------------------------------ | ------------------------------ | ----------------------- | -------------- |
| 10,000 words / 57,500 UTF-16 units   | 0.1821                         | 0.0863                  | 2.1×           |
| 100,000 words / 575,000 UTF-16 units | 1.9565                         | 0.8726                  | 2.2×           |

The baseline used `text.trim().split(/\s+/).filter(word => word.length > 0).length`. Both runs used the same fixtures,
warmup, batches, host, and runtime, with a checksum of 23,200,400. These results measure the text helper under Bun;
they do not establish an equivalent Chromium or end-to-end page-analysis speedup.

## Regression checks and profiling limits

`bun run test` checks Unicode whitespace, matcher reuse, cross-node match limits, one text read per highlighted node,
wide-tree rejection before child queuing, and cleanup without redundant scans. `bun run test:browser` checks native
DOM preservation, normalization work, hidden navigation, page lifecycle events, and installed-extension behavior.
These assertions measure work and behavior independently of machine timing.

Full page analysis still reads `body.innerText` and queries links and images synchronously. That preserves visible
text semantics and fresh results, but its cost includes layout and host-document size, which the text benchmark
does not measure. Profile representative small, large, and dynamically updated pages in Chromium before introducing
caching or scheduling changes. Compare the same document, browser version, and production build; record layout time,
analysis duration, and allocated memory separately. Highlight timings likewise depend on host structure and native
DOM mutation costs beyond the deterministic work bounds.
