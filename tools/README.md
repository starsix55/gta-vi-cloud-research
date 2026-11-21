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

## Why the authentication tooling is not published

The probes that perform sign-in, device-token issuance and session starts are kept in the
private research workspace. Publishing them would:

- encourage credential handling by third parties,
- make request flooding easy,
- provide a turnkey tool that does not advance the open questions.

The request and claim **shapes** needed to reproduce the work are documented in
[authentication-flow](../docs/authentication-flow.md) and
[xsts-and-gssv](../docs/xsts-and-gssv.md).

## `check-links.mjs`

Verifies that every relative link in the repository's Markdown resolves to a file that
exists. This is the verification script referred to by `PUBLICATION-CHECKLIST.md` and the
"Relative links resolve" item in the PR template.

```bash
node tools/check-links.mjs .     # exit 0 = all resolve, 1 = something is broken
```

Read-only and no network: external `http`/`https`/`mailto` links are not fetched, only
relative paths are resolved against the filesystem. Offline checks: `node tools/check-links.mjs --selftest`.

## Contributing a tool

Good tools here are:

- read-only by default,
- free of stored credentials,
- explicit about rate limits,
- useful without a Microsoft account.

Add a short header comment stating what the tool sends, what it prints, and what it never
prints.
