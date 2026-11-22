# Documentation

Start here if you want the full picture rather than the summary.

## Reading paths

**New to the project**
1. [Research overview](research-overview.md) — what we are asking and how we answer it
2. [Current status](current-status.md) — what is proven, what is not
3. [Device restrictions](device-restrictions.md) — the gate we are trying to pass

**You work on authentication**
1. [Authentication flow](authentication-flow.md)
2. [XSTS and GSSV](xsts-and-gssv.md)
3. [Console attestation](console-attestation.md)
4. [Reverse engineering](reverse-engineering.md)
5. [XblAuthManager static interface](xblauthmanager-static-interface.md)

**You work on Windows clients**
1. [Windows GamingServices](windows-gamingservices.md)
2. [Xbox app investigation](xbox-app-investigation.md)

**You want to reproduce or extend the work**
1. [What we need](what-we-need.md)
2. [Methodology and evidence levels](methodology.md)
3. [Experiments](experiments.md)
4. [Failed approaches](failed-approaches.md)
5. [Open questions](open-questions.md)

## All documents

| File | Contents |
|---|---|
| [research-overview.md](research-overview.md) | Problem statement, scope, what counts as success |
| [methodology.md](methodology.md) | Evidence levels and how findings are labelled |
| [current-status.md](current-status.md) | Status table, completion criteria, progress caveats |
| [authentication-flow.md](authentication-flow.md) | End-to-end flow with observed fields and status codes |
| [device-restrictions.md](device-restrictions.md) | Allowlists, catalogue visibility, entitlement vs authorisation |
| [xsts-and-gssv.md](xsts-and-gssv.md) | XSTS claims, offerings, catalogue differences, device propagation |
| [console-attestation.md](console-attestation.md) | Certificate, attestation, boot log, PCR, security processor |
| [windows-gamingservices.md](windows-gamingservices.md) | RPS device auth from `gamingservices.exe`, WinHTTP capture |
| [xbox-app-investigation.md](xbox-app-investigation.md) | App automation, missing Play button, account mismatch |
| [reverse-engineering.md](reverse-engineering.md) | `XblAuthManager.dll`, API-set mapping, corrections |
| [xblauthmanager-static-interface.md](xblauthmanager-static-interface.md) | 43-method interface, signer reachability, why no callable export exists |
| [emulation-research.md](emulation-research.md) | Xbox OS images, Tizen TV emulator, trust boundaries |
| [alternative-clients.md](alternative-clients.md) | DeepPlay, GR33N, Bannerlator, Better xCloud, GTAXC |
| [experiments.md](experiments.md) | Experiment catalogue with results |
| [failed-approaches.md](failed-approaches.md) | Approaches that did not work and why |
| [open-questions.md](open-questions.md) | Unresolved technical questions |
| [what-we-need.md](what-we-need.md) | Evidence wishlist ranked by value per effort |
| [roadmap.md](roadmap.md) | Unknowns, dependency map, what unlocks what |
| [game-executables.md](game-executables.md) | Assets, executables and why they do not solve cloud access |
| [references.md](references.md) | Public sources and third-party projects |
| [publication-checklist.md](publication-checklist.md) | Scans and checks before publishing |

## Conventions

- Every claim carries an evidence label — see [methodology.md](methodology.md).
- Endpoint names, field names and status codes are safe to publish. Token values are not.
- Addresses in reverse-engineering notes are **RVAs** unless prefixed with `0x180...` (VA).
- Snapshots of catalogues are dated; Microsoft changes them.
