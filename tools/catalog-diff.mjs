#!/usr/bin/env node
/**
 * Diff two `catalog-scan.mjs --json` snapshots and report catalogue drift.
 *
 * Open question Q3 asks whether the web offering's exclusion of restricted
 * titles is permanent, a launch-window rollout, or account-specific — "just
 * time" to answer, by re-scanning over several days. Raw `diff` on the JSON is
 * noisy (the `scannedAt` timestamp always differs); this reports only the
 * meaningful changes to the restricted set.
 *
 * Read-only. Operates on local JSON files; no token, no network.
 *
 * Usage:
 *   node catalog-scan.mjs --json > day1.json
 *   node catalog-scan.mjs --json > day2.json
 *   node catalog-diff.mjs day1.json day2.json [--selftest] [--help]
 *
 * Exit status: 0 when the restricted set is unchanged, 1 when it drifted,
 * so it is usable as a change detector in a scheduled job.
 */

import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    [
      'Diff two `catalog-scan.mjs --json` snapshots and report catalogue drift.',
      '',
      'Usage:',
      '  node catalog-diff.mjs <old.json> <new.json>',
      '  node catalog-diff.mjs --selftest',
      '',
      'Exit 0 = restricted set unchanged, 1 = drifted. Read-only, no network.',
    ].join('\n')
  );
  process.exit(0);
}

/**
 * Compare two scan reports. Returns a structured drift description keyed by
 * titleId. Pure function — covered by --selftest.
 */
export function diffScans(oldScan, newScan) {
  const index = (scan) =>
    new Map((scan.restricted ?? []).map((r) => [r.titleId, r]));
  const a = index(oldScan);
  const b = index(newScan);

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, row] of b) if (!a.has(id)) added.push(row);
  for (const [id, row] of a) if (!b.has(id)) removed.push(row);
  for (const [id, before] of a) {
    const after = b.get(id);
    if (!after) continue;
    const fields = [];
    const beforeDevices = (before.devices ?? []).join(',');
    const afterDevices = (after.devices ?? []).join(',');
    if (beforeDevices !== afterDevices)
      fields.push(`devices [${beforeDevices}] -> [${afterDevices}]`);
    if (before.entitled !== after.entitled)
      fields.push(`entitled ${before.entitled} -> ${after.entitled}`);
    if (before.maxSessionSeconds !== after.maxSessionSeconds)
      fields.push(`maxSession ${before.maxSessionSeconds} -> ${after.maxSessionSeconds}`);
    if (fields.length) changed.push({ titleId: id, fields });
  }

  const sortById = (x, y) => String(x.titleId).localeCompare(String(y.titleId));
  added.sort(sortById);
  removed.sort(sortById);
  changed.sort(sortById);
  return { added, removed, changed, drifted: Boolean(added.length || removed.length || changed.length) };
}

function runSelftest() {
  const assert = (cond, msg) => {
    if (!cond) {
      console.error('selftest FAILED:', msg);
      process.exit(1);
    }
  };
  const day1 = {
    restricted: [
      { titleId: 'GRANDTHEFTAUTOVI', devices: ['XBOXONE', 'SCARLETT'], entitled: false, maxSessionSeconds: 82800 },
      { titleId: 'KILLERINSTINCT2CLASSIC', devices: ['XBOXONE', 'SCARLETT', 'SAMSUNGTV'], entitled: true, maxSessionSeconds: 82800 },
    ],
  };
  const same = diffScans(day1, day1);
  assert(!same.drifted, 'identical snapshots do not drift');

  const day2 = {
    restricted: [
      { titleId: 'GRANDTHEFTAUTOVI', devices: ['XBOXONE', 'SCARLETT', 'ANDROID'], entitled: false, maxSessionSeconds: 82800 },
      { titleId: 'SOMENEWTITLE', devices: ['XBOXONE'], entitled: false, maxSessionSeconds: 3600 },
    ],
  };
  const d = diffScans(day1, day2);
  assert(d.drifted, 'drift detected');
  assert(d.added.length === 1 && d.added[0].titleId === 'SOMENEWTITLE', 'added title');
  assert(d.removed.length === 1 && d.removed[0].titleId === 'KILLERINSTINCT2CLASSIC', 'removed title');
  assert(d.changed.length === 1 && d.changed[0].titleId === 'GRANDTHEFTAUTOVI', 'changed title');
  assert(d.changed[0].fields[0].includes('ANDROID'), 'allowlist change captured');
  console.log('selftest OK');
  process.exit(0);
}

if (argv.includes('--selftest')) runSelftest();

if (argv.length < 2) {
  console.error('Usage: node catalog-diff.mjs <old.json> <new.json>  (see --help)');
  process.exit(2);
}

const [oldPath, newPath] = argv;
const load = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`cannot read JSON from ${p}: ${e.message}`);
    process.exit(2);
  }
};

const result = diffScans(load(oldPath), load(newPath));

if (!result.drifted) {
  console.log('restricted set unchanged.');
  process.exit(0);
}

for (const r of result.added) console.log(`+ appeared   ${r.titleId}  devices=[${(r.devices ?? []).join(',')}]`);
for (const r of result.removed) console.log(`- disappeared ${r.titleId}  devices=[${(r.devices ?? []).join(',')}]`);
for (const c of result.changed) console.log(`~ changed    ${c.titleId}  ${c.fields.join('; ')}`);
process.exit(1);
