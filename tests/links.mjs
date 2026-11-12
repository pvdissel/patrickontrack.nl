// Checks a built site (public/ by default) without a browser:
//  - every internal link, image, script, stylesheet, srcset entry and GPX download points to a file that exists
//  - redirect pages (aliases) point to pages that exist
//  - i18n/en.yaml and i18n/nl.yaml have the same keys
// Usage: node tests/links.mjs <dir> [baseURL]
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

const root = resolve(process.argv[2] || 'public');
const base = (process.argv[3] || '').replace(/\/$/, '');
const problems = [];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else if (e.name.endsWith('.html')) yield p;
  }
}
async function exists(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const p = join(root, clean);
  try {
    const s = await stat(p);
    if (s.isDirectory()) { await stat(join(p, 'index.html')); }
    return true;
  } catch { return false; }
}
function internal(url) {
  if (!url) return null;
  if (base && url.startsWith(base + '/')) url = url.slice(base.length);
  if (url.startsWith('//') || /^[a-z]+:/i.test(url)) return null;   // external, mailto:, data:
  if (url.startsWith('#')) return null;
  return url.startsWith('/') ? url : null;                            // the site only uses root-relative links
}

let pages = 0, checked = 0;
for await (const page of walk(root)) {
  pages++;
  const html = await readFile(page, 'utf8');
  const where = '/' + relative(root, page);
  const urls = new Set();
  // attributes may be quoted or (in minified HTML) unquoted
  const attr = (name) => new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'g');
  for (const n of ['href', 'src']) for (const m of html.matchAll(attr(n))) urls.add(m[1] ?? m[2] ?? m[3]);
  for (const m of html.matchAll(attr('srcset'))) (m[1] ?? m[2] ?? m[3]).split(',').forEach((c) => urls.add(c.trim().split(/\s+/)[0]));
  for (const m of html.matchAll(/http-equiv="?refresh"? content="0; ?url=([^"]+)"/gi)) urls.add(m[1]);
  for (const u of urls) {
    const path = internal(u.replace(/&amp;/g, '&'));
    if (!path) continue;
    checked++;
    if (!(await exists(path))) problems.push(`${where}: broken link ${u}`);
  }
}

// i18n key parity
const keys = async (f) => new Set((await readFile(f, 'utf8')).split('\n')
  .map((l) => l.match(/^([A-Za-z0-9_-]+):/)).filter(Boolean).map((m) => m[1]));
try {
  const [en, nl] = await Promise.all([keys('i18n/en.yaml'), keys('i18n/nl.yaml')]);
  for (const k of en) if (!nl.has(k)) problems.push(`i18n/nl.yaml: missing key "${k}" (it is in en.yaml)`);
  for (const k of nl) if (!en.has(k)) problems.push(`i18n/en.yaml: missing key "${k}" (it is in nl.yaml)`);
} catch (e) { problems.push(`i18n: ${e.message}`); }

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n✗ ${problems.length} problem(s) in ${pages} pages`);
  process.exit(1);
}
console.log(`✓ ${checked} links in ${pages} pages, i18n keys match`);
