# SPECTER

**A tactical 5v5 first-person shooter built from scratch in Three.js.**
*Every shadow has a price.*

### ▶ [**Play it live**](https://noahkhetani.github.io/specter/)

> Runs entirely in your browser — click to lock the mouse, pick an agent, and Lock In.

SPECTER is an original, browser-based tactical shooter inspired by the round-based, ability-driven competitive FPS genre. Attackers must plant the Spike; defenders must stop them. Buy your loadout each round, use your agent's abilities to take space, and aim for first to 13.

---

## Features

### Core Gameplay
- **First-person controller** — WASD movement with run/walk/crouch speed tiers, jumping, gravity, swept AABB collision, view-bob, and footstep audio
- **Round-based match flow** — buy phase → action phase → round end, first team to **13 rounds** wins, with automatic **side swap at halftime**
- **Spike (bomb) system** — pick up, plant on A/B site (hold to plant), 45-second detonation timer, defuse with half-defuse checkpoint, and a radius explosion
- **Economy** — credits from kills, plants, round wins, and a **loss-streak bonus** system; spend in the buy menu on weapons, shields, and abilities
- **Win conditions** — elimination, spike detonation, spike defuse, and time expiry

### Combat
- **18 weapons** across 7 classes (pistols, SMGs, shotguns, rifles, snipers, machine guns, melee) — each with distinct damage profiles, fire rates, magazines, and wall-penetration tiers
- **Spray-pattern recoil** — every weapon has its own recoil curve; control it for accuracy
- **Hitbox-accurate damage** — separate **head / body / leg** zones with headshot multipliers
- **Shields** — light and heavy armor that absorb incoming damage
- **ADS / scoping** — snipers get scope zoom; rifles tighten on aim
- Hit markers, kill feed, blood/impact particles, bullet tracers, muzzle flashes, and bullet decals

### Agents & Abilities
Five original agents across all four roles (**Duelist, Initiator, Controller, Sentinel**), each with 3 abilities + a charged **Ultimate**:

| Agent | Role | Signature |
|-------|------|-----------|
| **SWIFT** | Duelist | Tailwind dash, smokes, updraft, Blade Storm ult |
| **PHANTOM** | Initiator | Recon bolt, shock bolt, scout drone, Hunter's Fury ult |
| **VEIL** | Controller | Shrouded teleport, blinding orb, deployable smokes, shadow-teleport ult |
| **GUARD** | Sentinel | Ice wall, slow orb, self-heal, Resurrection ult |
| **BLAZE** | Duelist | Fire wall, curveball flash, healing fireball, Run-It-Back ult |

Smokes block bot line-of-sight, flashes blind, walls become real collision geometry, slow zones reduce movement speed.

### AI
- **9 bots** (4 teammates + 5 enemies) with a full state machine: patrol → push/defend objective → chase → combat
- Line-of-sight + FOV vision checks, smoke occlusion, reaction delay, strafing, accuracy/difficulty rolls, and bots that pick up and plant the Spike

### UI / Presentation
- Main menu, animated loading screen, and an **agent-select** screen
- Full combat HUD: health/armor, ammo, ability charges + ult meter, round timer, score, credits
- **Buy menu** with weapon stat comparisons and category filtering
- **Scoreboard** (hold Tab) with live K/D/A and credits
- **Minimap** with site markers, player view-cone, spike location, and revealed enemies
- Procedural Web Audio sound effects (gunfire, reloads, abilities, spike beeps, round stingers) — no audio assets required
- Custom **VERTEX** map: two bomb sites, mid control, links, spawns, cover boxes, and ultimate orbs

---

## Running

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:3000`). Click to lock the mouse and play.

Build for production:

```bash
npm run build
npm run preview
```

---

## Controls

| Input | Action |
|-------|--------|
| **WASD** | Move |
| **Shift** | Walk (silent) |
| **Ctrl** | Crouch |
| **Space** | Jump |
| **Mouse** | Look |
| **Left Click** | Fire |
| **Right Click** | Aim / Scope |
| **R** | Reload |
| **1 / 2 / 3** | Primary / Sidearm / Knife |
| **C / Q / E** | Abilities |
| **X** | Ultimate |
| **4 or F** | Plant / Defuse / Pick up Spike |
| **B** | Buy menu (during buy phase) |
| **Tab** | Scoreboard |
| **Esc** | Close menus |

---

## Tech

- **Three.js** for all 3D rendering (procedural geometry — no external models or textures)
- **Vanilla ES modules** + **Vite** dev/build tooling
- **Web Audio API** for fully procedural sound
- Zero gameplay assets — the entire game (map, weapons, agents, audio) is generated in code

## Architecture

```
src/
  main.js              Game orchestrator, loop, menus, agent select
  core/                EventBus, InputManager, AudioManager
  config/              weapons.js, agents.js (data)
  map/                 MapSystem (VERTEX map + lighting)
  entities/            Player, Bot (AI)
  weapons/             WeaponSystem (firing/recoil), WeaponModel (viewmodels)
  abilities/           AbilitySystem (smokes, flashes, walls, ults...)
  effects/             ParticleSystem
  game/                GameManager (rounds/economy), Spike
  ui/                  HUD, BuyMenu, Scoreboard, Minimap
```

---

*SPECTER is an original work. All agents, weapons, map, and code are original creations and not affiliated with any existing game.*
