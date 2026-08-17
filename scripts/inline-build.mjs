/**
 * Folds the standalone build into one self-contained HTML file.
 *
 * Reads dist-single/index.html, inlines the emitted JS and CSS, and writes
 * dist-single/smart-bookmark.html — a file with no external requests at all,
 * so it works opened straight from disk with no server, no npm and no network.
 *
 * Uses only node:fs — no dependencies of its own.
 *
 *   node scripts/inline-build.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('dist-single');
const SOURCE = path.join(OUT_DIR, 'index.html');
const TARGET = path.join(OUT_DIR, 'smart-bookmark.html');

if (!fs.existsSync(SOURCE)) {
  console.error(`inline-build: ${SOURCE} not found — run the standalone vite build first.`);
  process.exit(1);
}

let html = fs.readFileSync(SOURCE, 'utf8');
const read = (href) => {
  const file = path.join(OUT_DIR, href.replace(/^\.?\//, ''));
  if (!fs.existsSync(file)) throw new Error(`referenced asset missing: ${file}`);
  return fs.readFileSync(file, 'utf8');
};

let scripts = 0;
let styles = 0;

// <script type="module" src="./app.js"></script>  ->  inline classic script.
// The type must go: module scripts are refused over file:// origins.
html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/g, (_match, src) => {
  scripts++;
  return `<script>\n${read(src)}\n</script>`;
});

// <link rel="stylesheet" href="./app.css">  ->  inline <style>.
// Matched attribute-order-independently, since the emitted order is not
// guaranteed and getting it wrong would silently leave the CSS external.
html = html.replace(/<link\b[^>]*>/g, (tag) => {
  if (!/\brel=["']stylesheet["']/.test(tag)) return tag;
  const href = tag.match(/\bhref=["']([^"']+)["']/)?.[1];
  if (!href || /^(data:|https?:|\/\/)/.test(href)) return tag;
  styles++;
  return `<style>\n${read(href)}\n</style>`;
});

// Any modulepreload hints are dead weight once everything is inline.
html = html.replace(/<link\b[^>]*\brel=["']modulepreload["'][^>]*>/g, '');

if (scripts === 0) {
  console.error('inline-build: no <script src> found in index.html — nothing was inlined.');
  process.exit(1);
}

fs.writeFileSync(TARGET, html);

const bytes = fs.statSync(TARGET).size;

// Scan only the markup for leftover external references. The inlined bundle
// contains plenty of `src="..."` substrings of its own, and counting those
// would fail the build for no reason.
const markupOnly = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
const remaining = markupOnly.match(/(?:src|href)=["'](?!data:|https?:|#)[^"']+["']/g) || [];

console.log(`inline-build: inlined ${scripts} script(s) and ${styles} stylesheet(s)`);
console.log(
  `inline-build: wrote ${path.relative(process.cwd(), TARGET)} (${(bytes / 1024 / 1024).toFixed(2)} MB)`
);

if (remaining.length) {
  console.error(`inline-build: FAILED — ${remaining.length} external reference(s) remain:`);
  remaining.forEach((r) => console.error(`  ${r}`));
  process.exit(1);
}
console.log('inline-build: no external references remain — the file is fully self-contained.');
