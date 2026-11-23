# Console attestation

What a real Xbox sends during device authentication, as far as public binaries and schema
show. This is the part a PC cannot simply fabricate.

## The console request builder

`XblAuthManager.dll` (Windows 11 23H2 ARM64, `10.0.22621.2506`) contains a console-specific
branch that serialises a richer `POST /device/authenticate` body than the PC one.

Fields, with the mode that includes them:

| Field | XboxOne | Scarlett | XboxCoreOS | Value source |
|---|---|---|---|---|
| `Attestation` | yes | yes | yes | attestation provider |
| `Certificate` | yes | yes | yes | console certificate getter |
| `PcrAttestation` | no | no | yes | TPM/PCR measurements |
| `DeviceType` | `XboxOne` | `Scarlett` | `XboxCoreOS` | literal |
| `BootLog` | yes | yes | no | console boot log |
| `SP_JWT` | placeholder | placeholder | placeholder | not present on the wire (2026-11-21 capture) |
| `EffectiveRegion` | yes | yes | yes | `China` / `None` |

The 2026-11-21 wire capture shows only five fields outbound: `Attestation`, `BootLog`,
`Certificate`, `DeviceType`, `EffectiveRegion`. This table describes the builder's field set
across modes, not the final request.

## Producer → context → field

A producer function calls the console getters and stores results into the same object that
the builder later serialises:

| Getter | Context offset | Serialised field |
|---|---|---|
| `XblaGetAttestation` | `+0xc0` | `Attestation` |
| `XblaGetConsoleCert` | `+0x100` | `Certificate` |
| `XblaGetBootLog` | `+0xe0` | `BootLog` (modes 1/2) |
| `XblaGetTpmPcrAttestation` | `+0xe0` | `PcrAttestation` (mode 3) |

Both functions receive the same object pointer; the producer call precedes the builder call.

## Response handling

After the request:

1. HTTP status is checked for `200`.
2. The JSON parser extracts `Token`, `IssueInstant`, `NotAfter`, and `DisplayClaims.xdi.did`.
3. On the non-XboxCoreOS branch, `XblaProcessSpToken` consumes the **returned** token.
4. On another branch, `XblaProcessXcosDeviceToken` does the equivalent.
5. The processed result is stored at object offset `+0x18`; status at `+0x08`.
6. The completion event at `+0x10` is signalled.

**Correction that matters:** `XblaProcessSpToken` is a post-response processor. An earlier
hypothesis that it produced the outbound `SP_JWT` is not supported — the outbound field is
initialised empty on the examined path.

## Nonce and challenge

There is a separate subsystem:

```
/device/nonce  →  object +0xa0  →  challenge handler → XblaProcessChallenge
```

The builder does **not** read `+0xa0`, and no data path from the challenge result into the
device-auth JSON was found. This does not exclude indirect security-processor state changes.

## Console binaries (verified, 2026-11-21)

The retail HDD dump contains the actual console DLLs. Extracted read-only:

```
XblAuthConsoleExt.dll   76 KB   42 exports
XblAuthManager.dll      1.2 MB  1 export (ServiceMain)
XblAuthManagerProxy.dll 116 KB
XblAuthTokenBrokerExt.dll 132 KB
xboxcloudstreaming.dll  740 KB
xboxlivetitleid.dll      64 KB
```

`XblAuthConsoleExt.dll` imports `DeviceIoControl`, `bcrypt`, `XCRDAPI` and `XboxLiveTitleId`.
It contains **no embedded keys or certificate material**. Its exports include the expected
getters plus `XblaCopyProxyAndCertFilesFromUSB`, `XblaAllowUsbCertAndProxy`,
`XblaResetSmcReloadAlgorithm` and capability-certificate helpers.

`XblAuthManager.dll` (console build) loads `ext-ms-win-xblauth-console-l1-1-0.dll` and references
`XblaGetConsoleCert` / `XblaGetAttestation`, exactly as the desktop build does.

**Conclusion:** the console binary is a user-mode wrapper over a device/driver path. The signing
keys are below it, not inside it. Extracting the DLLs does not yield an identity — but the
devkit-only USB proxy/cert path is now confirmed as a real capture route.

## The two `device.auth` branches (settled 2026-11-21)

A console-side capture plus a shared script settled what synthetic requests could not. There are
two wire shapes, and they do not mix.

| | Desktop | Console |
|---|---|---|
| Body | PoP fields (`AuthMethod`, `Id`, `ProofKey`, `Version`) | exactly `Attestation`, `BootLog`, `Certificate`, `DeviceType`, `EffectiveRegion` |
| `TokenType` | `JWT` | `SP_JWT` |
| `Signature` header | required | **absent** |
| Material | self-signed `ProofKey` | SP-minted attestation for a fresh nonce |
| Result | `200` for `Win32`/`iOS`/`Android`/`Nintendo` | `200`, **XCOS** (intermediate) |

The captured console request is 2,963 bytes and returns `200` with a ~3.5 KB XCOS token. It
contains no `Nonce`, no `SP_JWT`, no `AuthMethod`, no `ProofKey`, and no `Signature` header.

Ablation, same real attestation, only the field set changing:

| Shape | Result |
|---|---|
| 5 fields | `200` |
| + `Nonce` | `400` |
| + `SP_JWT` (`TokenType: JWT`) | `400` |
| + `AuthMethod`/`Id`/`Version`/`ProofKey` | `400` |
| full 7-field shape | `400` |

