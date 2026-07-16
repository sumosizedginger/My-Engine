import { createLevelShell, ABYSS_COLORS } from './_common.js';
import { LeviathanBoss, attachBoss } from '../bosses/index.js';
import { fillBox } from '../../voxel/helpers.js';
import { abyssTint } from '../world/level-builder.js';

export function loadBeat14(ctx) {
    const level = createLevelShell(ctx, {
        id: 'beat-14-leviathan',
        name: '14 Leviathan Core',
        half: 14,
        mood: 'abyss',
        floorColor: 0x0a0814,
        wallColor: ABYSS_COLORS.violet,
        wrap: 0.35,
        banner: 'Leviathan — Phase 1 Core, Phase 2 Loop, Phase 3 Fold. End the OS.',
        stamp(map) {
            abyssTint(map);
            fillBox(map, -3, 3, 1, 1, -3, 3, ABYSS_COLORS.basalt);
            fillBox(map, -10, -8, 1, 2, -10, -8, ABYSS_COLORS.neon || 0x60ffe0);
            fillBox(map, 8, 10, 1, 2, 8, 10, ABYSS_COLORS.neon || 0x60ffe0);
        },
        spawn: { x: 0, y: 1.5, z: 10 },
    });

    level.musicBed = 'leviathan';
    level.story = [
        { speaker: 'LEVIATHAN', text: 'I am the wound that remembers. You are a patch note.' },
        { speaker: 'PREDECESSOR', text: 'Three phases: Core, Loop, Fold. The bright sphere is truth.' },
        { speaker: 'SYSTEM', text: 'Decoys do not bleed. Only the luminous heart ends the recursion.' },
    ];

    const levi = new LeviathanBoss(ctx.scene, { x: 0, y: 2.5, z: 0 });
    attachBoss(level, levi, {
        toast: 'Leviathan Core terminated — the Scar is quiet',
        onDefeat(game) {
            game.unlockAndSave?.('sandbox-combat');
            // B4: collapse cascade → whiteout → ending sequence
            level._collapse = 0.0001;
            level._collapseBurst = 0;
        },
    });

    level.addSystem({
        update(dt, game) {
            if (levi.state.current !== 'DEAD') {
                level.wrap = levi.wrapAmount;
            } else if (level._collapse != null && !level._endingFired) {
                // Collapse: escalating shard bursts + wrap intensity ramp
                level._collapse += dt;
                level.wrap = Math.min(1, 0.35 + level._collapse * 0.22);
                level._collapseBurst -= dt;
                if (level._collapseBurst <= 0 && game.particles?.spawnShard) {
                    level._collapseBurst = Math.max(0.06, 0.25 - level._collapse * 0.05);
                    const bp = levi.root?.position || { x: 0, y: 2.5, z: 0 };
                    const n = 4 + Math.floor(level._collapse * 3);
                    for (let i = 0; i < n; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const r = Math.random() * (1 + level._collapse);
                        game.particles.spawnShard(
                            { x: bp.x + Math.cos(a) * r, y: bp.y + Math.random() * 2, z: bp.z + Math.sin(a) * r },
                            Math.random() < 0.5 ? 0xd4a84b : 0x60ffe0, // kintsugi gold + neon
                            { x: bp.x, y: bp.y, z: bp.z }
                        );
                    }
                }
                if (level._collapse >= 3.2) {
                    level._endingFired = true;
                    level.wrap = 0;
                    game.startEnding?.();
                }
            } else if (!level._collapse && !level._won && levi.state.current === 'DEAD') {
                level._won = true;
                level.wrap = 0;
            }
        },
        dispose() {},
    });

    level.addEnemy({ x: -8, y: 1, z: -8 }, { kind: 'frost', hp: 4, ai: 'ranged' });
    level.addEnemy({ x: 8, y: 1, z: 8 }, { kind: 'sentinel', hp: 4, ai: 'charge' });

    return level;
}
