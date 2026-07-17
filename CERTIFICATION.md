# Sovereign Scar — Visual Certification (Phase V)

One row per dungeon and overworld region. A row is complete only when every
checklist column is verified in the browser with overlays on, the sampled
luminance is in band (crust 45–90, abyss 35–75), and screenshots exist under
`docs/media/certification/`.

Checklist columns (plan §Phase V): **A** scale (player ≈1.9, mobs ≈1.6,
boss dominates) · **B** luminance in band · **C** camera frames the room ·
**D** no void bleed · **E** doors/locks work · **F** keys/map/secret present ·
**G** boss beatable + defeat path fires · **H** story lines shown ·
**I** no console errors.

Automated coverage: A/B are asserted per level by `tests/visual-sanity.spec.mjs`;
E/F/G structurally by `tests/game/world-graph.spec.mjs` + `world-e2e`/
`campaign-e2e`. The rows below record the by-eye pass.

## Dungeons

| Beat | Rooms | A | B | C | D | E | F | G | H | I | Lum | Shots |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 Crypt Breach | 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 54.6 | [w-gate](docs/media/w-gate/) |
| 02 Eastern Spindle | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 03 Duval Sink | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 04 Sky Monument | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 05 Citadel of the Proxy | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 06 Bleeding Quarry | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 07 Sluice of Tears | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 08 Bone Forest | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 09 Ruined Town | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 10 Cryo Vault | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 11 Rot Mire | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 12 Pyre Peak | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 13 GUMOI Tower | 8 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |
| 14 Leviathan Core | 6 | auto | auto | — | — | auto | auto | auto | — | — | pending | pending |

## Overworld regions

| Region (screens) | State | A | B | C | D | I | Lum | Shots |
|---|---|---|---|---|---|---|---|---|
| Tombfields (r0c0–r2c1) | crust | — | — | — | — | — | pending | pending |
| Tombfields | abyss | — | — | — | — | — | pending | pending |
| Spindle heights | crust | — | — | — | — | — | pending | pending |
| Spindle heights | abyss | — | — | — | — | — | pending | pending |
| Sinklands | crust | — | — | — | — | — | pending | pending |
| Sinklands | abyss | — | — | — | — | — | pending | pending |
| Citadel approach | crust | — | — | — | — | — | pending | pending |
| Citadel approach | abyss | — | — | — | — | — | pending | pending |
| Quarry country | crust | — | — | — | — | — | pending | pending |
| Quarry country | abyss | — | — | — | — | — | pending | pending |
| Bonetown | crust | — | — | — | — | — | pending | pending |
| Bonetown | abyss | — | — | — | — | — | pending | pending |
| Cryomire | crust | — | — | — | — | — | pending | pending |
| Cryomire | abyss | — | — | — | — | — | pending | pending |
| Pyre ascent | crust | — | — | — | — | — | pending | pending |
| Pyre ascent | abyss | — | — | — | — | — | pending | pending |
| Scarfield (gate screens) | crust | ✅ | ✅ | ✅ | ✅ | ✅ | 57 | [w-gate](docs/media/w-gate/) |

Fix-forward rule: small fixes land inline (logged in BUILD_LOG); anything
structural becomes a ticket appended to BUILD_LOG before continuing.
