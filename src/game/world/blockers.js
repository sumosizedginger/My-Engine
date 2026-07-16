// W7: item-gating blocker primitives. Each blocker has two halves:
//   applyBlockerToMap(map, b)          — build-time map edits (LOCAL coords)
//   createBlockerRuntime(ctx, level,   — per-frame behavior, world coords
//                        b, origin)
// Both are driven by room defs (room.blockers) via room-graph bakeRoom, so
// blockers persist/dispose with their room. Broken/cleared state persists as
// 'blocker:<id>' in the owning level's keyStore opened list.
//
// Types:
//   grapple_gap  — floor chasm + far-side anchor post; G pulls across.
//                  Falling in = 1 damage + respawn at the near edge.
//   wedge_crack  — destructible plug only tectonic_wedge damage breaks.
//   boot_ledge   — 2-high barrier; dashing into it with phase_boot hops over.
//   caster_dark  — dark shroud dispelled while light_caster is equipped.

import * as THREE from 'three';
import { fillBox } from '../../voxel/helpers.js';
import { DestructibleVoxelMesh } from './destructible-voxel-mesh.js';
import { meshAndCollide } from './level-builder.js';
import { CRUST_COLORS, ABYSS_COLORS } from '../assets/palettes.js';
import { sfx } from '../../audio/synth.js';

// ── Pure helpers (unit-tested) ─────────────────────────────────────────────

export function insideRect(p, r) {
    return p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1;
}

/** Is the player aiming close enough at the anchor to grapple it? */
export function grappleAimOk(playerPos, facingVec, anchor, reach) {
    const dx = anchor.x - playerPos.x;
    const dz = anchor.z - playerPos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5 || d > reach) return false;
    const dot = (dx / d) * facingVec.x + (dz / d) * facingVec.z;
    return dot > 0.7;
}

/**
 * Where a boot-hop lands: mirrored across the ledge rect along the facing's
 * dominant axis. null when the player isn't up against the rect or isn't
 * moving into it.
 */
export function ledgeHopTarget(rect, p, facing) {
    const pad = 1.1;
    const near = p.x >= rect.x0 - pad && p.x <= rect.x1 + pad
        && p.z >= rect.z0 - pad && p.z <= rect.z1 + pad;
    if (!near) return null;
    const ax = Math.abs(facing.x) >= Math.abs(facing.z) ? 'x' : 'z';
    if (ax === 'x') {
        if (facing.x > 0 && p.x <= rect.x0) return { x: rect.x1 + pad, z: p.z };
        if (facing.x < 0 && p.x >= rect.x1) return { x: rect.x0 - pad, z: p.z };
    } else {
        if (facing.z > 0 && p.z <= rect.z0) return { x: p.x, z: rect.z1 + pad };
        if (facing.z < 0 && p.z >= rect.z1) return { x: p.x, z: rect.z0 - pad };
    }
    return null;
}

// ── Build-time half ────────────────────────────────────────────────────────

export function applyBlockerToMap(map, b) {
    if (b.type === 'grapple_gap') {
        // Carve the chasm: no floor voxels inside the rect
        for (let x = b.rect.x0; x <= b.rect.x1; x++) {
            for (let z = b.rect.z0; z <= b.rect.z1; z++) {
                map.delete(`${x},0,${z}`);
            }
        }
    } else if (b.type === 'boot_ledge') {
        fillBox(map, b.rect.x0, b.rect.x1, 1, 2, b.rect.z0, b.rect.z1,
            b.color || CRUST_COLORS.slateDark);
    }
    // wedge_crack builds its own destructible mesh; caster_dark is runtime-only
}

// ── Runtime half ───────────────────────────────────────────────────────────

