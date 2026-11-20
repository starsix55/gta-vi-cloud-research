# Changelog

All notable changes to this repository. Dates are local to the investigation.

## Unreleased

### Added
- Root `ROADMAP.md` and a restructured `docs/roadmap.md`: unknowns, dependency map and what
  each artifact would unlock.
- `docs/what-we-need.md` — ranked evidence wishlist, including console access options.
- `docs/game-executables.md` — why assets or a leaked executable do not affect cloud access.
- Repository structure, documentation set and branding assets.
- MIT licence (copyright 2026 sixstar).
- Sanitized findings log and experiment index.
- Read-only catalogue scanner (`tools/catalog-scan.mjs`).

### Changed
- Project renamed to **GTA VI Cloud Research**; repository will move to `gta-vi-cloud-research`.
- "PC never performs device authentication" corrected: `gamingservices.exe` performs RPS
  device authentication over WinHTTP.
- "Missing Play button means no subscription" corrected: the Xbox app was signed in as a
  different account than the API probe.

## 2026-11-20

### Findings
- Console-only titles absent from the `xgpuweb` catalogue (2,863 titles, zero allowlists);
  still present in `xgpuconsole` (2,865 titles, two allowlists).
- A `Win32` device token does not change the `xgpuconsole` catalogue, so catalogue gating is
  per offering rather than per device claim.
- A signed `XboxOne` request with filler attestation fields still returns `400` empty.

## 2026-11-19

### Findings
- `gamingservices.exe` issues `POST /device/authenticate` over WinHTTP with an RPS request
  and no `DeviceType`; the response is a JWE.
- Static analysis: console request builder, producer chain, empty API-set host, and the
  correction that `XblaProcessSpToken` consumes the response token.
- Xbox app launched via the correct AUMID; UI Automation exposes navigation and product
  pages.

### Fixed
- WPF rendering in the VM (`DisableHWAcceleration=1`).
- Interactive task launch replaced with a session-2 process launcher.

## 2026-11-18

### Findings
- KI 2 Classic is the only restricted title in a 2,400-title scan.
- Entitlement identical across KI titles; the allowlist is the only difference.
- Session start: `202` for KI 2013, `400 DeviceTypeNotAllowed` for KI 2 Classic.
- `device.auth` issues `Win32`/`Android`/`iOS`; console classes are refused.
- Device class propagates into the GSSV session token.

### Added
- Initial probe and catalogue tooling.
