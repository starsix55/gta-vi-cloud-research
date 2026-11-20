# Tools

Small, read-only utilities used alongside the research. They are intentionally boring: no
credential storage, no interception, no automation of authentication.

## `catalog-scan.mjs`

Lists every title in an offering that carries a device allowlist, and reports whether the
account is entitled.

```bash
GSSV_TOKEN="<gsToken>" \
GSSV_BASE="https://<region>.gssv-play-prod.xboxlive.com" \
node catalog-scan.mjs [--json] [--selftest] [--help]
```

Flags:

- `--json` — machine-readable report (sorted restricted list, `scannedAt`, `truncated`).
  Diff two days with `diff <(… --json) <(… --json)` to track catalogue drift (open
  question Q3) without eyeballing the text output.
- `--selftest` — offline unit checks for the `Retry-After` parsing; no token or network.
- `--help` — usage.

Behaviour:

- On HTTP `429`/`503` it honours `Retry-After` and backs off a few times before giving up,
  per the "respect rate limits" rule in [CONTRIBUTING](../CONTRIBUTING.md). One scan, not a
  flood.
- It paginates to a safety cap (`GSSV_MAX_PAGES`, default 40). If the catalogue is larger it
  prints a truncation warning to stderr and marks `truncated` so partial counts are not
  mistaken for a full scan.

Output:

```
titles scanned: 2865
pages: 15
restricted titles: 2
  GRANDTHEFTAUTOVI  devices=[XBOXONE,SCARLETT]  entitled=false  maxSession=82800
  KILLERINSTINCT2CLASSIC  devices=[XBOXONE,SCARLETT,SAMSUNGTV]  entitled=true  maxSession=82800
```

**What it does not do:** authenticate, refresh tokens, print tokens, write files or start
sessions.

## Why the authentication tooling is not published

The probes that perform sign-in, device-token issuance and session starts are kept in the
private research workspace. Publishing them would:

- encourage credential handling by third parties,
- make request flooding easy,
- provide a turnkey tool that does not advance the open questions.

The request and claim **shapes** needed to reproduce the work are documented in
[authentication-flow](../docs/authentication-flow.md) and
[xsts-and-gssv](../docs/xsts-and-gssv.md).

## Contributing a tool

Good tools here are:

- read-only by default,
- free of stored credentials,
- explicit about rate limits,
- useful without a Microsoft account.

Add a short header comment stating what the tool sends, what it prints, and what it never
prints.
