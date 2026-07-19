// The windup → strike → recover loop, in isolation.
//
// The browser spec proves the roster behaves; this proves the machine those
// bosses are built on does what its contract says, without a GPU.

import * as THREE from 'three';
import { BossBase, circleStrafe } from '../../src/game/bosses/base.js';
import { applyHit } from '../../src/game/combat/combat-sweeper.js';

function makePlayer(x = 0, z = 0) {
    return {
        root: { position: { x, y: 1.95, z } },
        health: { hp: 6, max: 6, dead: false, damage(n) { this.hp -= n; return { accepted: true }; } },
    };
}

function makeBoss(opts = {}) {
    const scene = new THREE.Scene();
    const mesh = new THREE.Group();
    return new BossBase(scene, {
        id: 'test', name: 'Test', hp: 10, position: { x: 0, z: 0 }, mesh, ...opts,
    });
}

export function run(t) {
    // ── The loop runs in order and only resolves at the end of the windup ───
    {
        const boss = makeBoss();
        const player = makePlayer(0, 0);
        let struck = 0;
        boss.tickAI = () => {};
        boss.actionCd = 0;
        boss.startAction({
            name: 'test', windup: 0.5, recover: 0.4, cooldown: 0.3,
            aim: () => ({ x: 3, z: 0, radius: 2 }),
            strike: () => { struck++; },
        }, player);
        t.ok('an action begins in windup', boss.action.stage === 'windup', boss.action.stage);
        t.ok('windup counts as busy', boss.busy === true);
        t.ok('windup is not yet a vulnerability window', boss.staggered === false);

        boss.update(0.3, player, null);
        t.ok('no damage resolves mid-windup', struck === 0, `struck=${struck}`);

        boss.update(0.3, player, null); // windup expires
        t.ok('the strike resolves once the windup expires', struck === 1, `struck=${struck}`);
        t.ok('the boss then enters recovery', boss.action.stage === 'recover', boss.action?.stage);
        t.ok('recovery is the vulnerability window', boss.staggered === true);
        t.ok('recovery doubles incoming damage', boss.vulnerableMult === 2, String(boss.vulnerableMult));

        boss.update(0.5, player, null); // recovery expires
        t.ok('the action clears after recovery', boss.action === null);
        t.ok('the damage bonus is given back', boss.vulnerableMult === 1, String(boss.vulnerableMult));
        t.ok('a cooldown gates the next action', boss.actionCd > 0, String(boss.actionCd));
    }

    // ── The strike reads the player's CURRENT position ──────────────────────
    // The whole point of a telegraph: leaving the marked ground has to work.
    {
        const boss = makeBoss();
        boss.tickAI = () => {};
        const player = makePlayer(0, 0);
        let hit = null;
        boss.startAction({
            name: 'blast', windup: 0.4, recover: 0.2,
            aim: (p) => ({ x: p.root.position.x, z: p.root.position.z, radius: 2 }),
            strike: (p, aim) => { hit = boss.inBlast(p, aim.x, aim.z, 2); },
        }, player);
        player.root.position.x = 9; // walked away during the windup
        boss.update(0.5, player, null);
        t.ok('stepping off the telegraph makes the blow whiff', hit === false, String(hit));
    }
    {
        const boss = makeBoss();
        boss.tickAI = () => {};
        const player = makePlayer(0, 0);
        let hit = null;
        boss.startAction({
            name: 'blast', windup: 0.4, recover: 0.2,
            aim: (p) => ({ x: p.root.position.x, z: p.root.position.z, radius: 2 }),
            strike: (p, aim) => { hit = boss.inBlast(p, aim.x, aim.z, 2); },
        }, player);
        boss.update(0.5, player, null); // stood still
        t.ok('standing in the telegraph takes the hit', hit === true, String(hit));
    }

    // ── The stagger bonus actually reaches the damage calculation ───────────
    // A window nothing rewards is not a window.
    {
        const boss = makeBoss();
        boss.hp = 10;
        boss.vulnerableMult = 2;
        applyHit(boss, { damage: 1.5 }, { damageMult: 1 });
        t.ok('a hit during recovery lands double', boss.hp === 7, `hp=${boss.hp}`);
        boss.vulnerableMult = 1;
        applyHit(boss, { damage: 1.5 }, { damageMult: 1 });
        t.ok('a hit outside recovery lands normal', boss.hp === 5.5, `hp=${boss.hp}`);
    }

    // ── Death cancels everything ───────────────────────────────────────────
    {
        const boss = makeBoss();
        boss.tickAI = () => {};
        boss.startAction({ name: 'x', windup: 0.4, aim: () => ({ x: 0, z: 0 }) }, makePlayer());
        t.ok('telegraph exists during windup', boss._telegraph != null);
        boss.onDeath();
        t.ok('death clears the pending action', boss.action === null);
        t.ok('death clears the telegraph', boss._telegraph == null);
        t.ok('death clears the damage bonus', boss.vulnerableMult === 1);
    }

    // ── The recovery cue is visible, and at the floor the boss stands on ────
    // Boss telegraphs once rendered a full unit underground for the entire
    // life of the boss framework. A cue nobody can see is not a cue.
    {
        const boss = makeBoss({ floorY: 1.0 });
        boss.tickAI = () => {};
        const player = makePlayer(0, 0);
        boss.startAction({ name: 'x', windup: 0.2, recover: 0.5, aim: () => ({ x: 0, z: 0 }) }, player);
        boss.update(0.25, player, null);
        t.ok('recovery raises a visible cue', boss._recoverCue != null);
        t.ok('the cue sits above the floor the boss stands on',
            boss._recoverCue.position.y > 1.0,
            `y=${boss._recoverCue?.position.y}`);
        boss.update(0.6, player, null);
        t.ok('the cue is removed when the window closes', boss._recoverCue == null);
    }

    // ── Shaped telegraphs ──────────────────────────────────────────────────
    {
        const boss = makeBoss();
        boss.telegraphShape('cone', { x: 0, z: 0, radius: 4, dir: { x: 1, z: 0 } });
        t.ok('a cone telegraph is created', boss._telegraph != null);
        boss.telegraphShape('line', { x: 0, z: 0, radius: 6, dir: { x: 0, z: 1 } });
        t.ok('a line telegraph is created', boss._telegraph != null);
        boss.clearTelegraph();
        t.ok('telegraphs clear', boss._telegraph == null);

        // Cone hit test agrees with the shape it draws.
        const ahead = makePlayer(3, 0);
        const behind = makePlayer(-3, 0);
        t.ok('the cone hits what is in front of it',
            boss.inCone(ahead, { x: 0, z: 0 }, { x: 1, z: 0 }, 4, Math.PI / 4) === true);
        t.ok('the cone misses what is behind it',
            boss.inCone(behind, { x: 0, z: 0 }, { x: 1, z: 0 }, 4, Math.PI / 4) === false);
        t.ok('the cone misses what is out of range',
            boss.inCone(makePlayer(9, 0), { x: 0, z: 0 }, { x: 1, z: 0 }, 4, Math.PI / 4) === false);
    }

    // ── The drawn shape points where the attack actually lands ─────────────
    // The hit tests above and the geometry below are written from different
    // maths (dot products vs. mesh rotation), and nothing forces them to
    // agree. If the yaw is wrong the ring lies about which way to run and the
    // player is punished for reading it correctly — the exact failure mode of
    // a telegraph drawn a metre underground, just rotated instead of buried.
    // So: transform the mesh's own vertices to world space and check where
    // the drawn shape's mass actually sits.
    function drawnDirection(boss, kind, dir) {
        boss.telegraphShape(kind, { x: 0, z: 0, radius: 4, dir, width: 1.4 });
        const m = boss._telegraph;
        m.updateMatrixWorld(true);
        const pos = m.geometry.attributes.position;
        const v = new THREE.Vector3();
        let sx = 0, sz = 0, n = 0;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            sx += v.x; sz += v.z; n++;
        }
        boss.clearTelegraph();
        const cx = sx / n, cz = sz / n;
        const len = Math.hypot(cx, cz) || 1;
        return { x: cx / len, z: cz / len, mag: len };
    }
    {
        const boss = makeBoss();
        for (const dir of [
            { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
            { x: 0.707, z: 0.707 },
        ]) {
            for (const kind of ['cone', 'line']) {
                const got = drawnDirection(boss, kind, dir);
                const dot = got.x * dir.x + got.z * dir.z;
                t.ok(`a ${kind} telegraph is drawn toward (${dir.x},${dir.z})`,
                    dot > 0.9 && got.mag > 0.3,
                    `drawn toward (${got.x.toFixed(2)},${got.z.toFixed(2)}), dot=${dot.toFixed(2)}`);
            }
        }
    }

    // ── circleStrafe closes; it never retreats ─────────────────────────────
    // A boss that holds a fixed radius from a chasing player is unreachable:
    // it backs off exactly as fast as you approach. The radius must only
    // shrink.
    {
        const player = makePlayer(0, 0);
        const pos = { x: 8, z: 0 };
        let prev = 8;
        let everGrew = false;
        for (let i = 0; i < 200; i++) {
            circleStrafe(pos, player, 0.05, { speed: 3, spin: 0.7, close: 0.8, minRadius: 2 });
            const d = Math.hypot(pos.x, pos.z);
            if (d > prev + 0.001) everGrew = true;
            prev = d;
        }
        t.ok('circleStrafe never backs away from the player', everGrew === false);
        t.ok('circleStrafe closes to its minimum radius',
            prev < 2.6, `final radius ${prev.toFixed(2)}`);
        t.ok('circleStrafe does not walk through the player',
            prev > 1.5, `final radius ${prev.toFixed(2)}`);
    }
}
