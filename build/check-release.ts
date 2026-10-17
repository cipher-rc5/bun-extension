/** Stable release tags must exactly match both package and Chrome manifest versions. */
export function checkRelease(tag: string, packageVersion: string, manifestVersion: string): void {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) throw new Error('Release tag must be vMAJOR.MINOR.PATCH');
  if (tag.slice(1) !== packageVersion || packageVersion !== manifestVersion) {
    throw new Error('Tag, package, and manifest versions must match');
  }
}
if (import.meta.main) {
  const pkg = await Bun.file('package.json').json();
  const manifest = await Bun.file('src/manifest.json').json();
  checkRelease(Bun.env.GITHUB_REF_NAME ?? Bun.argv[2] ?? '', pkg.version, manifest.version);
  console.log('Release versions match');
}
