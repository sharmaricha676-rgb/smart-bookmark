# Smart Bookmark

An immersive, scroll-driven 3D experience built with React, Vite, Three.js and React Three Fiber.

The whole thing is one continuous camera move through a single 3D world. There are no pages and
no sections that snap — scrolling drives one normalised progress value from `0` to `1`, and the
camera, lighting, fog, objects, particles and copy are all functions of that number.

---

## Running it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
npm run verify    # sanity-check the timeline (no browser needed)
```

`npm run verify` executes `scripts/verify-timeline.mjs` against the real timeline and challenge
modules — both are pure ES modules with no Three.js or DOM dependency, so the spine of the whole
experience can be checked in plain Node. It asserts that the scene windows are contiguous, that the
camera mapping is monotonic and free of discontinuities, that every keyframe lands on the progress it
was authored for, that the gate sits inside the challenge, and that the challenge has exactly one
answer with non-overlapping hit-zones that fall inside the page.

Requires **Node 18.18 or newer** and a browser with WebGL 2. Nothing else — there are no API keys,
environment variables or binary assets.

If something goes wrong it will say so on screen rather than showing a black page: a missing WebGL
context and any error thrown inside the 3D stage both render a readable card, with the full stack
trace in the console.

> **Note on the first install:** the project was authored in a sandbox whose network policy blocks
> `registry.npmjs.org` and every package CDN, so `npm install` could not be executed there. Nothing
> in the source depends on that environment — run the two commands above on any normal machine.

---

## The journey

Progress windows are defined in one place, `src/lib/timeline.js`, and everything else reads them.

| #   | Scene         | Progress        | What happens                                                                                         |
| --- | ------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | The Library   | `0.00 – 0.135`  | A reading room at dusk. Dust in the window light, a lamp, an open book with a bookmark in it.        |
| 2   | The Problem   | `0.135 – 0.30`  | The camera goes _into_ the page. Losing your place, forgetting, scattered notes — staged as objects. |
| 3   | Activation    | `0.30 – 0.445`  | Everything settles. The bookmark rises, turns once, charges, and projects its readouts.              |
| 4   | Capabilities  | `0.445 – 0.685` | Six installations in a dark corridor, each with a working demonstration.                             |
| 5   | The Challenge | `0.685 – 0.79`  | A real mini-game: find the passage's main idea. Scroll is gated until it is solved or skipped.       |
| 6   | Impact        | `0.79 – 0.90`   | The camera climbs and one desk becomes a hall of readers, linked by light.                           |
| 7   | Remember      | `0.90 – 1.00`   | Back to the object alone, the two closing lines, and **Explore Again**.                              |

### The reading challenge

Scene 5 is genuinely interactive. Six lines of the printed passage are clickable bands on the 3D
page:

- **Correct** → the line turns gold, a ring pulses out, and the bookmark flies in and clips onto it.
- **Incorrect** → that line shudders red and you get a specific reason why it is not the main idea,
  then you can try again immediately.
- After two misses the correct line begins breathing very faintly — a nudge, not an answer.
- **Skip and continue** is always available.

The page is only tall enough to reach the challenge until it is resolved, so the gate is enforced by
the document height rather than by fighting the user's scrolling. No snapping, no jitter.

---

## How it is put together

```
src/
├── main.jsx                  entry
├── App.jsx                   composition: canvas + overlay + loader + scroll spacer
├── lib/
│   ├── timeline.js           scenes, camera keyframes, lighting moods, world anchors
│   ├── scroll.js             the shared progress value and one rAF loop
│   ├── math.js               clamp / range / damp / easing / seeded random
│   └── textures.js           every texture in the project, drawn on a 2D canvas
├── state/store.js            coarse React state (zustand) — never per-frame
├── hooks/
│   ├── useSmoothScroll.js    Lenis + the challenge gate + reset tween
│   ├── usePointer.js         damped pointer, with device-tilt fallback
│   └── useTier.js            device tier detection and quality presets
├── three/
│   ├── Experience.jsx        the Canvas and the world
│   ├── CameraRig.jsx         keyframes → Catmull-Rom path → camera
│   ├── Atmosphere.jsx        fog / ambient cross-fade, environment rig
│   ├── Effects.jsx           bloom, DOF, chromatic aberration, grain, vignette
│   ├── SafeEffects.jsx       error boundary around the post pipeline
│   ├── objects/              Book, Bookmark, Shelves, Dust, HoloPanel, useReveal
│   └── scenes/               one file per scene, plus features/demos.jsx
└── ui/                       Overlay, SceneCopy, ProgressRail, ChallengeUI, FinaleUI, Loader
```

Scene code and UI code never import each other. Nothing in `three/` touches the DOM; nothing in
`ui/` imports Three.js.

### Why scrolling feels continuous

- **One curve, not a list of stops.** Camera keyframes in `timeline.js` are laid on a
  `CatmullRomCurve3`, with a piecewise mapping from progress to curve parameter. The path stays
  C1-continuous, so the camera is always already moving when it arrives at a shot.
- **Overlapping scenes.** Every scene is mounted for the whole session and hides itself when the
  camera is nowhere near. Their windows overlap at the seams — the library is still fading in the fog
  while the page tunnel is already forming ahead.
- **Fog does the transitions.** Fog colour and density are cross-faded along the timeline. Because
  the far end of every scene dissolves into fog, moving the fog is what makes one environment
  _become_ the next instead of cutting to it.
- **Two layers of damping.** Lenis smooths the input; `scroll.smooth` damps again on top. Camera
  position and target are then damped independently, so the aim trails the move very slightly.

### Why it stays fast

- **No React renders while scrolling.** Scroll lives in a plain mutable object. The scene reads it in
  `useFrame`, the overlay reads it in one shared `requestAnimationFrame` loop that writes straight to
  the DOM. Zustand only holds things that change rarely (tier, game state, scene index).
- **Instancing everywhere it counts.** A full bookcase wall is three draw calls; the impact hall —
  the widest shot in the piece — is four.
- **Particles run on the GPU.** Dust and the activation motes are animated in the vertex shader, so
  the 1 400-particle desktop field costs nothing on the CPU.
- **Raycasting is opt-in.** Every decorative mesh sets `raycast={() => null}`, so pointer events only
  test the handful of objects that are actually interactive.
- **No binary assets.** Every page, cover, label, panel and particle sprite is drawn to a canvas at
  runtime and cached, so there is nothing to download and text is crisp at any pixel ratio.

---

## Responsive behaviour

Tier is chosen from viewport width, pointer type, core count, device memory and
`prefers-reduced-motion` (see `src/hooks/useTier.js`). The story, the camera path and every
interaction are identical on all three — only counts and effect passes change.

|                 | Desktop (`high`) | Tablet (`mid`) | Mobile (`low`) |
| --------------- | ---------------- | -------------- | -------------- |
| Pixel ratio     | up to 2          | up to 1.6      | up to 1.4      |
| Dust particles  | 1400             | 700            | 320            |
| Library books   | 1100             | 620            | 300            |
| Depth of field  | yes              | no             | no             |
| Film grain      | yes              | no             | no             |
| Shadows         | yes              | yes            | no             |
| Post-processing | yes              | yes            | off            |

On touch devices the pointer parallax falls back to device orientation, and to neutral if neither is
available — nothing in the experience assumes a mouse exists.

---

## Tuning it

Almost all direction lives in `src/lib/timeline.js`:

- **Re-time a scene** — edit `SCENES` and the matching copy windows in `src/ui/Overlay.jsx`.
- **Re-shoot the camera** — edit `CAMERA_KEYS`. Each entry is `{ p, pos, look, roll, fov }`; the
  curve and the progress mapping rebuild themselves.
- **Change the mood** — edit `MOODS` (fog colour, fog density, ambient colour and intensity).
- **Move the world** — `ANCHORS` holds the world position of every scene, shared by scenes and camera
  so the two can never drift apart.
- **Change the pace** — `SCROLL_VIEWPORTS` is how many screens of scrolling the journey takes.
- **Rewrite the challenge** — `CHALLENGE_LINES` in `src/lib/textures.js`. Set `correct: true` on one
  line and give every other line a `note` explaining why it is not the main idea. The 3D hit-zones
  are derived from the same layout constants that draw the page, so they always line up.

## Credits

Built with [React Three Fiber](https://github.com/pmndrs/react-three-fiber),
[drei](https://github.com/pmndrs/drei), [postprocessing](https://github.com/pmndrs/postprocessing),
[Lenis](https://github.com/darkroomengineering/lenis) and [GSAP](https://gsap.com).
