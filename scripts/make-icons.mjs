// Erzeugt App-Icon, Adaptive-Icon, Splash und Favicon aus dem reduzierten Markenzeichen (STYLE_GUIDE §5).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const out = 'apps/mobile/assets/images';
mkdirSync(out, { recursive: true });

const mark = (bg) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
  ${bg ? '<rect width="100" height="100" fill="#101518"/>' : ''}
  <circle cx="50" cy="42" r="26" fill="#F1E8D8"/>
  <path d="M18 80 L18 62 L50 44 L82 62 L82 80 Z" fill="#050709"/>
  <rect x="46.5" y="64" width="7" height="16" fill="#B84532"/>
</svg>`;

// Adaptive-Vordergrund: Motiv in der sicheren Zone (66 %).
const adaptive = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
  <g transform="translate(17 17) scale(0.66)">
    <circle cx="50" cy="42" r="26" fill="#F1E8D8"/>
    <path d="M18 80 L18 62 L50 44 L82 62 L82 80 Z" fill="#050709" stroke="#101518" stroke-width="1"/>
    <rect x="46.5" y="64" width="7" height="16" fill="#B84532"/>
  </g>
</svg>`;

await sharp(Buffer.from(mark(true))).png().toFile(`${out}/icon.png`);
await sharp(Buffer.from(adaptive)).png().toFile(`${out}/adaptive-foreground.png`);
await sharp(Buffer.from(mark(false))).resize(512, 512).png().toFile(`${out}/splash-icon.png`);
await sharp(Buffer.from(mark(true))).resize(64, 64).png().toFile(`${out}/favicon.png`);
console.log('Icons geschrieben');
