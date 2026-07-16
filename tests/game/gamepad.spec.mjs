// tests/game/gamepad.spec.mjs
// Pure-node spec for Input.pollGamepad (B5) using an injected fake pad.

import { Input } from '../../src/game/input.js';

const fakeDom = { addEventListener() {}, removeEventListener() {} };

function pad({ buttons = [], axes = [0, 0, 0, 0] } = {}) {
    const b = Array.from({ length: 17 }, (_, i) => ({ pressed: buttons.includes(i) }));
    return { connected: true, buttons: b, axes };
}

export function run(t) {
    const input = new Input(fakeDom);

    // No pad: neutral state
    input.pollGamepad([]);
    t.ok('no pad → no move', input.padMove.x === 0 && input.padMove.z === 0);
    t.ok('no pad → no aim', input.padAim === null);

    // Left stick with deadzone
    input.pollGamepad([pad({ axes: [0.1, 0.1, 0, 0] })]);
    t.ok('deadzone swallows small stick', input.padMove.x === 0 && input.padMove.z === 0);
    input.pollGamepad([pad({ axes: [0.7, -0.5, 0, 0] })]);
    t.ok('left stick maps to padMove', input.padMove.x === 0.7 && input.padMove.z === -0.5);
    const mv = input.moveVector();
    t.ok('moveVector falls back to pad', mv.x === 0.7 && mv.z === -0.5);

    // Right stick aim threshold
    input.pollGamepad([pad({ axes: [0, 0, 0.2, 0.1] })]);
    t.ok('weak right stick → no aim', input.padAim === null);
    input.pollGamepad([pad({ axes: [0, 0, 0.9, 0.3] })]);
    t.ok('right stick maps to padAim', input.padAim && input.padAim.x === 0.9 && input.padAim.z === 0.3);

    // Edge-triggered buttons: A fires attack once, not while held
    input.consumeAttack(); // clear
    input.pollGamepad([pad({ buttons: [0] })]);
    t.ok('A press → attack edge', input.consumeAttack() === true);
    input.pollGamepad([pad({ buttons: [0] })]); // still held
    t.ok('A held → no repeat', input.consumeAttack() === false);
    input.pollGamepad([pad({})]); // released
    input.pollGamepad([pad({ buttons: [0] })]);
    t.ok('A re-press → fires again', input.consumeAttack() === true);

    // Full mapping table
    input.pollGamepad([pad({})]);
    input.pollGamepad([pad({ buttons: [1, 2, 3, 5, 8, 9, 12] })]);
    t.ok('B → dash', input.consumeDash() === true);
    t.ok('X → interact', input.consumeInteract() === true);
    t.ok('Y → grapple', input.consumeGrapple() === true);
    t.ok('RB → weapon next', input.consumeWeaponCycle() === 1);
    t.ok('Select → mute', input.consumeMuteToggle() === true);
    t.ok('Start → pause', input.consumePause() === true);
    t.ok('D-up → mood', input.consumeMoodToggle() === true);

    // Menu nav codes synthesized from d-pad + A/B
    input.pollGamepad([pad({})]);
    input.consumeMenuCodes();
    input.pollGamepad([pad({ buttons: [13] })]);
    input.pollGamepad([pad({ buttons: [13, 0] })]);
    input.pollGamepad([pad({ buttons: [13, 0, 1] })]);
    const codes = input.consumeMenuCodes();
    t.ok('menu codes in order', JSON.stringify(codes) === JSON.stringify(['ArrowDown', 'Enter', 'Backspace']));
    t.ok('menu codes drained', input.consumeMenuCodes().length === 0);

    // Any pad use marks padActive; keyboard reverts it
    t.ok('pad marked active', input.padActive === true);
    input._onKeyDown({ code: 'KeyW' });
    t.ok('keyboard reverts padActive', input.padActive === false);
}
