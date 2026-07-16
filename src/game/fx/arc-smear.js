// C8: top-down attack smear that follows the TRUE 8-way facing vector.
// The engine smear (src/engine/smear.js) is authored for side-view ±X facing;
// rather than patch it, this game-side pool draws a flat XZ fan rotated to
// facingVec — correct for the overhead camera on every heading.

import * as THREE from 'three';

const POOL_SIZE = 6;
const LIFETIME = 0.12;
const ARC_ANGLE = Math.PI * 0.61;

function makeFanGeometry() {
    // Sector fan in the XZ plane, centred on +X.
    const segments = 12;
    const inner = 0.35;
    const outer = 1.0;
    const positions = [];
    for (let i = 0; i < segments; i++) {
        const a0 = -ARC_ANGLE / 2 + (i / segments) * ARC_ANGLE;
        const a1 = -ARC_ANGLE / 2 + ((i + 1) / segments) * ARC_ANGLE;
        const p = (ang, r) => [Math.cos(ang) * r, 0, Math.sin(ang) * r];
        positions.push(...p(a0, inner), ...p(a1, inner), ...p(a1, outer));
        positions.push(...p(a0, inner), ...p(a1, outer), ...p(a0, outer));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
}

export class ArcSmear {
    constructor(scene) {
        this.scene = scene;
        this.geo = makeFanGeometry();
        this.pool = [];
        for (let i = 0; i < POOL_SIZE; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(this.geo, mat);
            mesh.visible = false;
            mesh.renderOrder = 5;
            scene.add(mesh);
            this.pool.push({ mesh, mat, life: 0 });
        }
    }

    /**
     * @param {{x,y,z}} position attacker centre
     * @param {{x,z}} facingVec 8-way facing (needs not be normalized)
     * @param {number} radius world units (move range)
     * @param {number} color hex tint
     */
    spawn({ position, facingVec, radius = 2, color = 0xffffff, lift = 0.55 }) {
        let slot = this.pool.find((s) => s.life <= 0);
        if (!slot) slot = this.pool.reduce((a, b) => (a.life < b.life ? a : b));
        const { mesh, mat } = slot;
        mesh.position.set(position.x, position.y + lift, position.z);
        mesh.scale.setScalar(radius);
        // rotation.y = φ maps local +X to world (cos φ, 0, -sin φ);
        // we want it to land on (fx, fz) ⇒ φ = atan2(-fz, fx).
        // (?? not ||: x = 0 is a valid heading on the north/south axes)
        const fx = facingVec?.x ?? 1;
        const fz = facingVec?.z ?? 0;
        mesh.rotation.set(0, Math.atan2(-fz, fx), 0);
        mat.color.setHex(color);
        mat.opacity = 0.85;
        mesh.visible = true;
        slot.life = LIFETIME;
    }

    update(dt) {
        for (const slot of this.pool) {
            if (slot.life <= 0) continue;
            slot.life -= dt;
            if (slot.life <= 0) {
                slot.life = 0;
                slot.mesh.visible = false;
                slot.mat.opacity = 0;
                continue;
            }
            const k = slot.life / LIFETIME;
            slot.mat.opacity = 0.85 * k;
            slot.mesh.scale.multiplyScalar(1 + 0.6 * dt);
        }
    }

    get activeCount() {
        return this.pool.filter((s) => s.life > 0).length;
    }

    dispose() {
        for (const slot of this.pool) {
            this.scene.remove(slot.mesh);
            slot.mat.dispose();
        }
        this.geo.dispose();
        this.pool = [];
    }
}
