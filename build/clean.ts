import { $ } from 'bun';

export async function clean(): Promise<void> {
  await $`rm -rf dist`;
}

if (import.meta.main) await clean();
