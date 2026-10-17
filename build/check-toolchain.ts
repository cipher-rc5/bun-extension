/** Keep first-party scripts on Bun APIs and prevent CLI shebangs from selecting another runtime. */
const failures: string[] = [];
const config = Bun.TOML.parse(await Bun.file('bunfig.toml').text()) as { run?: { bun?: boolean, shell?: string } };
if (config.run?.bun !== true || config.run.shell !== 'bun') failures.push('bunfig.toml must enforce the Bun runtime and shell');
const pkg = await Bun.file('package.json').json() as { scripts: Record<string, string> };
for (const [name, command] of Object.entries(pkg.scripts)) {
  if (!command.startsWith('bun ')) failures.push(`Script ${name} must start with bun`);
  if (/(?:^|[\s;&|])(?:node|npm|npx)(?:\s|$)/.test(command)) failures.push(`Script ${name} invokes a different runtime or package manager`);
}
const builtins = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'sea',
  'sqlite',
  'stream',
  'string_decoder',
  'sys',
  'test',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib'
]);
const ts = new Bun.Transpiler({ loader: 'ts', minifyWhitespace: true });
const tsx = new Bun.Transpiler({ loader: 'tsx', minifyWhitespace: true });
const files = ['.githooks/pre-commit'];
for (const pattern of ['{src,build,tests,e2e}/**/*.{ts,tsx,js,cjs,mjs}', '*.config.ts']) {
  for await (const file of new Bun.Glob(pattern).scan({ onlyFiles: true })) files.push(file);
}
for (const file of files) {
  const source = (await Bun.file(file).text()).replace(/^#![^\n]*(?:\n|$)/, '');
  const transpiler = file.endsWith('tsx') || file.endsWith('jsx') ? tsx : ts;
  for (const item of transpiler.scanImports(source)) {
    if (item.path.startsWith('node:') || builtins.has(item.path.split('/')[0]!)) {
      failures.push(`${file} imports a Node API: ${item.path}`);
    }
  }
  if (/\b(?:process\s*(?:\.|\[)|Buffer\s*(?:\.|\()|require\s*\()/.test(transpiler.transformSync(source))) {
    failures.push(`${file} uses a Node global`);
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Bun-only toolchain verified (${files.length} first-party files and ${Object.keys(pkg.scripts).length} scripts)`);
