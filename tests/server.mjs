// Tiny static file server that behaves like GitHub Pages:
// directories serve index.html, and every missing path gets /404.html with status 404.
// Usage: node tests/server.mjs <dir> [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'public');
const port = Number(process.argv[3] || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.gpx': 'application/gpx+xml', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
};

async function file(path) {
  try {
    const s = await stat(path);
    if (s.isDirectory()) return file(join(path, 'index.html'));
    return path;
  } catch { return null; }
}

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const path = normalize(join(root, url));
  let found = path.startsWith(root) ? await file(path) : null;
  let status = 200;
  if (!found) { found = join(root, '404.html'); status = 404; }
  try {
    const body = await readFile(found);
    res.writeHead(status, { 'Content-Type': types[extname(found)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
