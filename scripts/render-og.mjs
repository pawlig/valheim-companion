// Renders Open Graph preview cards and PWA icons using headless Chrome.
// Validates file existence, file size (>20 kB for cards), and PNG dimensions via IHDR header.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATH =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const CARD_HTML = path.join(REPO_ROOT, 'apps', 'hub', 'og', 'card.html');
const ICON_HTML = path.join(REPO_ROOT, 'apps', 'hub', 'og', 'icon.html');
const OG_DIR = path.join(REPO_ROOT, 'apps', 'hub', 'og');
const ICONS_DIR = path.join(REPO_ROOT, 'apps', 'hub', 'icons');

export function readPngDimensions(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length < 24) {
    throw new Error(`File ${filePath} is too small to be a PNG (${buf.length} bytes)`);
  }
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`File ${filePath} does not have a valid PNG signature`);
  }
  const chunkType = buf.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    throw new Error(`File ${filePath} first chunk is ${chunkType}, expected IHDR`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, size: buf.length };
}

export function renderOgImages() {
  if (!existsSync(CHROME_PATH)) {
    console.error(`Chrome binary not found at "${CHROME_PATH}".`);
    console.error('Please install Chrome or set the CHROME_PATH environment variable.');
    process.exit(1);
  }

  mkdirSync(OG_DIR, { recursive: true });
  mkdirSync(ICONS_DIR, { recursive: true });

  const ogSections = [
    'hub',
    'bestiary',
    'smithy',
    'damage-calculator',
    'signs',
    'progress',
    'provisions',
    'comfort',
    'expedition',
    'items',
  ];

  const renderedFiles = [];

  // 1. Render 1200x630 OG cards
  for (const section of ogSections) {
    const outPath = path.join(OG_DIR, `${section}.png`);
    const targetUrl = `${pathToFileURL(CARD_HTML).href}?section=${encodeURIComponent(section)}`;
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--window-size=1200,630',
      `--screenshot=${outPath}`,
      targetUrl,
    ];

    try {
      execFileSync(CHROME_PATH, args, { stdio: 'pipe' });
    } catch (err) {
      console.error(`Failed to render OG card for ${section}:`, err);
      process.exit(1);
    }

    if (!existsSync(outPath)) {
      throw new Error(`Expected rendered PNG at ${outPath}, but file was not created.`);
    }

    const { width, height, size } = readPngDimensions(outPath);
    if (width !== 1200 || height !== 630) {
      throw new Error(`Invalid dimensions for ${section}.png: got ${width}x${height}, expected 1200x630`);
    }
    if (size <= 20 * 1024) {
      throw new Error(`File ${section}.png is too small: ${size} bytes (must be > 20 kB)`);
    }

    renderedFiles.push({
      relPath: path.relative(REPO_ROOT, outPath),
      width,
      height,
      size,
    });
  }

  // 2. Render icons
  // Headless Chrome cannot shrink its window below ~500 px, so only the 512 px
  // icon is rendered; smaller sizes are downscaled from it with macOS `sips`.
  const iconTargets = [
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
  ];
  const largestIcon = path.join(ICONS_DIR, 'icon-512.png');

  for (const target of iconTargets) {
    const outPath = path.join(ICONS_DIR, target.name);
    const targetUrl = pathToFileURL(ICON_HTML).href;
    const [command, args] = target.size < 512
      ? ['sips', ['-z', String(target.size), String(target.size), largestIcon, '--out', outPath]]
      : [CHROME_PATH, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--allow-file-access-from-files',
        `--window-size=${target.size},${target.size}`,
        `--screenshot=${outPath}`,
        targetUrl,
      ]];

    try {
      execFileSync(command, args, { stdio: 'pipe' });
    } catch (err) {
      console.error(`Failed to render icon ${target.name}:`, err);
      process.exit(1);
    }

    if (!existsSync(outPath)) {
      throw new Error(`Expected rendered PNG at ${outPath}, but file was not created.`);
    }

    const { width, height, size } = readPngDimensions(outPath);
    if (width !== target.size || height !== target.size) {
      throw new Error(
        `Invalid dimensions for ${target.name}: got ${width}x${height}, expected ${target.size}x${target.size}`,
      );
    }
    if (size === 0) {
      throw new Error(`File ${target.name} is empty.`);
    }

    renderedFiles.push({
      relPath: path.relative(REPO_ROOT, outPath),
      width,
      height,
      size,
    });
  }

  for (const item of renderedFiles) {
    const sizeKb = (item.size / 1024).toFixed(1);
    console.log(`${item.relPath}: ${item.width}x${item.height} (${sizeKb} kB)`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  renderOgImages();
}
