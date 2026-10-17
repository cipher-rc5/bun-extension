/** Missing declared assets are build failures, never silently ignored. */
export async function copyAssets(): Promise<void> {
  const assets = [
    ['src/manifest.json', 'dist/manifest.json'],
    ['src/popup/index.html', 'dist/index.html'],
    ...[16, 32, 48, 128].map(size => [`src/assets/icon${size}.png`, `dist/assets/icon${size}.png`])
  ];
  for (const pair of assets) {
    const [source, destination] = pair;
    if (!source || !destination) throw new Error('Invalid asset mapping');
    const file = Bun.file(source);
    if (!await file.exists()) throw new Error(`Required asset missing: ${source}`);
    await Bun.write(destination, file, { createPath: true });
  }
}
if (import.meta.main) await copyAssets();
