# Current status

**Snapshot:** 2026-11-22. Service behaviour changes without notice.

## Headline

| Track | State |
|---|---|
| Research understanding | ~47% (subjective estimate) |
| Functional console impersonation | 0% |
| Restricted title launched on PC | No |
| GTA VI cloud gameplay on PC | Not achieved |

The percentage is an honest guess at how much of the decision surface is mapped. It is not
a test metric and should not be read as "47% of a bypass".

## What is established

| Claim | Level |
|---|---|
| Device allowlists exist per title and are enforced at session start | Locally tested |
| KI 2013 starts (`202`) while KI 2 Classic is refused (`400 DeviceTypeNotAllowed`) on the same account | Locally tested (reproduced 2026-11-21) |
| Device class travels from the device token into the GSSV session claim | Locally tested |
| `device.auth` has separate desktop and console shapes; the console shape needs SP-minted attestation and returns XCOS, an intermediate only the system can convert | Locally tested + console capture (2026-11-21) |
| PoP signatures for console-type requests on the desktop branch were structurally valid — the wrong branch, see below | Locally tested (offline verification) |
| The console wire request carries certificate, attestation, boot log, type and region — no nonce or SP token | Console capture (2026-11-21) |
| The console provider API set has no implementation host on desktop Windows | Verified (schema + binary) |
| `gamingservices.exe` performs RPS device authentication over WinHTTP | Locally tested |
| Windows device tokens are returned as JWE and not readable client-side | Locally tested |
| The PC-app offering excludes the restricted titles | Locally tested |
| Adding console fields to a `device.auth` request does not change the refusal | Locally tested |
| Catalogue gating is per offering, not per device token | Locally tested |
| The console's XSTS `signature` header is 76 bytes: BE policy `1`, BE FILETIME, 64-byte P-256 `r‖s` | Console capture decoded (2026-11-21) |
| Replaying a captured signed XSTS returns `200` while the header timestamp is fresh and `403` once stale | Locally tested (2026-11-21) |
| `XblaSignDigest` signs a 32-byte digest into 64 bytes, but it is not the signer XSTS trusts (`403`) | Locally tested (2026-11-21) |
| A PC-minted user+device token gets `200` in `RETAIL` and `401 0x8015DC12` in `XDKS.1` | Locally tested (2026-11-21) |
| The pre-authorized-request signer is in-proc only — no COM object or export exposes it | Static analysis (2026-11-22) |
| Retail titles and the retail shell cannot be launched in Dev Mode | Environment constraint (2026-11-22) |

## What is not established

- The exact server-side acceptance rule for console identities.
- Whether a genuine attestation is sufficient by itself, or whether the server also checks a
  registered console record.
- Whether the official Windows RPS device token influences downstream XSTS/GSSV claims.
- Whether a real Samsung TV can start KI 2 Classic.
- Whether the `xgpuweb` catalogue exclusion (observed 2026-11-20) is permanent.
- Whether the `signature` header is required at all for the `gssv` relying party — no GSSV
  session request has ever been sent without one.
- Whether an XSTS in `XDKS.1` for `gssv` already sits in the existing flow captures.
- Whether a self-built Dev Mode package can obtain a signature for a URL that is not
  pre-authorized, or only for pre-authorized ones.

The canonical list, each with the experiment that would answer it, is
[open-questions.md](open-questions.md).

## Completion criteria

A working result requires all of:

1. a legitimately entitled account,
2. an accepted session for a device-restricted title,
3. an established stream reaching gameplay,
4. a method that does not borrow another person's identity.

Anything less is progress, not success.

## Status of the test account

- Entitled to KI 2 Classic; not entitled to GTA VI.
- No console linked, so `xhome` console streaming is unavailable.
- The Windows Xbox app was found to be signed in as a **different account** than the API
  probe account; see [xbox-app-investigation.md](xbox-app-investigation.md). This explains
  earlier "missing Play button" confusion and is not a device-identity result.

## Community reports and observations

Each item carries its own status. Nothing here becomes a project result until it is reproduced
or independently measured.

- An Xbox owner reports KI 2 Classic reaching the "Launching with cloud gaming" screen on a
  real console (2026-11-20). **Gameplay and console model are still unconfirmed** — the
  screenshot shows the loading screen, not a match. Treat the premise as partially confirmed.
- A console owner ran the same title from a PC client with the **same account** and received
  `400` (2026-11-20). The request was made from a web/macOS client, not the native Windows app.
  This is the account-vs-device comparison the roadmap asked for, and it points at the device.
- The maintainer reports KI 2 Classic **did not start on a Samsung TV**, despite `SAMSUNGTV`
  being in the allowlist. Details pending. This weakens the TV branch and the PS4/TV-class
  claim below.
- A PS4 homebrew setup is reported to be identified as `SAMSUNGTV` in its device class. If
  true, it is the first non-TV client reported to hold that class — relevant to KI 2 Classic,
  not GTA VI.
