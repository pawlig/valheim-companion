// Static preview server serving dist/ with nginx-like routing and CSP.
// Usage: node scripts/preview.mjs [port] (default 8080)

import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const SEC_HEADERS_PATH = path.join(REPO_ROOT, 'deploy', 'security-headers.conf');

let CSP_HEADER = '';
try {
  const secHeadersContent = readFileSync(SEC_HEADERS_PATH, 'utf8');
  const cspMatch = secHeadersContent.match(/Content-Security-Policy\s+"([^"]+)"/);
  CSP_HEADER = cspMatch ? cspMatch[1] : '';
} catch (err) {
  console.warn('Warning: could not read security headers:', err.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const port = Number(process.argv[2]) || 8080;

const server = createServer((req, res) => {
  if (CSP_HEADER) {
    res.setHeader('Content-Security-Policy', CSP_HEADER);
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  // Preserve the suffix and query string of legacy Smithy links.
  if (url.pathname === '/armourer' || url.pathname.startsWith('/armourer/')) {
    const suffix = url.pathname === '/armourer' ? '' : url.pathname.slice('/armourer/'.length);
    res.writeHead(301, { Location: `/smithy/${suffix}${url.search}` });
    res.end();
    return;
  }
  if (pathname === '/smithy') {
    res.writeHead(301, { Location: `/smithy/${url.search}` });
    res.end();
    return;
  }

  // Normalize redirects without trailing slashes for sections
  if (pathname === '/bestiary') {
    res.writeHead(301, { Location: '/bestiary/' });
    res.end();
    return;
  }
  if (pathname === '/signs') {
    res.writeHead(301, { Location: '/signs/' });
    res.end();
    return;
  }
  if (pathname === '/damage-calculator') {
    res.writeHead(301, { Location: '/damage-calculator/' });
    res.end();
    return;
  }
  if (pathname === '/privacy') {
    res.writeHead(301, { Location: '/privacy/' });
    res.end();
    return;
  }
  if (pathname === '/items') {
    res.writeHead(301, { Location: `/items/${url.search}` });
    res.end();
    return;
  }
  if (pathname === '/traders') {
    res.writeHead(301, { Location: `/traders/${url.search}` });
    res.end();
    return;
  }

  let filePath = path.join(DIST_DIR, pathname);

  // Security check: stay within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Directory handling: look for index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback for /signs/*
  if (pathname.startsWith('/signs/')) {
    const signsIndex = path.join(DIST_DIR, 'signs', 'index.html');
    if (existsSync(signsIndex)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      createReadStream(signsIndex).pipe(res);
      return;
    }
  }

  // SPA fallback for /damage-calculator/*
  if (pathname.startsWith('/damage-calculator/')) {
    const damageIndex = path.join(DIST_DIR, 'damage-calculator', 'index.html');
    if (existsSync(damageIndex)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      createReadStream(damageIndex).pipe(res);
      return;
    }
  }

  // Otherwise 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});
