// Render RGBA icons and encode PNGs with Web Compression Streams and CRC32.

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const sizes = [16, 32, 48, 128];

const gradientTop: Rgb = { r: 0x3b, g: 0x82, b: 0xf6 };
const gradientBottom: Rgb = { r: 0x1d, g: 0x4e, b: 0xd8 };

// 5x7 bitmap for the letter "R" (1 = white pixel).
const glyphR = [[1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0], [1, 0, 1, 0, 0], [1, 0, 0, 1, 0], [1, 0, 0, 0, 1]];

const glyphWidth = 5;
const glyphHeight = 7;

// IEEE CRC32 polynomial used by PNG chunks.
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0;n < 256;n++) {
    let c = n;
    for (let k = 0;k < 8;k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0;i < bytes.length;i++) {
    const byte = bytes[i] ?? 0;
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Render a rounded gradient square with a centered white R and transparent corners. */
function renderIcon(size: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const radius = Math.max(1, Math.round(size * 0.2));

  // Scale the glyph to roughly 60% of the icon and center it.
  const scale = Math.max(1, Math.floor((size * 0.6) / glyphHeight));
  const glyphPixelWidth = glyphWidth * scale;
  const glyphPixelHeight = glyphHeight * scale;
  const glyphOffsetX = Math.floor((size - glyphPixelWidth) / 2);
  const glyphOffsetY = Math.floor((size - glyphPixelHeight) / 2);

  for (let y = 0;y < size;y++) {
    const t = size > 1 ? y / (size - 1) : 0;
    const rowR = lerp(gradientTop.r, gradientBottom.r, t);
    const rowG = lerp(gradientTop.g, gradientBottom.g, t);
    const rowB = lerp(gradientTop.b, gradientBottom.b, t);

    for (let x = 0;x < size;x++) {
      const idx = (y * size + x) * 4;

      if (!insideRoundedSquare(x, y, size, radius)) continue;

      let r = rowR;
      let g = rowG;
      let b = rowB;

      const gx = x - glyphOffsetX;
      const gy = y - glyphOffsetY;
      if (gx >= 0 && gy >= 0 && gx < glyphPixelWidth && gy < glyphPixelHeight) {
        const glyphRow = glyphR[Math.floor(gy / scale)];
        const cell = glyphRow ? glyphRow[Math.floor(gx / scale)] : 0;
        if (cell === 1) {
          r = 0xff;
          g = 0xff;
          b = 0xff;
        }
      }

      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 0xff;
    }
  }

  return pixels;
}

/** Test pixel-center coverage against rounded corner arcs. */
function insideRoundedSquare(x: number, y: number, size: number, radius: number): boolean {
  const cx = x + 0.5;
  const cy = y + 0.5;

  let centerX: number | null = null;
  let centerY: number | null = null;

  if (cx < radius) {
    centerX = radius;
  } else if (cx > size - radius) {
    centerX = size - radius;
  }

  if (cy < radius) {
    centerY = radius;
  } else if (cy > size - radius) {
    centerY = size - radius;
  }

  // Arc clipping applies only where both corner bands intersect.
  if (centerX !== null && centerY !== null) {
    const dx = cx - centerX;
    const dy = cy - centerY;
    return dx * dx + dy * dy <= radius * radius;
  }

  return true;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array(4);
  for (let i = 0;i < 4;i++) {
    typeBytes[i] = type.charCodeAt(i);
  }

  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);

  const out = new Uint8Array(4 + body.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(4 + body.length, crc32(body));
  return out;
}

export async function encodePng(size: number, pixels: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, size); // width
  ihdrView.setUint32(4, size); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines, each prefixed with filter byte 0.
  const stride = size * 4;
  const raw = new Uint8Array((stride + 1) * size);
  for (let y = 0;y < size;y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(pixels.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }

  // CompressionStream('deflate') includes the zlib wrapper required by PNG.
  const compressed = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
  const idatData = await new Response(compressed).bytes();

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', idatData);
  const iendChunk = chunk('IEND', new Uint8Array(0));

  const total = signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of [signature, ihdrChunk, idatChunk, iendChunk]) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

async function generateIcons(): Promise<void> {
  try {
    for (const size of sizes) {
      const pixels = renderIcon(size);
      const png = await encodePng(size, pixels);
      const filename = `src/assets/icon${size}.png`;
      await Bun.write(filename, png);

      const valid = png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
      console.log(`✓ Generated ${filename} (${png.length} bytes, valid=${valid})`);
    }

    console.log('All PNG icons generated successfully.');
  } catch (error) {
    console.error('Failed to generate icons:', error);
    throw error;
  }
}

if (import.meta.main) await generateIcons();
