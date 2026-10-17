import { $ } from 'bun';
import { checkRelease } from './check-release';
import { appendCIEnv } from './ci-env';

const pkg = await Bun.file('package.json').json();
const manifest = await Bun.file('src/manifest.json').json();
const tag = Bun.env.GITHUB_REF_NAME ?? '';
checkRelease(tag, pkg.version, manifest.version);
const archive = `extension-${tag}.zip`;
const sbom = `extension-${tag}.sbom.json`;
switch (Bun.argv[2]) {
  case 'package': {
    const file = Bun.file(archive);
    if (await file.exists()) await file.delete();
    const absolute = Bun.fileURLToPath(new URL(`../${archive}`, import.meta.url));
    await $`zip -q -r ${absolute} .`.cwd('dist');
    await appendCIEnv('ZIP', archive);
    break;
  }
  case 'checksums': {
    const checksums: string[] = [];
    for (const path of [archive, sbom]) {
      const hash = new Bun.CryptoHasher('sha256').update(await Bun.file(path).arrayBuffer()).digest('hex');
      checksums.push(`${hash}  ${path}`);
    }
    await Bun.write(`${archive}.sha256`, `${checksums.join('\n')}\n`);
    break;
  }
  case 'bundle': {
    const path = Bun.env.BUNDLE;
    if (!path || !await Bun.file(path).exists()) throw new Error('Missing provenance bundle');
    await Bun.write(`${archive}.sigstore.json`, Bun.file(path));
    break;
  }
  default:
    throw new Error('Choose a release artifact operation: package, checksums, or bundle');
}
