# Publication checklist

Manual steps before this folder becomes a public repository. Do not skip the scans.

## Identity and links

- [x] Discord invite set to `https://discord.gg/E65kyCNgSS` in `config/site.json`, `README.md`,
      `community/discord.md`, `CONTRIBUTING.md` and `SECURITY.md`.
- [x] `repositoryUrl` set to `https://github.com/starsix55/gta-vi-cloud-research`.
- [x] Licence: **MIT** (`LICENSE`, copyright 2026 sixstar).
- [x] Maintainer set to **sixstar** in `README.md`, `CONTRIBUTING.md`, `SECURITY.md` and
      `config/site.json`.

## Privacy scan

- [ ] `grep -riE "eyJ|Bearer |refresh_token|access_token|token=|cookie" .` → no credential
      strings.
- [ ] `grep -riE "[0-9]{16}" .` → check any 16-digit numbers; XUIDs must not appear.
- [ ] `grep -ri "discord.gg" .` → confirm the invite is intentional.
- [ ] `find . -type f \( -name "*.har" -o -name "*.saz" -o -name "*.xmatcap" -o -name "*.pfx"
      -o -name "*.pem" -o -name "*.key" \)` → empty.
- [ ] No screenshots of accounts, emails, gamertags or tokens.
- [ ] No absolute paths containing a personal username.

## Accuracy scan

- [ ] Every quantitative claim matches a document under `docs/` or `research/`.
- [ ] No GTA VI gameplay is implied.
- [ ] Progress figures are labelled subjective.
- [ ] Community-reported items are labelled as such.
- [ ] Corrections to earlier claims are still present (do not delete them silently).

## Link check

- [ ] All relative links resolve: `node tools/check-links.mjs .` reports `broken: 0`.
- [ ] External links open and are not dead.
- [ ] Badges render; no fake stars, downloads or release numbers.

## Assets

- [ ] `assets/logo.svg` and `assets/banner.svg` parse as XML.
- [ ] Banner text is readable at 1280 px wide.
- [ ] No Microsoft/Xbox trademark is reproduced as a logo.

## Final

- [ ] `git init` is **not** run by the research tooling; the maintainer decides.
- [x] Remote configured by the maintainer (`origin` → published repository).
- [ ] The private folder (`../gta-vi-cloud-research-private/`) is outside this directory.
- [ ] The maintainer has read `SECURITY.md` and agrees with the disclosure process.
