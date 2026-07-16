// W4: overworld — screens on the same 64-unit world grid, built on the
// room-graph machinery (a screen is a room with partial borders modeled as
// wide edge doors). One registry entry; internal screen management.

import { createDungeon, doorCells } from '../world/room-graph.js';
import { getOverworldState, patchOverworld, markScreenVisited } from '../world/keys.js';
import { CRUST_COLORS, ABYSS_COLORS } from '../assets/palettes.js';
import { fillBox } from '../../voxel/helpers.js';
import { sfx } from '../../audio/synth.js';

export const SCREEN_HALF = 23; // 47×47 cells ≈ the plan's 48-unit screens

/**
 * Turn a screens definition into a dungeon def the room-graph can run.
 * Screen def shape (screens.js): {
 *   start: 'r0c0',
 *   screens: { 'r0c0': {
 *     grid: [sx, sy],
 *     edges: [{ to, side, at?, width? }],   // open border gaps
 *     build(map, h),                        // terrain, LOCAL coords
 *     entrances: [{ x, z, to, label }],     // dungeon doors (E to enter)
 *     spawn: { x, z },
 *   } }
 * }
 */
export function createOverworld(ctx, screensDef, opts = {}) {
    const saved = getOverworldState();
    const mood = saved.state === 'abyss' ? 'abyss' : 'crust';
    const startScreen = (saved.pos && screensDef.screens[saved.pos.screen])
        ? saved.pos.screen
        : screensDef.start;

    const rooms = {};
    for (const [sid, s] of Object.entries(screensDef.screens)) {
        rooms[sid] = {
            grid: s.grid,
            half: SCREEN_HALF,
            wallH: 2, // low border cliffs
            spawn: s.spawn || { x: 0, z: 0 },
            floorColor: mood === 'abyss' ? ABYSS_COLORS.abyssFloor : CRUST_COLORS.clayDark,
            wallColor: mood === 'abyss' ? ABYSS_COLORS.abyssWall : CRUST_COLORS.slate,
            doors: (s.edges || []).map((e) => ({
                to: e.to,
                side: e.side,
                at: e.at || 0,
                width: e.width || 12,
                type: 'open',
            })),
            build(map, h) {
                // Entrance arches: two pillars + lintel per dungeon door
                for (const en of s.entrances || []) {
                    fillBox(map, en.x - 2, en.x - 2, 1, 4, en.z, en.z, CRUST_COLORS.goldLeaf);
                    fillBox(map, en.x + 2, en.x + 2, 1, 4, en.z, en.z, CRUST_COLORS.goldLeaf);
                    fillBox(map, en.x - 2, en.x + 2, 4, 4, en.z, en.z, CRUST_COLORS.goldLeaf);
                }
                if (s.build) s.build(map, h);
            },
            enemies: s.enemies || [],
        };
    }

    const def = {
        id: 'overworld',
        name: screensDef.name || 'The Scarred Crust',
        mood,
        start: startScreen,
        banner: screensDef.banner || 'The Scarred Crust — find the wounds',
        rooms,
        onUpdate(dt, game, level) {
            // Dungeon entrances: stand in the arch + interact
            const sid = level.currentRoomId();
            const s = screensDef.screens[sid];
            if (!s || !s.entrances || level.isTransitioning()) return;
            const room = rooms[sid];
            const ox = room.grid[0] * 64, oz = room.grid[1] * 64;
            const p = game.player.root.position;
            for (const en of s.entrances) {
                const d = Math.hypot(p.x - (ox + en.x), p.z - (oz + en.z));
                if (d < 1.6) {
                    if (!en._hinted) {
                        en._hinted = true;
                        game.hud?.toast?.(`E — enter ${en.label || en.to}`, 1600);
                    }
                    if (game.input?.consumeInteract?.()) {
                        // Remember where we are so the dungeon exit returns here
                        patchOverworld({
                            pos: { screen: sid, x: en.x, z: en.z + 2 },
                        });
                        sfx.heave?.();
                        game.loadLevel?.(en.to);
                        return;
                    }
                }
            }
        },
    };

    const level = createDungeon(ctx, def, opts);

    // Restore exact position when returning mid-screen
    if (saved.pos && saved.pos.screen === startScreen) {
        const room = rooms[startScreen];
        level.spawn = {
            x: room.grid[0] * 64 + saved.pos.x,
            y: 1.95,
            z: room.grid[1] * 64 + saved.pos.z,
        };
    }

    // Save position on every screen transition (natural checkpoint) and
    // track visited screens for the map (W6).
    level.onRoomEnter = (sid, game) => {
        markScreenVisited(sid);
        if (game) {
            const room = rooms[sid];
            const p = game.player.root.position;
            patchOverworld({
                pos: {
                    screen: sid,
                    x: p.x - room.grid[0] * 64,
                    z: p.z - room.grid[1] * 64,
                },
            });
        }
    };

    return level;
}
