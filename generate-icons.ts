// generate-icons.ts
import { mkdirSync, writeFileSync } from 'fs';

// Simple SVG to PNG conversion using Canvas (for Node.js/Bun)
function generateIcon(size: number): string {
  // Create a simple SVG icon
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text x="${size / 2}" y="${size / 2 + size * 0.1}"
            text-anchor="middle"
            fill="white"
            font-family="Arial, sans-serif"
            font-size="${size * 0.6}"
            font-weight="bold">R</text>
    </svg>
  `;
  return svg;
}

function generateIcons(): void {
  try {
    // Ensure assets directory exists
    mkdirSync('src/assets', { recursive: true });

    const sizes = [16, 32, 48, 128];

    sizes.forEach(size => {
      const svg = generateIcon(size);
      const filename = `src/assets/icon${size}.svg`;
      writeFileSync(filename, svg);
      console.log(`✓ Generated ${filename}`);
    });

    console.log(`Note: SVG icons have been generated. For better browser extension compatibility,
you may want to convert these to PNG files using an online converter or image editor.

For now, let's update the manifest to use SVG icons instead.
    `);
  } catch (error) {
    console.error('Failed to generate icons:', error);
    process.exit(1);
  }
}

// Execute the generation
generateIcons();
