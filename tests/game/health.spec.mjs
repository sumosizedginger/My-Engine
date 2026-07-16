import { HealthPool, bossHeartMax } from '../../src/game/kernel/health.js';

export function run(t) {
    const h = new HealthPool(6);
    t.ok('starts full', h.hp === 6);
    const r = h.damage(2);
    t.ok('takes damage', r.accepted && h.hp === 4);
    const blocked = h.damage(1);
    t.ok('i-frames block', !blocked.accepted);
    h.iFrames = 0;
    h.damage(10);
    t.ok('death at 0', h.dead && h.hp === 0);
    const afterDeath = h.damage(1);
    t.ok('dead ignores damage', !afterDeath.accepted);
    h.fullRestore();
    t.ok('full restore', !h.dead && h.hp === 6);
    h.heal(100);
    t.ok('heal caps at max', h.hp === 6);

    // C2: setMax raises cap and fills the gained hearts
    h.setMax(8);
    t.ok('setMax raises cap', h.max === 8);
    t.ok('setMax fills gained hearts', h.hp === 8);
    h.hp = 3;
    h.setMax(7);
    t.ok('setMax lower clamps without healing', h.max === 7 && h.hp === 3);
    h.setMax(99);
    t.ok('setMax caps at 12', h.max === 12);
    h.setMax(0);
    t.ok('setMax floors at 1', h.max === 1 && h.hp === 1);

    // C2: boss-heart progression math
    t.ok('0 bosses → base 6', bossHeartMax(0) === 6);
    t.ok('2 bosses → still 6', bossHeartMax(2) === 6);
    t.ok('3 bosses → 7', bossHeartMax(3) === 7);
    t.ok('6 bosses → 8', bossHeartMax(6) === 8);
    t.ok('12 bosses → 10', bossHeartMax(12) === 10);
    t.ok('14 bosses → 10 (no 5th)', bossHeartMax(14) === 10);
}
