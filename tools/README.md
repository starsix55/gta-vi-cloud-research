# Tools

Small, read-only utilities used alongside the research. They are intentionally boring: no
credential storage, no interception, no automation of authentication.

## `catalog-scan.mjs`

Lists every title in an offering that carries a device allowlist, and reports whether the
account is entitled.

```bash
GSSV_TOKEN="<gsToken>" \
GSSV_BASE="https://<region>.gssv-play-prod.xboxlive.com" \
node catalog-scan.mjs
```

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

## `catalog-diff.mjs`

Compares two `catalog-scan.mjs --json` snapshots and reports only the meaningful drift in the
restricted set — titles that appeared or disappeared, and allowlist/entitlement/session
changes. This answers open question **Q3** (is the `xgpuweb` exclusion permanent, a
launch-window rollout, or account-specific?) without eyeballing raw `diff`, whose output is
dominated by the always-changing `scannedAt` timestamp.

```bash
node catalog-scan.mjs --json > day1.json
node catalog-scan.mjs --json > day2.json
node catalog-diff.mjs day1.json day2.json
```

Exit status is `0` when the restricted set is unchanged and `1` when it drifted, so it works
as a change detector in a scheduled job. Read-only, local JSON only, no token and no network.
Offline checks: `node catalog-diff.mjs --selftest`.

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
