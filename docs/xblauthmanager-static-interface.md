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

## Result: the interface exists, the callable door does not

The 43-method interface is real and fully enumerated below, **but it is not reachable
from outside the auth manager**:

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

So `GetSignatureForPreAuthorizedRequest` is an **in-process API of the auth manager
library**, not a method exposed over COM/IPC. Calling it requires already being inside a
process that hosts `XblAuthManager.dll` with the right capability — which is exactly why
the console's own components can produce the `signature` header and a PC harness cannot.

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
* The function has **no static reference anywhere in the module** (no `call`, no `lea`,
  no vtable RVA, no DIR64 fixup to it) — consistent with dispatch through an object
  table that is never crossed by a direct reference, and with the in-proc-only conclusion.

## Practical consequence

The `signature` header on the console's XSTS requests is produced by the auth manager
service for its own pre-authorized requests, keyed to the caller's capability. There is
no user-mode entry point on a PC, and none over COM, that will sign an arbitrary body with
that key. Remaining routes are behavioural, not static: have a console component (title or
xCloud package) perform the `gssv` XSTS itself, or accept the user+device XSTS that can
already be minted without the header.
