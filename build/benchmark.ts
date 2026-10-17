import { countWords } from '../src/lib/text';

let checksum = 0;
console.log(`Word counting — Bun ${Bun.version}`);
for (const words of [20, 10000, 100000]) {
  const text = 'alpha beta\tgamma\ndelta '.repeat(words / 4);
  const iterations = Math.max(10, Math.floor(1000000 / words));
  for (let i = 0;i < 20;i++) checksum += countWords(text);
  const samples: number[] = [];
  for (let trial = 0;trial < 7;trial++) {
    const started = performance.now();
    for (let i = 0;i < iterations;i++) checksum += countWords(text);
    samples.push((performance.now() - started) / iterations);
  }
  samples.sort((a, b) => a - b);
  console.log(`${words} words (${text.length} UTF-16 units): ${samples[3]!.toFixed(4)} ms/call (median of 7 × ${iterations})`);
}
console.log(`Checksum: ${checksum}`);
