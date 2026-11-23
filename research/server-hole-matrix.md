# Server-hole matrix

Every idea for slipping past the device check without console keys, what was tested, and what
is left. No tokens or account identifiers appear here.

## Tested and closed

| # | Idea | Result |
|---|---|---|
| 1 | Client headers / user agent / device info | ~250 variants, all refused |
| 2 | Console `DeviceType` strings (20+) | `400` empty |
| 3 | `x-xbl-contract-version: 1` instead of `2` | `400` empty (2026-11-20) |
| 4 | Adding `SerialNumber` to the console request | `400` empty |
| 5 | `Attestation` / `Certificate` as objects instead of strings | `400` empty |
| 6 | Filler attestation fields of realistic length | `400` empty |
| 7 | Random RPS ticket padded to 2271 chars | `400` / rejected (community) |
| 8 | Legacy API paths, old Android clients, non-prod hosts | no session (community) |
| 9 | Samsung TV flow with Xbox headers | no session (community) |
| 10 | Offering substitution (`xgpuconsole` from PC) | catalogue accepted, session still refused |
| 11 | Catalogue entry injection into the PC app | UI renders, cloud still absent |
| 12 | Device-family query swap on store endpoints | no change |
| 13 | PC-app RPS path with console model string | device class stays PC |
| 14 | Editing the signed session token | signature invalid |
| 15 | Reading the Windows device token | JWE, no recipient key |
| 16 | Emulating SystemOS/PSP without keys | no keyslot, no identity |

## Region sweep (2026-11-20)

Four region cores tested directly (`uks`, `weu`, `eus`, `scus`):

| Offering | Result for KI 2 Classic |
|---|---|
| `xgpuweb` | `400 OfferingDoesNotContainTitle` in every region |
| `xgpuconsole` | `500 InternalError` in every region |

The web offering has dropped the title globally, not per region. The console offering still
lists it, but session start errors for a non-console client in every region.

## Session endpoint re-derivation (2026-11-20, item N)

| Variant | Result |
|---|---|
| KI 2013, v5, full body | **202** + `sessionPath` (control works) |
| KI 2013, v6 | 404 |
| KI 2013, v5, settings removed | 400 `InvalidRequestParameter` (Settings required) |
| KI 2013, v5 + `X-MS-Device-Info` | 202 |
| KI 2 Classic, v5, full body, any token | **500 InternalError** |
| KI 2 Classic, console offering, same | 500 InternalError |
| `xgpuwebf2p` login | 403 `OfferingAccessDenied` |

**Interpretation (corrected 2026-11-21):** the `500` was caused by a **missing
`X-MS-Device-Info` header**, not by the title. With the header, the same request returns
`400 DeviceTypeNotAllowed`, and KI 2013 returns `202`. The device gate is measurable again.
Rows 17–23 above describe the malformed shape and are retained only as history.

Additional observations:

- requesting session start on the offering host directly returns
  `400 Unexpected host format or region ...` — the region base URI must be used
- the control title returned the **same** `sessionPath` across two calls, so a live session is
  reused for the same account rather than recreated

**Consequence:** the device gate cannot be measured for KI 2 Classic from a PC anymore. Future
session-level tests need either a GTA VI entitlement or a console-side capture.

## Tested today (2026-11-20)

