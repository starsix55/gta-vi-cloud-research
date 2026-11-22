# Game assets and executables

A recurring question: if assets or the game executable leak, can GTA VI be played on a PC
without the console? This page separates that from what this project actually studies.

## Two different problems

| Problem | What it needs | This project |
|---|---|---|
| **Cloud device identity** — may a PC start a console-restricted stream? | A Microsoft-accepted console identity | **Yes** |
| **Local game execution** — run the game on your own hardware | Game engine, console runtime, assets, platform services | **No** |

They share a title name and nothing else. A working local build would not make Xbox Cloud
Gaming trust a PC, and a trusted cloud identity would not let you run the game locally.

## What assets are, and are not

A model archive gives you geometry, textures and audio. A map gives you level layout. Mission
scripts give you game logic expressed in calls into an engine.

What all of that lacks is the thing that makes it a game: the engine that binds input,
physics, animation, AI, streaming, rendering and scripting into a frame.

A viewer that renders parts of a map is a realistic project. "Playable" is a different
category: the scripts expect engine functions for spawning, cutscenes, checkpoints,
inventory, damage and saving. A replacement has to implement those and match their behaviour.

## What an executable would and would not give

If a genuine console build existed:

- It targets the Xbox OS and its graphics/runtime stack, not Windows.
- Running it on a PC needs a compatibility layer for that platform — a reimplementation
  project, not a launcher.
- Building a substitute executable with AI means writing an engine that satisfies the
  original scripts and content. That is engine-scale work, not a code-generation task.

None of that touches the cloud device gate.

## Why this project does not use leaked material

- It does not answer the question the project asks.
- It cannot be verified or redistributed safely.
- It drags in legal and ethical problems that would discredit the research.

The repository therefore contains no game content, no dumps, and no links to them.

### Static recompilation (2026)

A community project, **Leonida**, is translating the Xbox Series build to run natively on Windows.
Its own status page is explicit: shaders and assets are exported, but **the game does not boot
yet**, the repository ships no game, keys or executable, and it requires the user's own package
with files already readable on disk.

Claims in chat servers about a "playable build" or a dated executable release are ahead of the
repository. Even if it boots, it is an offline local build and does not touch cloud
authentication.

## What would actually help

If the goal is **cloud access to a restricted title on PC**, the useful artifacts are
authentication ones: a console device-auth exchange, a session authorisation decision, a
catalogue rule. See [what-we-need.md](what-we-need.md).

If the goal is **running the game locally**, that is a different project with a different
scope, and this repository is not the place for it.

## Evidence labels for claims in this area

Anything described as "extracted assets", "working PC build" or "executable released" is
**community reported** until independently demonstrated. A screenshot is not a build, and a
game card is not gameplay.
