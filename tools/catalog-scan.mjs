#!/usr/bin/env node
/**
 * Scan an Xbox Cloud Gaming catalogue for titles with device allowlists.
 *
 * Read-only. Prints catalogue metadata only; never prints the bearer token.
 *
 * Usage:
 *   GSSV_TOKEN="<token>" GSSV_BASE="https://<region>.gssv-play-prod.xboxlive.com" \
 *     node catalog-scan.mjs [--json] [--selftest] [--help]
 *
 * Flags:
 *   --json      Emit a machine-readable JSON report on stdout (diffable with
 *               `jq`/`diff` for catalogue-drift tracking; see open question Q3).
 *   --selftest  Run offline unit checks (no token or network) and exit.
 *   --help      Print this usage and exit.
 *
 * Environment:
 *   GSSV_TOKEN     GSSV `gsToken` obtained through normal authentication (required).
 *   GSSV_BASE      Region base URL, e.g. https://<region>.gssv-play-prod.xboxlive.com (required).
 *   GSSV_CLIENT    x-gssv-client value (default: XboxComBrowser).
 *   GSSV_UA        User-Agent (default: a desktop Chrome string).
 *   GSSV_MAX_PAGES Pagination safety cap (default: 40). A hit prints a truncation warning.
 *
 * Requirements:
 *   Node 20+ (global fetch).
 *
 * Notes:
 *   - The token is a GSSV `gsToken` obtained through normal authentication.
 *   - This script performs no authentication and stores nothing.
 *   - Keep page sizes modest; the service paginates at mr<=200.
 *   - On HTTP 429/503 the script honours Retry-After and backs off, per the
 *     "respect rate limits" rule in CONTRIBUTING.md. One scan, not a flood.
 */

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  // Print the leading block comment as usage.
  console.log(
    [
      'Scan an Xbox Cloud Gaming catalogue for titles with device allowlists (read-only).',
      '',
      'Usage:',
      '  GSSV_TOKEN="<token>" GSSV_BASE="https://<region>.gssv-play-prod.xboxlive.com" \\',
      '    node catalog-scan.mjs [--json] [--selftest] [--help]',
      '',
      'Flags:',
      '  --json      Machine-readable JSON report (diffable for catalogue-drift tracking).',
      '  --selftest  Run offline unit checks and exit.',
      '  --help      Print this usage and exit.',
      '',
      'Env: GSSV_TOKEN, GSSV_BASE (required); GSSV_CLIENT, GSSV_UA, GSSV_MAX_PAGES (optional).',
      'Never prints the bearer token.',
    ].join('\n')
  );
  process.exit(0);
}

/**
 * Parse an HTTP Retry-After header into milliseconds to wait.
 * Accepts delta-seconds ("5") or an HTTP-date; returns `fallback` when absent
 * or unparseable, and clamps to a sane ceiling so a hostile header cannot hang
 * the scan. Pure function — covered by --selftest.
 */
export function parseRetryAfter(value, now = Date.now(), fallback = 1000) {
  const MAX = 60_000;
  if (value == null) return fallback;
  const s = String(value).trim();
  if (/^\d+$/.test(s)) return Math.min(Number(s) * 1000, MAX);
  const when = Date.parse(s);
  if (Number.isNaN(when)) return fallback;
  return Math.min(Math.max(when - now, 0), MAX);
}

function runSelftest() {
  const assert = (cond, msg) => {
    if (!cond) {
      console.error('selftest FAILED:', msg);
      process.exit(1);
    }
  };
  const now = 1_000_000;
  assert(parseRetryAfter(null, now, 1234) === 1234, 'absent -> fallback');
  assert(parseRetryAfter('5', now) === 5000, 'delta-seconds -> ms');
  assert(parseRetryAfter('99999', now) === 60_000, 'delta clamped to ceiling');
  assert(parseRetryAfter('garbage', now, 777) === 777, 'unparseable -> fallback');
  assert(
    parseRetryAfter(new Date(now + 3000).toUTCString(), now) === 3000,
    'http-date -> delta ms'
  );
  assert(
    parseRetryAfter(new Date(now - 3000).toUTCString(), now) === 0,
    'past http-date -> 0'
  );
  console.log('selftest OK');
  process.exit(0);
}

if (args.has('--selftest')) runSelftest();

const AS_JSON = args.has('--json');

const TOKEN = process.env.GSSV_TOKEN;
const BASE = process.env.GSSV_BASE;
const CLIENT = process.env.GSSV_CLIENT ?? 'XboxComBrowser';
const UA =
  process.env.GSSV_UA ??
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const MAX_PAGES = Number(process.env.GSSV_MAX_PAGES ?? 40);

if (!TOKEN || !BASE) {
  console.error('Set GSSV_TOKEN and GSSV_BASE. See the header of this file, or --help.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(continuation) {
  const url = new URL('/v2/titles', BASE);
  url.searchParams.set('mr', '200');
  if (continuation) url.searchParams.set('ct', continuation);

  // Honour Retry-After on 429/503; a few attempts, then give up. Not a flood.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'x-gssv-client': CLIENT,
        'User-Agent': UA,
        Accept: 'application/json',
      },
    });

    if (res.ok) return res.json();

    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      const wait = parseRetryAfter(res.headers.get('retry-after'), Date.now(), 1000 * attempt);
      console.error(`rate-limited (HTTP ${res.status}); waiting ${wait} ms (attempt ${attempt}/${MAX_ATTEMPTS - 1})`);
      await sleep(wait);
      continue;
    }

    throw new Error(`catalogue request failed: HTTP ${res.status}`);
  }
}

const restricted = [];
let total = 0;
let continuation = '';
let pages = 0;

do {
  const data = await page(continuation);
  for (const title of data.results ?? []) {
    total += 1;
    const details = title.details ?? {};
    const devices = details.allowedDeviceTypes ?? [];
    if (devices.length > 0) {
      restricted.push({
        titleId: title.titleId,
        productId: details.productId,
        devices,
        entitled: details.hasEntitlement === true,
        maxSessionSeconds: details.maxSessionLengthInSeconds ?? null,
      });
    }
  }
  continuation = data.continuationToken ?? '';
  pages += 1;
  if (continuation) await sleep(350);
} while (continuation && pages < MAX_PAGES);

const truncated = Boolean(continuation) && pages >= MAX_PAGES;
if (truncated) {
  console.error(
    `WARNING: stopped at the ${MAX_PAGES}-page cap with more titles remaining; ` +
      `counts are partial. Raise GSSV_MAX_PAGES to scan the full catalogue.`
  );
}

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        base: BASE,
        client: CLIENT,
        titlesScanned: total,
        pages,
        truncated,
        restrictedCount: restricted.length,
        restricted: restricted.sort((a, b) => String(a.titleId).localeCompare(String(b.titleId))),
      },
      null,
      2
    )
  );
} else {
  console.log(`titles scanned: ${total}`);
  console.log(`pages: ${pages}`);
  if (truncated) console.log('truncated: yes (see warning above)');
  console.log(`restricted titles: ${restricted.length}`);
  for (const row of restricted) {
    console.log(
      `  ${row.titleId}  devices=[${row.devices.join(',')}]  entitled=${row.entitled}  maxSession=${row.maxSessionSeconds}`
    );
  }
}