| # | Idea | Result |
|---|---|---|
| 17 | User token only (no device token) → KI 2 session | `500 InternalError` |
| 18 | Android device token → KI 2 session | `500 InternalError` |
| 19 | Win32 device token → KI 2 session (control) | `500 InternalError` |
| 20 | Same three against the console offering | `500 InternalError` |
| 21 | Same shape for unrestricted KI 2013 | `500 InternalError` → later `202` after re-derivation |
| 22 | Console client header + console-style settings (`XboxOne`, `native`) | `400 OfferingDoesNotContainTitle` |
| 23 | `XboxSeriesX` header + `xboxOS` settings | `400 OfferingDoesNotContainTitle` |
| 26 | Undocumented offering `xgpu` | login 200, catalogue 2,864 titles, no restricted titles; session KI 2 → `400 OfferingDoesNotContainTitle` |
| 27 | Offerings `xcloud`, `xgpuconsolex` | `403 OfferingAccessDenied` |
| 28 | Catalogue query params `deviceType=XboxOne`, `device=XboxOne`, `deviceType=Scarlett` | ignored; no restricted titles |
| 29 | Title ID case and trailing space variants | `400 OfferingDoesNotContainTitle` |
| 30 | KI 2013 session on `xgpu` offering | `504` gateway timeout |
| 31 | `gssv-auth-prod.xboxlive.com` root | `404` (host exists, no HTTP root) |
| 32 | SDK login body `{authenticationType, token}` | `400 InvalidRequestParameter` (offeringId required by this endpoint) |
| 33 | `/v1/titles` catalogue revision | 2,864 titles, no restricted titles — same content as `/v2` |
| 34 | `/v5/sessions/cloud/active` | `404` with no active session |
| 35 | Forged `gsToken`: `alg: none`, `devicetype: XboxOne` | `401` — signature enforced |
| 37 | KI 2 + `x-gssv-client: XboxOne` + `X-MS-Device-Info` | `400 DeviceTypeNotAllowed` (gate measurable) |
| 38 | KI 2013 with the same headers | `202` + sessionPath |
| 39 | GTA VI with the same headers | `400 NoEntitlement` (no licence on test account) |
| 40 | `device.auth` with `Nintendo`, `Luna` (community) | `200` — other classes accepted |
| 41 | Console-shaped PoP body with dummy blobs, `Nonce` and a JWT-shaped `SP_JWT` | `400` empty; a community claim of `403` was **not reproduced** |
| 42 | GTA VI from a PS3 client (GR33N / DeepPlay), 2026-11-19, stock apps, no device spoofing (community) | played ~2.5 h, then **blocked**; other users report `400` |
| 43 | Console same-shape control: `Win32` (426 B) vs `Xbox` (425 B), only the type differs (community) | `200` vs `400` empty — **class gate confirmed, not schema** |
| 44 | Console branch: five fields, `TokenType: SP_JWT`, no `Signature` header, real SP attestation | `200`, **XCOS** ~3.5 KB — an intermediate, not accepted by XSTS |
| 45 | `xsts/authorize` for RETAIL with the Dev Mode-converted **JWE** | `401`, XErr `2148916249` (`0x8015DC19`) |
| 46 | Type-string control: `Win32`/`XboxOne`/`Xbox`/`Scarlett`/`Banana`, identical dummy body | `200` only for `Win32`; empty `400` for all others — class and invalid type look the same |
| 47 | `Win32` + `SP_JWT`, and `Scarlett` + `JWT` | `400` — `TokenType` is checked with the type |
| 48 | `SP_JWT` structural variants: our-key JWS, random signature, `alg:none` | `400` empty for all three — a well-formed signature is not enough without real material |
| 49 | Five-field console body with synthetic blobs | `400` at the identical 2,963 bytes — size is not the check |
| 50 | Same real attestation, `XboxOne` declared instead of `Scarlett` | `400` — type must match the attested class |
| 51 | Ablation: five-field body + `Nonce`, or + `SP_JWT`, or + PoP fields | `400` each — extra desktop fields break the console branch |
| 52 | Shared 7-field script (Nonce + SP_JWT + Signature) | `403` for **both** `Scarlett` and `XboxOne` — shape-dependent, not class-dependent |
| 53 | XSTS with the raw XCOS token: + user tokens / alone / RETAIL / `XDKS.1` / no sandbox | `400` in every combination — XCOS is not a token |
| 54 | `XblaProcessXcosDeviceToken` from an app context | `0x87DD0001` — the XCOS → JWE conversion is system-only |
| 55 | `device.auth` `XboxOne` on a real Xbox One, own 1,208-char attestation | `200`, XCOS 3,196 chars — type matches per model |
| 56 | Earlier and later replay of the captured signed console XSTS POST | Earlier `200` (JWE 1,996 chars). Later `403`. Rejection cause undetermined. |
| 57 | XSTS `SandboxId: XDKS.1` from a retail account | `401 0x8015DC12` NoAccess — dev sandbox closed at token issuance |
| 58 | `dnet` XSTS / device.auth from a prod-flighted dev unit | `400` in every combination — dnet needs a dnet-minted token |
| 36 | Tampered `gsToken` signature | `401` |

**Correction (2026-11-21):** the `500` was an **instrument failure** — a missing
`X-MS-Device-Info` header — not a server-side change. With the header the gate is measurable
again (rows 37–39). Rows recorded on 2026-11-20 that describe `500` should be read as
malformed-request results, not device decisions.

## Still open — untested

