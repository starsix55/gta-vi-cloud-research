#!/usr/bin/env node
/**
 * Verify that every relative link in the repository's Markdown resolves to a
 * file that exists. This is the "verification script" referred to by the link
 * check in PUBLICATION-CHECKLIST.md and the "Relative links resolve" item in
 * the pull-request template.
 *
 * Read-only. No network: external (http/https/mailto) links are not fetched,
 * only relative paths are resolved against the filesystem.
 *
 * Usage:
 *   node tools/check-links.mjs [root]   # default root: current directory
 *   node tools/check-links.mjs --selftest
 *
 * Exit status: 0 when all relative links resolve, 1 when any is broken.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'Check that relative Markdown links resolve. Usage: node tools/check-links.mjs [root] | --selftest'
  );
  process.exit(0);
}

/**
 * Extract relative link targets from Markdown text. Returns the path portion
 * (anchors and query stripped) of every `[text](target)` whose target is not an
 * external scheme or a pure in-page anchor. Pure function — covered by --selftest.
 */
export function extractRelativeLinks(markdown) {
  const out = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(markdown))) {
    let target = m[1].trim();
    // Drop an optional "title": [x](path "title")
    target = target.replace(/\s+["'].*["']$/, '');
    if (!target || target.startsWith('#')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // http:, https:, mailto:, etc.
    out.push(target.split('#')[0].split('?')[0]);
  }
  return out;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '.git' || e.name === 'node_modules' ? [] : walk(p);
    return p.endsWith('.md') ? [p] : [];
  });
}

function runSelftest() {
  const assert = (cond, msg) => {
    if (!cond) {
      console.error('selftest FAILED:', msg);
      process.exit(1);
    }
  };
  const md = [
    '[rel](docs/x.md)',
    '[anchored](../a.md#heading)',
    '[external](https://example.com)',
    '[mail](mailto:a@b.c)',
    '[inpage](#section)',
    '[titled](y.md "a title")',
    '[query](z.md?v=1)',
  ].join('\n');
  const got = extractRelativeLinks(md);
  assert(got.length === 4, `expected 4 relative links, got ${got.length}: ${got.join(', ')}`);
  assert(got.includes('docs/x.md'), 'plain relative');
  assert(got.includes('../a.md'), 'anchor stripped');
  assert(got.includes('y.md'), 'title stripped');
  assert(got.includes('z.md'), 'query stripped');
  assert(!got.some((t) => t.startsWith('http') || t.startsWith('mailto')), 'external excluded');
  console.log('selftest OK');
  process.exit(0);
}

if (argv.includes('--selftest')) runSelftest();

const root = argv[0] && !argv[0].startsWith('-') ? argv[0] : '.';
let broken = 0;
let checked = 0;

for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  for (const target of extractRelativeLinks(text)) {
    checked += 1;
    if (!existsSync(path.resolve(path.dirname(file), target))) {
      console.log(`BROKEN  ${file}  ->  ${target}`);
      broken += 1;
    }
  }
}

console.log(`relative links checked: ${checked}; broken: ${broken}`);
process.exit(broken ? 1 : 0);
