// Beat 04 — Kinetic Core: bouncing spiked sphere with multi-phase enrage.

import * as THREE from 'three';
import { BossBase, bounceArena } from './base.js';
import { sfx } from '../../audio/synth.js';

export class KineticCore extends BossBase {
    constructor(scene, collisionWorld, center, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.95, 1),
            new THREE.MeshStandardMaterial({
                color: 0x4a5060,
                metalness: 0.7,
                roughness: 0.35,
                emissive: 0x201008,
                emissiveIntensity: 0.5,
            })
        );
        mesh.castShadow = true;
        const weak = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0xffd060,
                emissive: 0xffd060,
                emissiveIntensity: 2.0,
            })
        );
        weak.position.set(0, -0.75, 0);
        mesh.add(weak);

        super(scene, {
            id: 'kinetic_core',
            name: 'Kinetic Core',
            hp: opts.hp || 12,
            hitRadius: 0.95,
            contactDamage: 1,
            contactRadius: 1.45,
            position: { x: center.x, y: 1.2, z: center.z },
            mesh,
            phaseThresholds: [0.55, 0.28],
        });
        this.collisionWorld = collisionWorld;
        this.center = center;
        this.radius = opts.arenaRadius || 8;
        this.weak = weak;
        this.vx = 4.5;
        this.vz = 3.2;
        this.splits = [];
    }

    onPhaseChange(phase) {
        // Speed enrage + optional split orbs
        this.vx *= 1.25;
        this.vz *= 1.25;
        this.contactDamage = phase;
        if (phase === 3 && this.splits.length === 0) {
            for (let i = 0; i < 2; i++) {
                const m = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(0.45, 0),
                    new THREE.MeshStandardMaterial({
                        color: 0x6a7080, metalness: 0.6, emissive: 0xff4020, emissiveIntensity: 1,
                    })
                );
                m.position.copy(this.root.position);
                this.scene.add(m);
                this.splits.push({
                    mesh: m,
                    vx: (i === 0 ? 1 : -1) * 5,
                    vz: (i === 0 ? -1 : 1) * 4,
                });
            }
        }
    }

    tickAI(dt, player) {
        // ── Ricochet, then charge ───────────────────────────────────────────
        // The Core bounces the arena as its resting pattern, but on a timer it
        // stops dead, sights down the line to the player and rams along it,
        // burying itself in the far wall. The wall stuns it: that is the
        // opening, and it is the only one that does not depend on catching the
        // bob at the right instant.
        //
        // Ricochet alone never read the player at all — its whole path was a
        // function of the clock, so there was nothing to dodge and nothing to
        // bait, only a timer to wait out.
        if (this.busy) {
            const a = this.action;
            if (a.stage === 'windup') {
                this.root.rotation.x += dt * 18; // spinning up in place
            } else {
                // Travel the charge over the first slice of the recovery
                // instead of teleporting to the wall. A hit that never occupies
                // the ground between here and there cannot be dodged, blocked,
                // or even seen — it just happens.
                if (this._dash) {
                    const dsh = this._dash;
                    const step = Math.min(dsh.left, 26 * dt);
                    this.root.position.x += dsh.dir.x * step;
                    this.root.position.z += dsh.dir.z * step;
                    dsh.left -= step;
                    this.root.rotation.x += dt * 24;
                    if (player && !player.health?.dead && !dsh.hit) {
                        if (Math.hypot(
                            player.root.position.x - this.root.position.x,
                            player.root.position.z - this.root.position.z
                        ) < 1.6) {
                            player.health.damage(this.phase >= 2 ? 2 : 1, 0.4);
                            dsh.hit = true;
                        }
                    }
                    if (dsh.left <= 0) {
                        this._dash = null;
                        sfx.stomp();
                        const pos = { x: this.root.position.x, z: this.root.position.z };
                        bounceArena(pos, { x: 0, z: 0 }, this.center, this.radius);
                        this.root.position.x = pos.x;
                        this.root.position.z = pos.z;
                    }
                    return;
                }
                this.root.position.y = 0.9;      // slumped against the wall
                this.canHit = true;
                this.shielded = false;
                if (this.weak) this.weak.material.emissiveIntensity = 3.4;
            }
            return;
        }
        if (player && this.actionCd <= 0) {
            const dx = player.root.position.x - this.root.position.x;
            const dz = player.root.position.z - this.root.position.z;
            const n = Math.hypot(dx, dz) || 1;
            const dir = { x: dx / n, z: dz / n };
            this.startAction({
                name: 'charge',
                windup: 0.8,
                recover: this.phase >= 3 ? 1.0 : 1.5,
                cooldown: this.phase >= 3 ? 1.6 : 2.6,
                aim: () => ({
                    x: this.root.position.x, z: this.root.position.z,
                    radius: this.radius * 2, shape: 'line', dir, width: 2.0,
                    color: 0xffa040,
                }),
                onWindup: () => { sfx.whoosh(); },
                strike: () => {
                    // Launch the ram; the dash itself plays out over the
                    // recovery so it crosses real ground the player can leave.
                    this._dash = { dir, left: this.radius * 1.8, hit: false };
                    this.root.position.y = 1.1;
                    // Send it off at a fresh angle once it peels off the wall.
                    const spd = Math.hypot(this.vx, this.vz) || 5;
                    const ang = Math.atan2(-dir.z, -dir.x) + (Math.random() - 0.5);
                    this.vx = Math.cos(ang) * spd;
                    this.vz = Math.sin(ang) * spd;
                },
                onRecover: () => { this.root.position.y = 1.2; },
            });
            return;
        }
        let nx = this.root.position.x + this.vx * dt;
        let nz = this.root.position.z + this.vz * dt;
        const vel = { x: this.vx, z: this.vz };
        const pos = { x: nx, z: nz };
        if (bounceArena(pos, vel, this.center, this.radius)) sfx.block();
        this.vx = vel.x;
        this.vz = vel.z;
        this.root.position.x = pos.x;
        this.root.position.z = pos.z;
        this.root.rotation.x += dt * (3 + this.phase);
        this.root.rotation.z += dt * (2.2 + this.phase * 0.4);
        // Bob exposes underside weak point (gold seam): only hittable near apex of bob
        const bob = Math.sin(this.t * 4) * (0.35 + this.phase * 0.05);
        this.root.position.y = 1.2 + bob;
        // Weak window when bob is high (underside readable from top-down)
        this.canHit = bob > 0.12 || this.phase >= 3;
        this.shielded = !this.canHit;
        if (this.weak) {
            this.weak.material.emissiveIntensity = this.canHit ? 2.8 : 0.6;
        }

        for (const s of this.splits) {
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.z += s.vz * dt;
            const p = { x: s.mesh.position.x, z: s.mesh.position.z };
            const v = { x: s.vx, z: s.vz };
            bounceArena(p, v, this.center, this.radius);
            s.vx = v.x; s.vz = v.z;
            s.mesh.position.x = p.x; s.mesh.position.z = p.z;
            s.mesh.position.y = 1.0;
            s.mesh.rotation.x += dt * 5;
            if (player && !player.health?.dead) {
                if (Math.hypot(
                    player.root.position.x - p.x,
                    player.root.position.z - p.z
                ) < 1.0) {
                    player.health.damage(1, 0.7);
                }
            }
        }
    }

    dispose() {
        for (const s of this.splits) {
            if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
        }
        super.dispose();
    }
}