| # | Idea | Needs | Why it might work |
|---|---|---|---|
| A | Borrow a console device token, replay from PC | dev-mode capture | if the token is bearer, not channel-bound |
| B | Borrow a console `gsToken` / XSTS token | capture | highest layer, least likely to be bound |
| C | Replay a captured `/device/authenticate` unchanged | capture | tests freshness and nonce binding |
| D | Swap certificates between two consoles | two consoles | tests whether the cert is bound to the device record |
| E | Clock skew / nonce reuse on a captured request | capture | servers often allow small windows |
| F | Glitched console key extraction, sign locally | hardware mod | removes the console from the loop |
| G | Devkit identity | a devkit | devkits may hold a console-class cert. **Updated:** Dev Mode already mints a `Scarlett` token; the blocker is XSTS rejecting it for RETAIL, so the test is whether a devkit/retail-mode token is accepted |
| H | Use a captured console token with a **different account** | capture + second account | tests whether the token is user-bound |
| I | Reuse a console `sessionPath` from a PC | capture | **limited observation**: one console owner could not reconnect even on the same console after leaving the app. That covers a terminated session, not every active-session lifecycle |
| J | Attach to a console-started WebRTC session | capture | same limited observation; not ruled out for an active session |
| ~~K~~ | ~~`xgpuwebf2p` offering~~ | — | **closed**: 403 `OfferingAccessDenied` for this account |
| ~~L~~ | ~~Audience / token-type confusion~~ | — | **closed**: `TokenType: JWE` and `RelyingParty: gssv` both return `400` empty with `XboxOne` |
| ~~M~~ | ~~Certificate-chain leniency~~ | — | **blocked by the parameter gate**: any `Certificate` value returns `400` before chain validation, so leniency cannot be reached |
| ~~N~~ | ~~Session request re-derivation~~ | — | **done**: the `500` was a missing `X-MS-Device-Info` header; with it, `400 DeviceTypeNotAllowed` |
| ~~N2~~ | ~~Launch the xCloud app in Dev Mode to capture the play call~~ | — | **closed**: retail apps cannot start in Dev Mode (`0x80040904`) |

## Session-result chronology (read before comparing rows)

The same title produced three different responses on three different days and contexts:

| Date / context | Result |
|---|---|
| 2026-11-19, `xgpuweb`, `XboxComBrowser` | `400 DeviceTypeNotAllowed` (historical) |
| 2026-11-20, default region base, full body | `500 InternalError` |
| 2026-11-20, explicit region cores, `XboxComBrowser` | `400 OfferingDoesNotContainTitle` |
| 2026-11-20, explicit region cores, `XboxOne` header | `500 InternalError` |

Rows in this file must be read with their client header and host context. The `500` may be a
title/config problem, an error path for a disallowed device, or something else; it is **not**
established that it is the device check.

## From external review (2026-11-21)

An independent review of this repository proposed tests we had not specified. Recorded as
untested:

| # | Test | Effort |
|---|---|---|
| O | Explain the current `500`: compare `hasEntitlement`, `programs`, `userPrograms` against session result for KI 2, KI 2013 and a nonexistent title, with correlation IDs | **run 2026-11-21 — entitlement ruled out, see below** |
| P | Validate a full working PC stream as a control: `/play` → state → `/connect` → SDP/ICE → first frame | Low |
| Q | Token portability prerequisite: reuse one legitimate `Win32` `gsToken` in two PC environments | Low |
| R | Compare `WindowsOneCore` vs `Win32` sign-in paths on the same PC and the resulting `gsToken.devicetype` | Medium |
| S | Audit non-`dty` claims (`dca`, `ddm`, `dpi`, `xti`, `sbx`) between PC and official client | Low |
| T | Structural comparison of the synthetic request against the disassembled builder | Medium |
| U | Capture the console's full session lifecycle, not just `/device/authenticate` | Medium |
| V | Capture console-side catalogue/eligibility context (offering, programs, runtime, sandbox) | Low |

### O result (2026-11-21)

Same offering (`xgpuconsole`), same client, same minute:

| Title | Entitlement | Allowlist | Programs | Session |
|---|---|---|---|---|
| KI 2 Classic | true | XBOXONE, SCARLETT, SAMSUNGTV | CALLISTO | `500` (correlation id returned) |
| KI 2013 | true | none | CALLISTO | `202` + sessionPath |
| nonexistent | — | — | — | `400 OfferingDoesNotContainTitle` |

Entitlement and programme grants are identical between the two KI titles, so the `500` is not an
entitlement or catalogue-membership error. It correlates only with the restricted title. The
cause is still unknown — a title-level fault, an error path in the device check, or something
else.

## Evidence that borrowing could work

- `XboxAuthTool` mints tokens for other relying parties from a console's device token, i.e. the
  token is used off the device that created it.
- `ToastMyConsole` (patched 2019) exfiltrated XSTS user and device tokens from consoles; that
  only makes sense if the tokens are bearer credentials.

Neither proves GSSV accepts a console token from a PC. Protocol A in
[capture-protocols.md](capture-protocols.md) settles it.

## Order of work (revised)

1. N first — the session endpoint returns `500` for our old shape, so tests 17–21 are invalid.
2. K and L are cheap and need no hardware.
3. A/B/C need one dev-mode capture; they are the only ones that can produce a real result.
4. D/E/H/I/J need captures or a second console.
5. F/G need hardware and are not requested.

## Known dead ends, for the record

- Any client-advertised identity string.
- Any request field that is not covered by a signature.
- Any OS-level emulation without the security processor.
- Any hard-drive or update dump without retail keys.

## Order of work

1. Re-derive the current session request (so 17–21 can be retested properly).
2. Get one dev-mode capture: does `device.auth` appear at all?
3. If yes, run A/B/C.
4. If those fail, only F remains.