export function createBlockerRuntime(ctx, level, b, origin = { x: 0, z: 0 }) {
    const W = (local) => ({ x: origin.x + local.x, z: origin.z + local.z });
    const rectW = b.rect ? {
        x0: origin.x + b.rect.x0, x1: origin.x + b.rect.x1 + 1,
        z0: origin.z + b.rect.z0, z1: origin.z + b.rect.z1 + 1,
    } : null;
    const persistId = `blocker:${b.id}`;
    const isCleared = () => level.keyStore?.isOpen?.(persistId) === true;

    if (b.type === 'grapple_gap') {
        // Far-side anchor post (solid 1×3 column, grapple target at its top)
        const anchorW = W(b.anchor);
        const postMap = new Map();
        fillBox(postMap, 0, 0, 1, 3, 0, 0, ABYSS_COLORS.goldVein);
        const post = meshAndCollide(postMap, ctx.scene, ctx.collisionWorld, {
            origin: { x: anchorW.x, y: 0, z: anchorW.z },
            solidPrefix: `blk:${b.id}:post`,
        });
        const edgeW = W(b.edge);
        return {
            update(dt, game) {
                const player = game.player;
                const p = player.root.position;
                // Fall catch: inside the chasm below floor level
                if (insideRect(p, rectW) && p.y < 1.2 && !player.grapple.active) {
                    player.rig.position.set(edgeW.x, 1.95, edgeW.z);
                    player.physics.resetVelocity();
                    player.physics.grounded = true;
                    player.health.damage(1, 0.6);
                    game.hud?.toast?.('The gap bites — find another way across', 1400);
                    return;
                }
                // Grapple assist: aim at the anchor and pull across
                if (player.grapple.active) return;
                const reach = (player.grappleRange || 8) + 2;
                const hasGrapple = player.inventory.hasItem('magnetic_grapple');
                const anchorTarget = { x: anchorW.x + 0.5, y: p.y, z: anchorW.z + 0.5 };
                if (grappleAimOk(p, player.state.facingVec, anchorTarget, reach)) {
                    if (game.input?.consumeGrapple?.()) {
                        if (!hasGrapple) {
                            game.hud?.toast?.('Needs the Magnetic Grapple', 1200);
                            return;
                        }
                        player.grapple.start(p, anchorTarget, 12);
                        sfx.whoosh?.();
                    }
                }
            },
            dispose() { post.dispose(); },
        };
    }

    if (b.type === 'wedge_crack') {
        if (isCleared()) return null;
        const crackMap = new Map();
        fillBox(crackMap, 0, b.w || 2, 1, b.h || 2, 0, 0, b.color || CRUST_COLORS.rust);
        const pos = W(b.at);
        const dest = new DestructibleVoxelMesh(
            crackMap,
            new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
            ctx.particles,
            ctx.collisionWorld,
            `blk:${b.id}:crack`,
            { origin: { x: pos.x, y: 0.5, z: pos.z }, scene: ctx.scene, voxelSize: 0.5 }
        );
        // Weapon filter: only Tectonic Wedge damage breaks the crack
        const wrapper = {
            shatterAtWorld(x, y, z, r) {
                const active = ctx.player?.inventory?.activeWeapon;
                if (active !== 'tectonic_wedge') {
                    level._game?.hud?.toast?.('Too dense — needs the Tectonic Wedge', 1200);
                    return 0;
                }
                const n = dest.shatterAtWorld(x, y, z, Math.max(r, 3));
                if (n > 0) {
                    level.keyStore?.open?.(persistId);
                    sfx.shatter?.();
                }
                return n;
            },
        };
        level.destructibles.push(wrapper);
        return {
            update() {},
            dispose() {
                const i = level.destructibles.indexOf(wrapper);
                if (i >= 0) level.destructibles.splice(i, 1);
                dest.dispose();
            },
        };
    }

    if (b.type === 'boot_ledge') {
        return {
            update(dt, game) {
                const player = game.player;
                if (player.dashTimer <= 0) return;
                if (!player.inventory.hasItem('phase_boot')) return;
                const p = player.root.position;
                const local = { x: p.x - origin.x, z: p.z - origin.z };
                const hop = ledgeHopTarget(
                    { x0: b.rect.x0, x1: b.rect.x1 + 1, z0: b.rect.z0, z1: b.rect.z1 + 1 },
                    local, player.state.facingVec
                );
                if (hop) {
                    player.rig.position.set(origin.x + hop.x, 2.6, origin.z + hop.z);
                    player.physics.resetVelocity();
                    player.physics.grounded = false; // land on the far side
                    player.dashTimer = 0;
                    sfx.dash?.();
                }
            },
            dispose() {},
        };
    }

    if (b.type === 'caster_dark') {
        const shroud = new THREE.Mesh(
            new THREE.PlaneGeometry(rectW.x1 - rectW.x0, rectW.z1 - rectW.z0),
            new THREE.MeshBasicMaterial({
                color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false,
            })
        );
        shroud.rotation.x = -Math.PI / 2;
        shroud.position.set((rectW.x0 + rectW.x1) / 2, 2.4, (rectW.z0 + rectW.z1) / 2);
        ctx.scene.add(shroud);
        return {
            update(dt, game) {
                const p = game.player.root.position;
                const cx = shroud.position.x, cz = shroud.position.z;
                const near = Math.hypot(p.x - cx, p.z - cz) < 6;
                const lit = near && game.player.inventory.activeWeapon === 'light_caster';
                const target = lit ? 0 : 0.85;
                shroud.material.opacity += (target - shroud.material.opacity)
                    * Math.min(1, dt * 5);
            },
            dispose() {
                if (shroud.parent) shroud.parent.remove(shroud);
                shroud.geometry.dispose();
                shroud.material.dispose();
            },
        };
    }

    return null;
}
