import { expect, test } from 'bun:test';
import { encodePng } from '../build/generate-icons';

test('generated PNG scanlines decode with the standard zlib format', async () => {
  const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 64, 255, 255, 255, 0]);
  const png = await encodePng(2, pixels);
  expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  expect(view.getUint32(16)).toBe(2);
  expect(view.getUint32(20)).toBe(2);
  const chunks: string[] = [];
  let scanlines: Uint8Array | undefined;
  for (let offset = 8;offset < png.length;) {
    const size = view.getUint32(offset);
    const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
    chunks.push(type);
    if (type === 'IDAT') {
      const stream = new Blob([png.subarray(offset + 8, offset + 8 + size)]).stream().pipeThrough(new DecompressionStream('deflate'));
      scanlines = await new Response(stream).bytes();
    }
    offset += size + 12;
  }
  expect(chunks).toEqual(['IHDR', 'IDAT', 'IEND']);
  expect(scanlines).toEqual(new Uint8Array([0, ...pixels.subarray(0, 8), 0, ...pixels.subarray(8)]));
});
