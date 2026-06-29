# Khyack's Run

A 3D chase endless runner inspired by Nepali folk creatures — **Khyack**, **Lakhay**, and **Yeti**.

Built with **Three.js** and **Vite** for immediate browser play. No Unity install required.

## Game Flow

1. **Bedroom intro** — Wake to a bang, open the door, descend the staircase
2. **Khyack encounter** — The Newari folk creature drags you into the chase
3. **New Road (Urban)** — Flee the **Lakhay** through a Kathmandu-inspired street
4. **Transition** — Environment shifts from city to mountains
5. **Himalayan Pass** — Endless run from the **Yeti** with escalating difficulty

## Controls

| Input | Action |
|-------|--------|
| `A` / `←` | Move left lane |
| `D` / `→` | Move right lane |
| `W` / `↑` / `Space` | Jump |
| `S` / `↓` | Slide |
| Swipe (mobile) | Lane change / jump / slide |
| `Enter` | Confirm (intro sequences) |

## Obstacle Types

- **Barriers** — Jump over
- **Low obstacles** — Slide under
- **Tall obstacles** — Jump or switch lanes
- **Gaps** — Jump to cross
- **Yeti rocks** — Telegraph thrown projectiles; jump or dodge

## Playable MVP Features

- Scripted intro: bedroom → door → staircase → Khyack grab
- 3-lane endless runner with jump, slide, and stumble on hit
- **Lakhay** pursuer on urban New Road (~600m segment) with lunge telegraphs
- Biome transition to Himalayan mountains
- **Yeti** pursuer with roar and rock-throw attacks
- Procedural chunk spawning with obstacle types (barrier, low, tall, gap)
- Folklore token collectibles, score multiplier, proximity HUD
- Procedural Web Audio SFX (bang, jump, hit, roar, caught)
- Game over screen with restart

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── main.js                 Entry point
├── game/
│   ├── Game.js             State machine & main loop
│   ├── Player.js           Lane runner controller
│   ├── Pursuer.js          Lakhay / Yeti chase AI
│   ├── ChunkSpawner.js     Procedural track & obstacles
│   ├── DifficultyManager.js
│   ├── InputManager.js
│   ├── AudioManager.js     Procedural Web Audio SFX
│   ├── CameraController.js
│   └── HUD.js
├── scenes/
│   └── IntroSequence.js    Bedroom → staircase → Khyack
└── utils/
    └── constants.js        Tuning data & biome configs
```

## Future (Unity Port)

This web MVP implements the core design spec from the planning document. For a production Unity build:

- Port `PursuerProfile` ScriptableObjects from `constants.js`
- Replace chunk spawner with prefab socket system
- Add authored character models and Nepali environmental art
- Integrate FMOD/Wwise for ambient audio

## License

MIT
