# Open questions

Ordered by how much they would change the picture, not by difficulty.

## Q1. What exactly does the backend accept?

Is a genuine console attestation sufficient on its own, or does the server also require a
console record registered to the account?

- **Would answer:** an authorised capture of a successful console device-auth and the
  resulting session authorisation.
- **Blocker:** hardware.

## Q2. Does the official Windows RPS token reach XSTS, and with what class?

The service issues a JWE device token. Does the app or identity stack present it to XSTS, and
does the resulting GSSV token carry a device class?

- **Would answer:** a signed-in official client with a status/claim-only trace.
- **Blocker:** interactive sign-in with the entitled account.
- **Note:** even a positive result would not produce a console class.

## Q3. Is the catalogue filter per-account or global?

On 2026-11-20 the web offering stopped listing the restricted titles. Is that a permanent
change, a launch-window rollout, or account-specific?

- **Would answer:** re-scan `xgpuweb` over several days and with a second account.
- **Blocker:** none, just time.

## Q4. Does the console catalogue consume the device claim?

Tested with a `Win32` token: no difference. Would a console-class token change the listing?

- **Would answer:** impossible to test without a console token. Current evidence says the
  filter is per offering.

## Q5. Would a title allowing `ANDROID` or `IOS` behave differently?

Such a title would isolate whether the check is a literal set membership on `devicetype`.

- **Would answer:** a catalogue scan for any allowlist containing a non-console class.
- **Status:** none found in 2,400+ titles.

## Q6. Can a retail Samsung TV actually start KI 2 Classic?

The allowlist says yes; behaviour was never observed.

- **Would answer:** a TV owner running the test and reporting the session result.
- **Scope:** KI 2 Classic only; GTA VI does not allow `SAMSUNGTV`.

## Q7. How does `EffectiveRegion` affect the decision?

The console builder emits `China` or `None`. Its server-side meaning was not investigated.

- **Would answer:** console-side testing across regions.

## Q8. Is the JWE device class stable across hardware?

The Windows token is unreadable, but its downstream effects might be observable with
different `DeviceModel` values on the same account.

- **Would answer:** controlled experiments changing hardware model strings on the RPS path
  (which the client derives from hardware) — requires driver-level work, not planned.

## Q9. What does `XblaProcessXcosDeviceToken` do differently?

Two processing paths exist for two console generations. Which fields differ server-side is
unknown.

- **Would answer:** console firmware analysis beyond what public research documents.

## Q9a. Was there an enforcement window on launch day?

A creator played GTA VI on a PS3 via GR33N on 2026-11-19, then lost access. The stream is
genuine gameplay and contains **no device spoofing**: stock apps, purchased game, cloud hours
paid. He now says it is blocked on PS3 and that streaming from an Xbox is required. Other users
report `400` when they try.

- **Would answer:** a capture of the **login and session-start requests** from a working PS3
  client on the 19th (or from any client that worked), and the `allowedDeviceTypes` value for
  `GRANDTHEFTAUTOVI` as served that day.
- **Why it matters:** distinguishes the two live hypotheses — the title was temporarily
  reachable for non-console classes, or the PS3 client presents a class that was briefly
  accepted. Only the first would have been usable from a PC.
- **Not evidence:** our own `400`→`500` shift was a missing header on our side, so it cannot be
  used to date his loss of access. The `400` seen by other users can.

## Q10. What does `0x8015DC19` on XSTS actually mean?

A retail Series S in Dev Mode mints a `Scarlett` token successfully (`device.auth` → `200`,
**XCOS** ~3.5 KB). XSTS refuses XCOS in every combination (`400`); the console converts it to a
**JWE** locally via `XblaProcessXcosDeviceToken`, which returns `0x87DD0001` to apps. That JWE is
what XSTS evaluates, and for RETAIL it returns `401` / XErr `2148916249` (`0x8015DC19`).

The console branch itself is fully mapped: five fields, `TokenType: SP_JWT`, no `Signature` header,
SP-minted attestation that must match the declared type. The documented `ddm` (debug mode) and
`sbx` (sandbox) claims are the most plausible inputs for the rejection; both are set by the boot
and the console's registration, not by the request.

Three candidate causes, in order of likelihood:

1. **Sandbox binding** — the token records the development sandbox, so RETAIL refuses it.
2. **Device-record mismatch** — the console is known to Live, but not as a retail-play device
   while booted into Dev Mode.
3. **Freshness / environment** — clock or attestation age makes the signature unacceptable.

- **Would answer:** the same capture from the same console **booted to retail**, plus the XSTS
  status and body size for each; and whether a non-GSSV relying party also returns 401.
- **Why it matters:** if it is sandbox binding, Dev Mode is a dead end for a usable token and
  only a retail-mode console (or devkit) can produce one. If it is freshness, the Dev Mode path
  might be repairable. The conversion step is closed separately: apps cannot call it, so an XCOS
  token obtained outside the console is useless regardless.

## Q11. Can one console identity back more than one account or session?

A device token is minted at boot, before any user signs in, and lives ~14 days.
Nothing observed so far consumes the device token per session.

- **Unknown:** whether GSSV or session start binds the device record to one account or session at
  a time, and whether one device appearing for several accounts from different addresses trips
  anomaly detection.
- **Would answer:** two entitled accounts on the same console — one sequential session start
  each, then two concurrent starts. Status codes only.
- **Why it matters:** it decides whether a signing relay ("marionette") is viable at all, or needs
  one console per user.
- **Risk:** this is exactly the pattern that gets a console and account banned. Throwaway accounts
  and hardware only.
