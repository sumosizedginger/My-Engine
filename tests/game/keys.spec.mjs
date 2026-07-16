// W3: per-dungeon lock-and-key persistence under sovereignProgress.dungeons.

import {
    getDungeonState, grantSmallKey, useSmallKey, grantBossKey, hasBossKey,
    openDoor, isDoorOpen, markVisited, isPickupTaken, markPickupTaken,
    makeKeyStore,
} from '../../src/game/world/keys.js';
import { loadSovereignProgress, resetSovereignProgress } from '../../src/game/kernel/progress.js';

export function run(t) {
    resetSovereignProgress();

    const D = 'spec-dungeon';
    const s0 = getDungeonState(D);
    t.ok('empty state defaults', s0.smallKeys === 0 && s0.bossKey === false
        && s0.opened.length === 0 && s0.visited.length === 0 && s0.taken.length === 0);

    grantSmallKey(D);
    grantSmallKey(D);
    t.ok('grant accumulates', getDungeonState(D).smallKeys === 2);
    t.ok('spend succeeds', useSmallKey(D) === true);
    t.ok('spend decrements', getDungeonState(D).smallKeys === 1);
    t.ok('spend again succeeds', useSmallKey(D) === true);
    t.ok('overdraft rejected', useSmallKey(D) === false);
    t.ok('floor at zero', getDungeonState(D).smallKeys === 0);

    t.ok('no boss key by default', hasBossKey(D) === false);
    grantBossKey(D);
    t.ok('boss key granted', hasBossKey(D) === true);

    openDoor(D, 'spec-dungeon:a-b');
    t.ok('door opens', isDoorOpen(D, 'spec-dungeon:a-b'));
    openDoor(D, 'spec-dungeon:a-b');
    t.ok('open is idempotent', getDungeonState(D).opened.length === 1);
    t.ok('other door closed', !isDoorOpen(D, 'spec-dungeon:b-c'));

    markVisited(D, 'entry');
    markVisited(D, 'entry');
    markVisited(D, 'hall');
    t.ok('visited dedupes', getDungeonState(D).visited.join(',') === 'entry,hall');

    t.ok('pickup untaken', !isPickupTaken(D, 'key1'));
    markPickupTaken(D, 'key1');
    t.ok('pickup taken persists', isPickupTaken(D, 'key1'));

    // Two dungeons don't share state
    grantSmallKey('other-dungeon');
    t.ok('dungeons isolated', getDungeonState(D).smallKeys === 0
        && getDungeonState('other-dungeon').smallKeys === 1);

    // Nested write survives an unrelated top-level save (G13 read-modify-write)
    const before = loadSovereignProgress().dungeons[D];
    t.ok('state under sovereignProgress.dungeons', !!before && before.bossKey === true);

    // keyStore adapter: cached reads + write-through
    const store = makeKeyStore('adapter-dungeon');
    t.ok('adapter starts empty', store.smallKeys() === 0);
    store.grantSmallKey();
    t.ok('adapter grant', store.smallKeys() === 1);
    t.ok('adapter persisted', getDungeonState('adapter-dungeon').smallKeys === 1);
    t.ok('adapter spend', store.trySpendSmallKey() === true && store.smallKeys() === 0);
    store.open('adapter-dungeon:x-y');
    t.ok('adapter door open cached', store.isOpen('adapter-dungeon:x-y'));
    t.ok('adapter door open persisted', isDoorOpen('adapter-dungeon', 'adapter-dungeon:x-y'));

    // New Game clears dungeon state
    resetSovereignProgress();
    t.ok('reset clears dungeons', getDungeonState(D).bossKey === false
        && getDungeonState('other-dungeon').smallKeys === 0);
}
