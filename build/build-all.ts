import { buildCss } from './build-css';
import { clean } from './clean';
import { copyAssets } from './copy-assets';
export async function buildAll(development = false): Promise<void> {
  await clean();
  const entries = [['src/popup/index.tsx', 'index.js'], ['src/content/index.ts', 'content.js'], ['src/background/index.ts', 'background.js']];
  const bundles = entries.map(async ([entry, name]) => {
    const result = await Bun.build({
      entrypoints: [entry!],
      outdir: './dist',
      naming: name,
      target: 'browser',
      format: 'iife',
      minify: !development,
      sourcemap: development ? 'linked' : 'none'
    });
    if (!result.success) throw new AggregateError(result.logs, `Could not build ${entry}`);
    console.log(`${name}: ${result.outputs.find(output => output.kind === 'entry-point')?.size ?? 0} bytes`);
  });
  // Finish all writers before returning, including when one task fails.
  const results = await Promise.allSettled([buildCss(development), ...bundles, copyAssets()]);
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Extension build failed');
  console.log(`Extension built in dist/ (${development ? 'development with source maps' : 'production'})`);
}
if (import.meta.main) await buildAll(Bun.argv.includes('--development'));