- A console owner ran a local DNS server and logged queries during a KI 2 launch: delivery and
  store hosts appeared (`d2.xboxlive.com`, `www.xbox.com`, CDN CNAMEs), but no auth host, and a
  reboot did not re-query. Consistent with the device token being issued at sign-in/boot and
  cached. DNS gives hostnames only — no paths, no payloads.
- A second console capture (header-only, 82-byte snaplen) was taken during a KI 2 launch. Even
  without payloads, resolving known hostnames and intersecting the capture's IPs shows the
  console contacting: `xsts.auth.xboxlive.com` (20.201.192.52), `title.mgt.xboxlive.com`
  (13.69.141.149), `userpresence.xboxlive.com` (20.201.200.56), and the `uks`/`weu` GSSV
  region hosts. A `40.90.8.x` range matching `device.auth` is present but not confirmed
  without SNI. First console-side evidence that XSTS and GSSV are contacted during a launch.
- A Polish creator (RetroGaming) played **GTA VI on a PS3 via GR33N / DeepPlay on 2026-11-19**
  (2.5-hour stream, primary source reviewed — see below). He says access is now blocked.
- A news article (gamegpu, 2026-11-21) claims GTA VI runs on a hacked Switch via the `green-nx`
  client. Checked against the source and the catalogue: the client logs into `xgpuweb` and sends
  no device token, and `xgpuweb` does not list GTA VI. **Contradicted**, not just unverified.
- The 2026 Xbox One boot ROM glitch is reported to yield key dumps and SystemOS decryption.
  Not reproduced, not requested, and not required for any test we can run today.

## `device.auth` console branch resolved (2026-11-21)

Two wire shapes, not one. The desktop shape is PoP-signed and accepts `Win32`/`iOS`/`Android`/
`Nintendo`. The console shape is **five fields, `TokenType: SP_JWT`, and no `Signature` header**:

```json
{"RelyingParty":"http://auth.xboxlive.com","TokenType":"SP_JWT",
 "Properties":{"Attestation":"...","BootLog":"...","Certificate":"...",
               "DeviceType":"Scarlett","EffectiveRegion":"None"}}
```

A retail Series S sends exactly that in 2,963 bytes and gets `200` with an **XCOS** token.
Adding any desktop field (`Nonce`, `SP_JWT`, `AuthMethod`, `Id`, `Version`, `ProofKey`) turns the
same request into `400`. Our synthetic five-field body is the same 2,963 bytes and gets `400`:
same size, different bytes, so the attestation is the check.

Attestation is 744 bytes minted by the security processor for a fresh `/device/nonce`; `BootLog`
is the 320-byte session public key; `Certificate` is the 1,024-byte console certificate. All three
change per boot.

Consequences for the model:

- **There is no console-class blocklist at `device.auth`.** With matching attestation, `Scarlett`
  returns `200`; with the same attestation and `XboxOne` declared, `400`. The type must match what
  the hardware attests. Cross-generation check: an original Xbox One returns `200` for `XboxOne`
  with its own 1,208-char attestation.
- **The `403` some of us chased is a shape artefact.** The shared 7-field script returns `403` for
  `Scarlett` and `XboxOne` alike, and double-encodes base64 blobs.
- **XCOS is not a credential.** `xsts/authorize` refuses it in every combination — user tokens
  plus device token, device token alone, RETAIL, a dev sandbox, no sandbox — always `400`. The
  console converts XCOS to a **JWE** locally with `XblaProcessXcosDeviceToken`; that call returns
  `0x87DD0001` to apps. Only the JWE is accepted by XSTS.
- **The second wall is the converted JWE.** From Dev Mode it gets `401 0x8015DC19` (Q10).

So the wall was never a magic string. It is the security processor, then a system-only conversion,
then the sandbox.

## PS3 stream, primary source reviewed (2026-11-21)

The recording (`youtube.com/watch?v=mwP2VLS5hWY`) is real gameplay: GTA VI on a PS3, 29–31 fps,
20–30 ms reported latency, wired Ethernet, ~720p. Third-party timestamp review adds: the XMB
shows "Quit Game (DeepPlay)" over the running game, and the overlay is live decoder telemetry
(decoded/shown frames), so a real PS3 app is decoding a stream. The stream also **starts
mid-session**, so the login and session-start calls are not in it.

What the stream actually says matters more than the clip:

- He states repeatedly it is **Xbox Cloud Gaming**, not remote play and not an emulator — two
  homebrew apps, **DeepPlay** and **GR33N**, logged into his Xbox account.
- He says the game is **purchased on his Xbox account** (GTA VI Ultimate) and cloud hours are
  paid separately. That is consistent with a normal cloud session, not with a borrowed console.
- Across ~2.5 hours there is **no mention of spoofing, device strings, patched binaries or
  modified auth**. He attributes it to Microsoft "allowing the older Xbox One / One S / One X"
  to play GTA VI in the cloud, and says he only reviewed the apps' decompilation with AI tools.
- In comments posted a day later he says it is **now blocked**: "it worked via cloud then, now
  it's blocked and you have to stream from another MS console", and "they've already blocked it
  on PS3". Another commenter reports `xbox could not start this game (code HTTP 400)`.
