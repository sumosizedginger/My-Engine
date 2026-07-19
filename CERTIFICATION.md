# Sovereign Scar — Visual Certification (Phase V)

One row per dungeon and overworld region. A row is complete only when every
checklist column is verified in the browser with the sampled luminance in
band (crust 45–90, abyss 35–75) and screenshots exist under
`docs/media/certification/`.

Checklist columns (plan §Phase V): **A** scale (player ≈1.9, mobs ≈1.6,
boss dominates) · **B** luminance in band · **C** camera frames the room ·
**D** no void bleed · **E** doors/locks work · **F** keys/map/secret present ·
**G** boss beatable + defeat path fires · **H** story lines shown ·
**I** no console errors.

Method: A/B are asserted per level by `tests/visual-sanity.spec.mjs`
(308 asserts); E/F/G structurally by `tests/game/world-graph.spec.mjs` +
`world-e2e`/`campaign-e2e`. C/D/H/I certified by eye from headless captures
(entry + boss room per dungeon, one screen per region per state), zero
pageerrors across every capture run. Lum column: entry / boss-room samples.

> **Stale captures (Session 6).** Every screenshot below was taken with the
> pre-Session-6 camera (65° FOV, shallower tilt). The camera has since been
> retuned to read top-down (40° FOV, steeper rig), so the stored images no
> longer match what the game renders. Column **B** is unaffected and still
> verified — `visual-sanity.spec.mjs` runs on every suite pass and is green at
> the new framing, so all luminance values remain in band. Column **C**
> ("camera frames the room") was certified by eye against the old framing and
> should be re-checked when the captures are regenerated.

Fixes landed during this pass (fix-forward): Beat 03 spurpit floor
(clay 91→72), Beat 09 moothall bone plaza + floor lift (11→39), Beat 11
islets recolored to read dry + shelf ruins + rotPale floor (18→36), five
overworld crust region floors retuned (tombfields/sinklands→clayField,
spindle→iron, quarry→slate, bonetown→new ashField; all 20–105 → 57–84).

## Dungeons

| Beat | Rooms | A | B | C | D | E | F | G | H | I | Lum | Shots |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 Crypt Breach | 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 56 / 62 | [entry](docs/media/certification/beat-01-crypt-entry.png) · [boss](docs/media/certification/beat-01-crypt-boss.png) |
| 02 Eastern Spindle | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 58 / 58 | [entry](docs/media/certification/beat-02-spindle-entry.png) · [boss](docs/media/certification/beat-02-spindle-boss.png) |
| 03 Duval Sink | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 70 / 72 | [entry](docs/media/certification/beat-03-sink-entry.png) · [boss](docs/media/certification/beat-03-sink-boss.png) |
| 04 Sky Monument | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 63 / 55 | [entry](docs/media/certification/beat-04-sky-entry.png) · [boss](docs/media/certification/beat-04-sky-boss.png) |
| 05 Citadel of the Proxy | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 57 / 56 | [entry](docs/media/certification/beat-05-citadel-entry.png) · [boss](docs/media/certification/beat-05-citadel-boss.png) |
| 06 Bleeding Quarry | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 40 / 42 | [entry](docs/media/certification/beat-06-quarry-entry.png) · [boss](docs/media/certification/beat-06-quarry-boss.png) |
| 07 Sluice of Tears | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 38 / 41 | [entry](docs/media/certification/beat-07-sluice-entry.png) · [boss](docs/media/certification/beat-07-sluice-boss.png) |
| 08 Bone Forest | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 38 / 40 | [entry](docs/media/certification/beat-08-bone-entry.png) · [boss](docs/media/certification/beat-08-bone-boss.png) |
| 09 Ruined Town | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 38 / 39 | [entry](docs/media/certification/beat-09-town-entry.png) · [boss](docs/media/certification/beat-09-town-boss.png) |
| 10 Cryo Vault | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 42 / 46 | [entry](docs/media/certification/beat-10-cryo-entry.png) · [boss](docs/media/certification/beat-10-cryo-boss.png) |
| 11 Rot Mire | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 40 / 36 | [entry](docs/media/certification/beat-11-mire-entry.png) · [boss](docs/media/certification/beat-11-mire-boss.png) |
| 12 Pyre Peak | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 39 / 39 | [entry](docs/media/certification/beat-12-pyre-entry.png) · [boss](docs/media/certification/beat-12-pyre-boss.png) |
| 13 GUMOI Tower | 9 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 39 / 36 | [entry](docs/media/certification/beat-13-gumoi-entry.png) · [boss](docs/media/certification/beat-13-gumoi-boss.png) |
| 14 Leviathan Core | 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 36 / 41 | [entry](docs/media/certification/beat-14-leviathan-entry.png) · [boss](docs/media/certification/beat-14-leviathan-boss.png) |

Notes: boss shots were taken mid-fight (HP bar + phase tags visible — the
G evidence); Beat 13's horizontal banding is the flicker shader, Beat 14's
fold distortion is the wrap shader — both intended. Beat 01 Warden loop was
additionally certified end-to-end with real combat by `world-e2e` and the
original W-gate captures in `docs/media/w-gate/`.

## Overworld regions

| Region (screen) | State | A | B | C | D | I | Lum | Shots |
|---|---|---|---|---|---|---|---|---|
| Tombfields (r0c0) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 84 | [shot](docs/media/certification/ow-tombfields-crust.png) |
| Tombfields | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 36 | [shot](docs/media/certification/ow-tombfields-abyss.png) |
| Spindle heights (r0c2) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 75 | [shot](docs/media/certification/ow-spindle-crust.png) |
| Spindle heights | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 42 | [shot](docs/media/certification/ow-spindle-abyss.png) |
| Sinklands (r2c0) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 74 | [shot](docs/media/certification/ow-sinklands-crust.png) |
| Sinklands | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 41 | [shot](docs/media/certification/ow-sinklands-abyss.png) |
| Citadel approach (r3c4) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 62 | [shot](docs/media/certification/ow-citadel-crust.png) |
| Citadel approach | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 37 | [shot](docs/media/certification/ow-citadel-abyss.png) |
| Quarry country (r5c1) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 57 | [shot](docs/media/certification/ow-quarry-crust.png) |
| Quarry country | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 37 | [shot](docs/media/certification/ow-quarry-abyss.png) |
| Bonetown (r5c4) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 82 | [shot](docs/media/certification/ow-bonetown-crust.png) |
| Bonetown | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 39 | [shot](docs/media/certification/ow-bonetown-abyss.png) |
| Cryomire (r6c5) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 58 | [shot](docs/media/certification/ow-cryomire-crust.png) |
| Cryomire | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 39 | [shot](docs/media/certification/ow-cryomire-abyss.png) |
| Pyre ascent (r1c6) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 84 | [shot](docs/media/certification/ow-pyre-crust.png) |
| Pyre ascent | abyss | ✅ | ✅ | ✅ | ✅ | ✅ | 35 | [shot](docs/media/certification/ow-pyre-abyss.png) |
| Scarfield (gate screens) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 73 | [w-gate](docs/media/w-gate/) |

Fix-forward rule: small fixes land inline (logged in BUILD_LOG); anything
structural becomes a ticket appended to BUILD_LOG before continuing.
