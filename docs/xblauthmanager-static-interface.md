# XblAuthManager: static interface recovery

Static analysis of `C:\Windows\System32\XblAuthManager.dll` (pulled from the dev-mode
console over the SystemOS developer share). Goal was to recover the vtable slot of
`GetSignatureForPreAuthorizedRequest` so a harness on the console could call it through
the registered COM proxy (`XblAuthManagerProxy.dll`).

| Field | Value |
|---|---|
| File | `XblAuthManager.dll` |
| Source | Dev-mode console SystemOS developer share |
| Version | `10.0.26100.9652` |
| Architecture | AMD64 |
| SHA-256 | `2f94fc6885725b6dfdd622ca1cda178ffdd8c73d2453694d082fa57f00a7b7d8` |

Addresses below are **RVAs**. This is the console build; the install-media ARM64 build is
covered in [reverse-engineering.md](reverse-engineering.md).

## Inspected exports and proxy surface

The inspection recorded 43 method names and located their implementation bodies.

* `XblAuthManager.dll` has exactly one export: `ServiceMain` (rva `0x110c0`).
* `XblAuthManagerProxy.dll`'s registered objects
  (`CLSID {4844E347-E354-4B24-9E0C-F4AE31AD55DB}`, `{CE23534B-56D8-4978-86A2-7EE570640468}`)
  are a small **property facade**, not a marshaler of this interface. Its first interface
  is 26 slots whose method bodies are cached-field accessors:
  `mov rax, rdx ; mov rdx, [rcx+0x18] ; jmp <thunk>`, 21 consecutive accessors stepping
  `[rcx+0x18] … [rcx+0xB8]` by 8, plus `mov eax,[rcx+0xC0]` / `[rcx+0xC4]` — 23 accessor
  bodies in all.
* None of the 43 method-name strings occur in `XblAuthManagerProxy.dll`,
  `XblAuthTokenBrokerExt.dll` or `XblConnectivityExt.dll` — only in
  `XblAuthManager.dll` itself.

The inspection found no export or matching method in the examined proxy surface for
`GetSignatureForPreAuthorizedRequest`. Runtime reachability through other dispatch paths
and any caller capability checks remain unverified.

## The interface (43 methods, in name-table order)

Method names were recovered as ASCII strings in `.rdata` (`0xcfaf0`–`0xd03e0`); each one
is referenced from the *failure path* of its own implementation as an ETW/telemetry
label (`lea rax, [rip+name]`), which is how each name was tied to its implementation
function (`.pdata` boundaries).