- One commenter claims it was DeepPlay's **Remote Play** and required an Xbox. RetroGaming
  replies "DeepPlay yes, GR33N no", which is ambiguous but does not concede remote play.

The earlier claim that he tried device identifiers from his own Xbox One and Series consoles
**does not appear in the stream** and remains second-hand from a third party.

**Reading:** this is a window, not a method, and it does not contradict the device gate. If the
session was genuine cloud on a stock client, the plausible explanations are (a) the title was
temporarily reachable for non-console classes at launch and the allowlist was enforced
afterwards, or (b) the PS3 client presents a class that was briefly accepted. Neither requires a
console-class token, and neither is reproducible today. Note that our own `500` was an
instrument bug, so the 19→20 November `400`→`500` shift here is **not** evidence for his
timeline; the `400` reported by other users is.

## Session shape corrected (2026-11-21)

The `500` was **our request shape**, not a title problem. A console-side researcher found that
`X-MS-Device-Info` must be present; without it the service returns `500 InternalError`, with it
the real gate appears. Reproduced here:

| Request | Result |
|---|---|
| KI 2 Classic, `xgpuconsole`, no device header | `500` |
| KI 2 Classic, `xgpuconsole`, `X-MS-Device-Info` | `400 DeviceTypeNotAllowed` |
| KI 2013, same headers | `202` + sessionPath |
| GTA VI, same headers | `400 NoEntitlement` (account has no licence) |

So the device gate is measurable again, and the denial is exactly what the model predicted.
The earlier "title not available to Win32" reading was wrong.

## The signed-request layer (2026-11-21 → 11-22)

Above the token wall sits a second, smaller one: the console attaches a `signature` header to
its XSTS requests, and a PC client cannot produce one.

**Format.** base64 of 76 bytes: a 4-byte big-endian policy number (`1`), an 8-byte big-endian
FILETIME, then a 64-byte raw ECDSA P-256 `r‖s`. No DER, no ASN.1.

**Replay works inside a window.** Replaying a captured body together with its captured
signature returns `200` and a 1,996-char token; the same pair later returns `403`. The
signature therefore binds that exact body and a short validity window. A captured signature is
a one-shot artefact, not a reusable signer — the durable part is the returned token.

**`XblaSignDigest` is not that signer.** The export (`XblAuthConsoleExt.dll`, RVA `0x4500`)
is callable: `(const void*, u32, void*, u32)`, input must be exactly 32 bytes, output buffer
exactly 64 (`cmp r8d, 0x20` and `cmp [rsp+0x100], 0x40` in the disassembly). It hashes locally
with BCrypt and hands the digest to the security processor, returning a 64-byte P-256
signature. Signing an XSTS body with it — raw, or as `sha256(body)` — returns `403`.
`XblAuthManager.dll` is the component that owns the PoP key: it imports
`BCryptGenerateKeyPair` / `BCryptImportKeyPair` / `BCryptSignHash` alongside
`GetSystemTimeAsFileTime`, which matches the header layout above.

**The signer has no callable surface.** The 43-method auth-manager interface was recovered
statically, including the signer's implementation (`0x276a0`, seven arguments); the full table
is in [xblauthmanager-static-interface.md](xblauthmanager-static-interface.md). It cannot be
called from outside: `XblAuthManager.dll` exports only `ServiceMain`, `XblAuthManagerProxy.dll`
is a property facade rather than a marshaler of that interface, none of the 43 method names
appear in the proxy or in the broker/connectivity extension DLLs, and `0x276a0` has no static
reference anywhere in the module. Being in-proc-only is precisely why the console's own
components can sign and a harness cannot.

## What the Dev Mode constraint removes (2026-11-22)

A route was proposed and withdrawn the same day: "launch an installed Xbox Live title and
harvest the `gssv` XSTS it mints". **Retail titles and the retail shell cannot be launched in
Dev Mode**, so there is no installed title to launch on this console. The same fact shows up in
the token results: a PC-minted user+device token gets `401 0x8015DC12` in `XDKS.1` where it gets
`200` in `RETAIL` — the console lives in the one sandbox that refuses it. (Different subcode
from the `0x8015DC19` recorded above, same family: the dev-sandbox wall.) The constraint itself
is already recorded in [failed-approaches.md](failed-approaches.md).

What remains on the console side:

| Route | Yields | Cost |
|---|---|---|
| Passive harvest from SystemOS traffic already captured | only what the OS already asked for; expiring tokens | free, offline |
| Self-built Dev Mode package (a real title identity in `XDKS.1`) | a native title-side token; maybe signatures only for pre-authorized URLs | hours |
| Register/launch `Microsoft.xCloudConsole2` | the production client's full GSSV login | high, package may be unobtainable |
| One request with the token already mintable | a yes/no on whether the header is required at all | one call |

The last row is the cheapest way to convert the open question into a fact and should be read
before spending anything on the others.

## Snapshot drift

Catalogue contents changed during the project:

- 2026-11-19: `xgpuweb` listed both restricted titles with allowlists.
- 2026-11-20: `xgpuweb` no longer lists either; `xgpuconsole` still does.

Treat every catalogue table as a dated snapshot.