Every extra field the desktop branch needs **breaks** the console branch.

Our replication: a synthetic 5-field body with random blobs is exactly 2,963 bytes and returns
`400` — same size, different bytes. Size is not the check; the attestation is.

Material, measured, all per boot:

- `Attestation` — 744 bytes, minted by the security processor for a nonce from
  `GET /device/nonce`. The nonce is baked in and never travels in the body.
- `BootLog` — 320 bytes, `XblaGetSessionPublicKey`.
- `Certificate` — 1,024 bytes, `XblaGetConsoleCert`, magic `CC`.
- All three change after a reboot, so a capture cannot be replayed after one.

**The 403 is not a class signal.** The shared 7-field script returns `403` for `Scarlett` and for
`XboxOne` alike, and its `loadBlob()` re-encodes base64 text (`readFileSync(...).toString('base64')`),
so even real blobs arrive double-encoded through that path.

**The type must match the attestation.** Same attestation, same second: `Scarlett` → `200`,
`XboxOne` → `400`. `DeviceType` is a claim the hardware has to back, not a switch.

**Cross-generation check (community measured, 2026-11-22).** An original Xbox One returns `200`
for `XboxOne` with its own 1,208-char attestation, and a 3,196-char XCOS. The Series S
attestation is 992 chars. So the rule is per-model matching, not "Scarlett only".

**Two walls, not one.** `device.auth` returns XCOS, and `xsts/authorize` refuses that form
outright — `400` with user tokens, alone, RETAIL, a dev sandbox, or no sandbox. The console
converts XCOS to a **JWE** locally via `XblaProcessXcosDeviceToken`; from an app that call returns
`0x87DD0001`. The converted JWE is then refused for RETAIL from Dev Mode with `0x8015DC19` (Q10).
So the console path is reachable, but nothing it hands an app is usable off the unit.

## Dev Mode (measured)

A retail Series S in Dev Mode, with a trusted CA installed, produced full-TLS captures of the
sign-in path. The OS `AuthManager` service — not the app — performs device auth, so the
app-level stub is irrelevant to what the network sees.

`XblaProcessChallenge` is E_NOTIMPL in the **app's copy** of `XblAuthConsoleExt.dll`. The system
service still performs the call. "The arm cannot be exercised from a dev-mode app" is right;
"Dev Mode cannot mint a console token" is **wrong**. The XSTS signature path is discussed in
[XblAuthManager static interface](xblauthmanager-static-interface.md#windows-request-signing).

A useful side observation: the XSTS request grows by ~1.7 KB when a device token is included, so
body size alone tells you whether a capture presented one.

### Retail apps cannot start in Dev Mode (measured twice)

`POST /api/taskmanager/app` for `Microsoft.xCloudConsole2…` returns `400` with
`ErrorCode -2147219196` (`0x80040904`); the same call for Edge returns `0x8004090a`. Neither app
ran in 60 follow-up checks, and the Dev Mode home has no Game Pass or Cloud tiles.

That closes the "launch the xCloud app in Dev Mode and capture the play call" idea. The auth
traffic is real and capturable because it comes from system services, not from the retail app.

## Other console artifacts (checked 2026-11-21)

| Artifact | Result |
|---|---|
| NAND image (4.9 GB) | Mostly empty; no plaintext `certkeys`, `sp_s.cfg`, or console certificate |
| Devkit recovery VHD | No plaintext `XblAuthConsoleExt`, `certkeys`, or `XblAuthManager` strings |
| `xsec` source leak | Contains DevAuth v2, which is **accessory** authentication (Indium chip certificates), not console-to-Live identity |
| GDK SDK | Installer CABs; no auth implementation |

The only readable artifact remains the retail HDD dump.

## The boundary: console-only API set

The getters live behind:

```
ext-ms-win-xblauth-console-l1-1-0
```

44 functions including `XblaGetConsoleCert`, `XblaGetAttestation`, `XblaGetBootLog`,
`XblaGetTpmPcrAttestation`, `XblaSignDigest`, `XblaProcessSpToken`,
`XblaProcessXcosDeviceToken`, `XblaIsConsole`, `XblaIsSecurityProcessorPresent`.

Parsing `apisetschema.dll` shows this virtual contract maps to an **empty host** on stock
desktop Windows (ARM64 and x64 builds checked). That is stronger than "the DLL is missing":
the contract exists in the schema with no implementation.

**Verified:** desktop Windows cannot resolve these entry points from a stock image.

**Inferred:** they are implemented by console SystemOS and the security processor.

## Security processor

Public research describes the AMD Platform Security Processor on the Xbox die as a separate
core running Microsoft code, holding keyslots that only PSP code can use, contacted by the
host OS through `psp.sys`. A boot chain and certificate hierarchy sit outside the reach of a
PC process.

That is the reason booting an Xbox OS image is not equivalent to obtaining an identity: the
keys and the attestation live below the OS.

## What remains unknown

- The verifier's exact rule. We know a hardware-minted attestation is accepted and the same
  bytes with a different declared type are not; what it checks beyond that is unknown.
- Whether a retail-mode token is accepted at XSTS, or whether the sandbox is checked separately.
- How `EffectiveRegion` influences the decision.

## Why dummy fields fail

Two separate reasons. The attestation is validated, so random bytes fail. And the extra fields
are not part of the console branch at all — adding them turns an otherwise valid request into
`400`.

See [reverse-engineering.md](reverse-engineering.md) for addresses and corrections.