| # | method | impl (.text) |
|---|---|---|
| 1 | SetUserContextTokenForUser | `0x1b588` |
| 2 | SetGamerAccount | `0x1bdc8` |
| 3 | GetGamerAccount | `0x1b014` |
| 4 | SetAppViewInitialized | `0x1bff4` |
| 5 | PreSignOutUser | `0x1bbf8` |
| 6 | SignOutUser | `0x1b098` |
| 7 | SignOutUserFromRemoteConsole | `0x1b834` |
| 8 | GenerateTitleSPOP | `0x1be90` |
| 9 | SignOutUserFromTitleOnRemoteDevice | `0x1abfc` |
| 10 | ValidateUrlAccess | `0x3fc70` |
| 11 | ValidateUrlAccessForTitle | `0x3fdc0` |
| 12 | InvalidateUserTokens | `0x1bf58` |
| 13 | GetAccessTokenWithSubToken | `0x1ae7c` |
| 14 | GetHistoricalToken | `0x1c0bc` |
| 15 | GetSignedBodySizeForUrl | `0x1c180` |
| 16 | GetAccessTokenAndPKSignature | `0x1ab14` |
| 17 | GetAccessTokenAndPKSignatureByUserHash | `0x1ba14` |
| 18 | GetAccessTokenAndPKSignatureForAutoAttach | `0x1b134` |
| 19 | GetAccessTokenAndPKSignatureByXuid | `0x1b650` |
| 20 | GetAccessTokenAndPKSignatureByXuidOnBehalfOfTitle | `0x1b738` |
| 21 | GetTokenAndSignatureEx | `0x1b408` |
| 22 | GetTokenAndSignatureByXboxAccountId | `0x291b0` |
| 23 | GetTokenAndSignatureByUserContextToken | `0x1b284` |
| 24 | GetTokenAndSignatureForGamerAccount | `0x1bafc` |
| 25 | GetDisplayPropertiesByXuid | `0x24e80` |
| 26 | GetCombinedUserProperties | `0x240d0` |
| 27 | DoesUserHaveLinkedWebAccount | `0x20650` |
| 28 | GetWebAccountIdByXuid | `0x33b50` |
| 29 | GetTokenAndSignatureWithTokenResult | `0x1a9d8` |
| 30 | **GetSignatureForPreAuthorizedRequest** | `0x276a0` |
| 31 | EnableDevelopmentModeEx | `0x1b950` |
| 32 | SignOutUserFromDeviceAndTitle | `0x1a7b8` |
| 33 | GeneratePOPVeto | `0x1a910` |
| 34 | GetUserSignInEntries | `0x1bc94` |
| 35 | GetUserAuthenticationState | `0x1b36c` |
| 36 | GetDeviceId | `0x1b504` |
| 37 | GetSystemTimeWithTrustLevel | `0x1ad30` |
| 38 | InvalidateToken | `0x34af0` |
| 39 | GetThumbprintsForUrl | `0x285a0` |
| 40 | GetThumbprintsForSocket | `0x283a0` |
| 41 | GetSupportedProtocols | `0x28000` |
| 42 | SetClientAddress | `0x1af78` |
| 43 | SetTitleInstallId | `0x1adb4` |

Name-table order is **not** implementation order (verified non-monotonic), so it is not a
vtable order and cannot be used to derive slot indices.

## What `GetSignatureForPreAuthorizedRequest` does

`0x276a0`–`0x27ccf` (1583 bytes, verified prologue + `.pdata` entry):

* Signature: `this` + 6 further arguments (rcx, rdx, r8, r9 + stack `[rsp+0x250]`,
  `[rsp+0x258]`, `[rsp+0x260]` relative to the post-prologue frame).
* It string-matches protocol/prefix literals, decodes a blob, converts a Win32 error to
  `HRESULT` (`movzx ebx, ax ; or ebx, 0x80070000`), then calls `0x61c84` with seven
  arguments — the signing/formatting core.
* Failure paths log `"onecoreuap\\xbox\\xblauth\\lib\\authmanagerimpl.cpp"` with line
  numbers `0x159e`, `0x15a0`, `0x15a3`, `0x15ac`, `0x15d1`, `0x15d6`, `0x15de` and error
  codes such as `0x87dd0021` (bad arg), `0x87dd0024`.
* The static search found no `call`, `lea`, vtable RVA or DIR64 fixup targeting this
  entry. The dispatch mechanism remains unresolved.

## Windows request signing

**Verified by static analysis** of the AMD64 Windows 11 desktop `XblAuthManager.dll`,
fixed PE file version `10.0.26100.9974`, Windows display version `10.0.26100.8117`,
SHA-256 `68f48f9a3ab7f945c6936114abe2f17ee2e4c2f2b170e784336f337dfcd7bc06`.
These RVAs refer to the Windows file.

- The crypto initializer at `0x4f30c` opens SHA-256 for both branches. It generates
  a software ECDSA P-256 key only when `XblaIsConsole()` is zero.
- The XSTS builder at `0xaa6c0` calls the Policy 1 request signer at `0x61a24` and
  omits a JSON `ProofKey` on this path. The signer hashes a multi-field request envelope
  and builds the Base64 header from a 76-byte packed value.
- The digest signing wrapper at `0x4f454` dispatches to `BCryptSignHash` on the desktop
  branch and to the delay-imported `XblaSignDigest` when `XblaIsConsole()` is nonzero.

The Windows disassembly establishes client-side control flow in this build. The SystemOS
implementation that produced the captured signatures, its key storage, and XSTS
verification policy remain unverified.
