import { Scanner } from '@tailwindcss/oxide';
import { transform } from 'lightningcss';
import { compile } from 'tailwindcss';
/** Resolve Tailwind imports and config with Bun, without a Node filesystem adapter. */
export async function buildCss(development = false): Promise<void> {
  const compiler = await compile(await Bun.file('src/styles/globals.css').text(), {
    base: `${import.meta.dir}/../src/styles`,
    async loadStylesheet(id, base) {
      const path = Bun.resolveSync(id === 'tailwindcss' ? 'tailwindcss/index.css' : id, base);
      return { path, base: Bun.fileURLToPath(new URL('.', Bun.pathToFileURL(path))), content: await Bun.file(path).text() };
    },
    async loadModule(id, base) {
      const path = Bun.resolveSync(id, base);
      const module = await import(Bun.pathToFileURL(path).href);
      return { path, base: Bun.fileURLToPath(new URL('.', Bun.pathToFileURL(path))), module: module.default };
    }
  });
  const scanner = new Scanner({ sources: [{ base: `${import.meta.dir}/../src`, pattern: '**/*.{ts,tsx,html}', negated: false }] });
  const result = transform({
    filename: 'styles.css',
    code: new TextEncoder().encode(compiler.build(scanner.scan())),
    minify: !development,
    targets: { chrome: 111 << 16 }
  });
  await Bun.write('dist/styles.css', result.code, { createPath: true });
}
if (import.meta.main) await buildCss(Bun.argv.includes('--development'));
