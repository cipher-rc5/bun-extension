// Loopback-only, explicit routes: no repository or user files are exposed.
const helpers = await Bun.build({ entrypoints: ['e2e/browser-entry.ts'], target: 'browser', format: 'iife' });
if (!helpers.success || !helpers.outputs[0]) throw new Error('Could not bundle browser fixture');
const helperCode = await helpers.outputs[0].text();
const fixture = `<!doctype html><html><head><title>Browser fixture</title></head><body>
<style id="host-style">.needle { color: rgb(255, 0, 0); }</style>
<p id="copy" class="needle">needle a(b) plain</p>
<textarea id="draft">needle</textarea><input id="input" value="needle">
<select id="select"><option>needle</option></select>
<div id="editor" contenteditable><b>needle</b></div>
<div class="extension-highlight" id="host"><button id="host-button">needle</button><input id="host-input" value="draft"></div>
<script id="host-script" type="application/json">{"needle":true}</script>
<svg><text>needle</text></svg><script src="/helpers.js"></script></body></html>`;
Bun.serve({
  hostname: '127.0.0.1',
  port: 4173,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/fixture' || path.startsWith('/route')) return new Response(fixture, { headers: { 'Content-Type': 'text/html' } });
    if (path === '/helpers.js') return new Response(helperCode, { headers: { 'Content-Type': 'text/javascript' } });
    const file = new Map([['/popup', 'dist/index.html'], ['/styles.css', 'dist/styles.css'], ['/index.js', 'dist/index.js']]).get(path);
    return file ? new Response(Bun.file(file)) : new Response('Not found', { status: 404 });
  }
});
