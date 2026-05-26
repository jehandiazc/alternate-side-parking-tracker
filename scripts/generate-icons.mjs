/**
 * Generates placeholder PWA icons.
 * Run once: node scripts/generate-icons.mjs
 * Replace public/icons/ with real artwork before launch.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "../public/icons");

mkdirSync(ICONS_DIR, { recursive: true });

// Simple SVG icon — deep indigo background, white car emoji-style shape
function makeSvg(size) {
  const r = size * 0.15; // corner radius
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#2D3561"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-size="${size * 0.52}" font-family="system-ui">🚗</text>
</svg>`;
}

for (const size of [192, 512]) {
  writeFileSync(join(ICONS_DIR, `icon-${size}.svg`), makeSvg(size));
  console.log(`✓ Created public/icons/icon-${size}.svg`);
}

console.log("\nℹ️  SVG placeholders created. Convert to PNG before deploying:");
console.log("   npx sharp-cli --input public/icons/icon-192.svg --output public/icons/icon-192.png");
console.log("   npx sharp-cli --input public/icons/icon-512.svg --output public/icons/icon-512.png");
