# Changelog

All notable changes to this repository. Dates are local to the investigation.

## Unreleased

### Added
- Static interface recovery of `XblAuthManager.dll`: all 43 methods bind to their
  implementations, and the pre-authorized-request signer (`0x276a0`) has no export, no proxy
  method and no static reference — it is callable only in-proc.
- `XblaSignDigest` (exported by `XblAuthConsoleExt.dll`) signs a 32-byte digest but is not the
  signer XSTS trusts (`403`).
- Withdrew the "harvest a `gssv` XSTS from an installed title" route: retail titles and the
  retail shell cannot be launched in Dev Mode. A PC-minted user+device token is `200` in
  `RETAIL` and `401 0x8015DC12` in `XDKS.1`.

### Added
- Q11 on console-identity concurrency: the 14-day device token is not single-use, XSTS is
  per-request and body-bound, and multi-account reuse is untested and ban-prone.

### Added
- Clarified the device claims: `dty` is environment-shaped (a Series can present `XboxOne` for
  BC titles) while `ddm` / `sbx` are the likely inputs behind `0x8015DC19`, both boot-set and not
  client-selectable.
- Closed the same-console native-vs-Edge A/B: the web offering does not list GTA VI, so it fails
  at catalogue build time, not at a device check.

### Added
- Cross-generation check: an original Xbox One returns `200` for `DeviceType: XboxOne` with its
  own 1,208-char attestation (XCOS 3,196 chars). The type match is per model, not "Scarlett only".
- Console XSTS POSTs carry a 76-byte body-bound signature (policy version, FILETIME, raw
  P-256 `r||s`); a fresh replay returns `200`, a stale one `403`.
- `dnet` endpoints and the `XDKS.1` sandbox from a retail account are closed:
  `0x8015DC23` / `0x8015DC12`.

### Fixed
- Split the console gate into two walls. **XCOS is not a credential**: XSTS refuses it in every
  combination (`400`). The console converts it to a **JWE** locally via
  `XblaProcessXcosDeviceToken`, which returns `0x87DD0001` to apps. Only the JWE is evaluated, and
  from Dev Mode it gets `0x8015DC19`.
- **`device.auth` has two branches.** The console branch is five fields
  (`Attestation`, `BootLog`, `Certificate`, `DeviceType`, `EffectiveRegion`), `TokenType: SP_JWT`,
  no `Signature` header, and returns `200` with an **XCOS** token. Adding any desktop field turns
  the same request into `400`. This supersedes the "console classes are refused" claim.
- The session `500` was a missing `X-MS-Device-Info` header on our side, not a title fault or an
  endpoint change. With the header, KI 2 returns `400 DeviceTypeNotAllowed` and KI 2013 returns
  `202`. The earlier "endpoint drift" entries are withdrawn.
- Dev Mode **can** mint a console-class token; what it cannot do is get one accepted at RETAIL
  (`0x8015DC19`). Corrected the earlier claim that minting was impossible.
- The shared `403` script is shape-dependent, not class-dependent: it returns `403` for `Scarlett`
  and `XboxOne` alike, and double-encodes base64 blob files.
- Qualified the console type-string control: `Banana` returns the same empty `400` as `XboxOne`,
  so the 425/426-byte pair rules out a schema problem but cannot separate class from invalid type.
- `SP_JWT` structural variants (our-key JWS, random signature, `alg:none`) all return `400`.

### Changed
- README, experiments and failed-approaches updated for the two-branch model; stale
  "console classes rejected" and "extra fields do nothing" claims marked superseded.
- Capture Protocol A corrected: Dev Mode with a trusted CA does capture system-level
  `device.auth`; the replay half still needs a retail boot.
- Root `ROADMAP.md` is now a short hub; the unknown map and evidence table live only in
  `docs/roadmap.md`. Publication checklist moved under `docs/` and indexed.
- Samsung TV KI 2 attempt reported unsuccessful; TV branch downgraded to "details pending".
- Closed session-reuse ideas (I/J) with a console owner's report.
- Noted parallel research reporting `WindowsOneCore` for the PC app.
- Console capture requires a devkit or retail boot for a usable token, not retail Dev Mode alone.

### Added
- Primary source reviewed: the RetroGaming PS3 stream of 2026-11-19. Real cloud gameplay
  (~2.5 h, 29–31 fps, wired), stock DeepPlay/GR33N apps, purchased game, **no device spoofing**
  described. He now says it is blocked. The "device identifiers from his own consoles" claim is
  not in the stream and remains second-hand.
- Timestamp review of that stream: XMB reports "Quit Game (DeepPlay)", overlay is decoder
  telemetry, and the recording starts mid-session so auth calls are absent.
- Checked the Switch claim: `green-nx` logs into `xgpuweb`, which does not list GTA VI (2,864
  titles, absent), and sends no device token. The article is contradicted by the catalogue.
- Console-side full-TLS capture: `device.auth` console branch measured, including the five-field
  shape, per-boot 744/320/1,024-byte material, type/attestation matching, and the XCOS token.
- New wall recorded: the Dev Mode token is rejected by `xsts/authorize` for RETAIL with
  `0x8015DC19`. Added Q10 covering sandbox binding, device record and freshness.
- Dev Mode retail-app launch measured twice: `0x80040904` for the xCloud app. Closed the
  "capture the play call in Dev Mode" idea.
- PS3 client session row in the server-hole matrix; launch-window question rewritten around the
  login/session requests rather than our own instrument error.
- Community DNS observation: launch touches delivery/store hosts, auth not visible (cached),
  which moves the capture window to sign-in/boot.
- `research/capture-protocols.md`: turnkey capture and replay protocols A–F for the open matrix
  items, with token-portability evidence from public tooling.
- Examined NAND, devkit VHD, `xsec` source and GDK: none contains a readable console certificate
  or the Live device-auth implementation. DevAuth v2 is accessory auth.
- Extracted the real console DLLs from the HDD dump. `XblAuthConsoleExt.dll` is a
  DeviceIoControl/bcrypt wrapper with no embedded keys; console `XblAuthManager.dll` loads the
  console API set.
- Console client static analysis: the app delegates auth to the OS `AuthManager` service, so
  app-level capture cannot see device auth; devkit proxy/cert path identified.
- IP-to-hostname mapping of a header-only console capture: XSTS, title.mgt, userpresence and
  GSSV region hosts confirmed during a KI 2 launch; device-auth range present but unconfirmed.
- Review corrections: softened the hardware-attestation claim, narrowed the catalogue-gating
  conclusion, clarified the session-result chronology, relabelled session reuse as a limited
  observation, fixed the certificate-swap protocol, and marked the README diagram's allowlist
  comparison as inferred. Added review-proposed tests O–V and protocols G/H.
- Community-tested negative routes (old Android builds, legacy paths, non-prod hosts, TV flow
  with Xbox headers) and a console-ban risk note for token-reuse experiments.
- Community-reported items: console KI 2 launch, `SAMSUNGTV` classification on PS4, 2026 Xbox One
  boot ROM glitch and what it would (and would not) enable.
- Root `ROADMAP.md`, `docs/roadmap.md`, `docs/what-we-need.md`, `docs/game-executables.md`,
  a sanitized findings log and a read-only catalogue scanner (`tools/catalog-scan.mjs`).
- Repository structure, documentation set and branding assets. MIT licence (copyright 2026
  sixstar).

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
