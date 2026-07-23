// tests/game/albedo-trim.spec.mjs — same lights, different rock.
//
// The overworld's eight regions are deliberately different stone. They sit in
// one level, under one set of lights, and until now under one level-wide light
// trim — so identical lighting produced wildly different frames:
//
//     Tombfields  clayField  76      Quarry    slate    52
//     Bonetown    ashField   87      Cryomire  slate    53
//     Pyre        clayDark   82      Spindle   iron     32   <- floor is 45
//
// and in the Abyss, where every region shares one dark floor, all eight sat at
// 18–27 against a floor of 35 — dark enough that an enemy standing beside the
// player was hard to pick out.
//
// None of it was caught because `visual-sanity.spec.mjs` samples the overworld
// in its DEFAULT state on its START screen, and that screen is one of the pale
// crust ones. The same shape as the shadow-frustum bug: the one place being
// measured was the one place that was fine.
//
// The fix derives the trim from the floor colour rather than hand-tuning
// sixteen numbers, so changing a floor colour moves its lighting with it.

import {
    linearLuminance, albedoTrim, tuneForFloor, TRIM_MIN, TRIM_MAX,
} from '../../src/game/render/albedo-trim.js';
import { CRUST_COLORS, ABYSS_COLORS } from '../../src/game/assets/palettes.js';
import { WORLD7, regionOf } from '../../src/game/overworld/world7.js';

export function run(t) {
    // ---------------------------------------------------------------
    // linear, not sRGB — this is the part that would have silently
    // under-corrected by half
    // ---------------------------------------------------------------
    {
        const iron = CRUST_COLORS.iron, clay = CRUST_COLORS.clayField;
        const srgbRatio = (() => {
            const l = (h) => 0.2126 * ((h >> 16) & 255)
                + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255);
            return l(clay) / l(iron);
        })();
        const linRatio = linearLuminance(clay) / linearLuminance(iron);
        t.ok('iron is darker than clay in linear light', linRatio > 1,
            `ratio=${linRatio.toFixed(2)}`);
        t.ok('the linear ratio is much larger than the sRGB one',
            linRatio > srgbRatio * 1.4,
            `linear=${linRatio.toFixed(2)} srgb=${srgbRatio.toFixed(2)} — `
            + 'compensating on stored bytes would under-correct by nearly half');
        // The measured frame ratio was 76/32 = 2.4; linear predicts ~2.2.
        t.ok('the linear ratio predicts the measured frame ratio',
            linRatio > 1.9 && linRatio < 2.6,
            `predicted ${linRatio.toFixed(2)}, measured 76/32 = 2.4`);
    }
    {
        t.ok('black has no luminance', linearLuminance(0x000000) === 0);
        t.ok('white is full luminance', Math.abs(linearLuminance(0xffffff) - 1) < 1e-9);
        t.ok('green outweighs blue',
            linearLuminance(0x00ff00) > linearLuminance(0x0000ff) * 5);
    }

    // ---------------------------------------------------------------
    // the trim itself
    // ---------------------------------------------------------------
    {
        const ref = CRUST_COLORS.clayField;
        t.ok('the reference floor needs no compensation',
            Math.abs(albedoTrim(ref, ref) - 1) < 1e-9);
        t.ok('a darker floor asks for more light', albedoTrim(CRUST_COLORS.iron, ref) > 1);
        t.ok('a paler floor asks for less', albedoTrim(CRUST_COLORS.limestone, ref) < 1);

        // Bounds exist so a near-black floor cannot demand an arbitrarily large
        // key and blow out everything standing on it.
        t.ok('compensation is capped', albedoTrim(0x010101, ref) <= TRIM_MAX);
        t.ok('compensation has a floor', albedoTrim(0xffffff, ref) >= TRIM_MIN);
        t.ok('pure black does not divide by zero',
            Number.isFinite(albedoTrim(0x000000, ref)),
            `${albedoTrim(0x000000, ref)}`);
    }

    // ---------------------------------------------------------------
    // composing a tune
    // ---------------------------------------------------------------
    {
        const base = { key: 0.7, ambient: 0.9 };
        const same = tuneForFloor(base, CRUST_COLORS.clayField, CRUST_COLORS.clayField);
        t.ok('the reference floor passes the base through',
            Math.abs(same.key - 0.7) < 1e-3 && Math.abs(same.ambient - 0.9) < 1e-3,
            JSON.stringify(same));

        const dark = tuneForFloor(base, CRUST_COLORS.iron, CRUST_COLORS.clayField);
        t.ok('a dark floor scales key and ambient together',
            dark.key > base.key && dark.ambient > base.ambient,
            JSON.stringify(dark));
        // Tolerance is 1e-3 rather than exact because the composed values are
        // rounded to 4dp so they read cleanly in a debug dump — the ratio is
        // preserved to the precision actually stored, which is the claim.
        t.ok('the ratio is preserved across channels',
            Math.abs((dark.key / dark.ambient) - (base.key / base.ambient)) < 1e-3,
            `${(dark.key / dark.ambient).toFixed(6)} vs ${(base.key / base.ambient).toFixed(6)}`
            + ' — compensation changes the LEVEL of the light, never its character');
        t.ok('absent channels stay absent', tuneForFloor({ key: 1 }, 0x808080, 0x808080).ambient === undefined,
            'a base that does not mention fill must not invent one');
    }

    // ---------------------------------------------------------------
    // it actually separates the real regions
    // ---------------------------------------------------------------
    {
        // Every region's crust floor, compensated against the reference, should
        // land the whole world within a narrow band of effective brightness —
        // that is the entire claim.
        const ref = CRUST_COLORS.clayField;
        const byRegion = {};
        for (const [, s] of Object.entries(WORLD7.screens)) {
            const reg = regionOf(s.grid[1] - 8, s.grid[0] - 8);
            const floor = s.floorColor || ref;
            byRegion[reg] = albedoTrim(floor, ref) * linearLuminance(floor);
        }
        const vals = Object.values(byRegion);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        t.ok('every region is covered', Object.keys(byRegion).length === 8,
            Object.keys(byRegion).join(','));
        t.ok('compensation flattens the regions to within 15%',
            hi / lo < 1.15,
            `spread ${lo.toFixed(4)}..${hi.toFixed(4)} = ${(hi / lo).toFixed(2)}× — `
            + 'uncompensated these differ by 2.4×');
    }
    {
        // And the Spindle, the region that was actually broken, must be the one
        // asking for the most light.
        const ref = CRUST_COLORS.clayField;
        const spindle = albedoTrim(CRUST_COLORS.iron, ref);
        const tomb = albedoTrim(CRUST_COLORS.clayField, ref);
        t.ok('the Spindle asks for roughly twice the light of the Tombfields',
            spindle / tomb > 1.8 && spindle / tomb < 2.6,
            `${spindle.toFixed(2)} vs ${tomb.toFixed(2)}`);
    }

    // ---------------------------------------------------------------
    // the Abyss shares one floor, so compensation cannot help it
    // ---------------------------------------------------------------
    {
        // Worth stating, because it explains why the Abyss needed a base lift
        // rather than compensation: every Abyss screen falls back to the same
        // floor colour, so every trim is identical and the differences between
        // Abyss screens come from their props, not their ground.
        const ref = ABYSS_COLORS.abyssFloor;
        const trims = new Set();
        for (const [, s] of Object.entries(WORLD7.screens)) {
            trims.add(albedoTrim(s.abyssFloorColor || ref, ref).toFixed(4));
        }
        t.ok('the Abyss overworld has one floor, so one compensation',
            trims.size === 1, [...trims].join(','));
    }
}
