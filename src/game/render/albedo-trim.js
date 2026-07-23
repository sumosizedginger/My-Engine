// Light trim that compensates for how dark a surface is.
//
// The overworld's eight regions are deliberately different rock — pale clay in
// the Tombfields, iron in the Spindle heights, dark slate in the Quarry. They
// all sit in one level, under one set of lights, with one level-wide trim. So
// their frames came out at wildly different brightnesses from identical
// lighting:
//
//     Tombfields  clayField  76      Quarry    slate    52
//     Bonetown    ashField   87      Cryomire  slate    53
//     Pyre        clayDark   82      Spindle   iron     32   <- floor is 45
//
// and in the Abyss, where every region shares one dark floor, all eight sat at
// **18–27 against a floor of 35** — dark enough that an enemy standing next to
// the player was hard to see, which is the exact failure the band exists to
// prevent.
//
// None of it was caught, because the certification gate samples the overworld's
// START screen, and the start screen is one of the pale ones. Same shape as the
// shadow-frustum bug: the one place being measured was the one place that was
// fine.
//
// The fix is not sixteen hand-tuned numbers. Brightness here is a product of
// light and albedo, so the trim is DERIVED from the floor colour: a region with
// half the reflectance gets twice the light and lands in the same place. Change
// a floor colour and the compensation follows it, which hand-tuned values would
// not.
//
// The compensation is computed in LINEAR light, not on sRGB bytes. That matters
// more than it looks: iron and clay differ by 1.5× as stored and by **2.2×** as
// light, and using the stored ratio would have under-corrected by nearly half.

/** sRGB byte → linear. */
function toLinear(c) {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a 0xRRGGBB colour, in linear light (0..1). */
export function linearLuminance(hex) {
    const r = toLinear((hex >> 16) & 255);
    const g = toLinear((hex >> 8) & 255);
    const b = toLinear(hex & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Bounds on the compensation. A region is allowed to ask for up to 2.6× the
 * light of the reference and no less than 0.55×; past that the answer is that
 * the floor colour is wrong, not that the lights are. Without a ceiling a
 * near-black floor would demand an arbitrarily large key and blow out
 * everything standing on it.
 */
export const TRIM_MIN = 0.55;
export const TRIM_MAX = 2.6;

/**
 * How much to scale the lights for a surface of `floorHex`, relative to
 * `referenceHex`.
 *
 * @returns {number} a multiplier for key/ambient/fill
 */
export function albedoTrim(floorHex, referenceHex) {
    const lum = linearLuminance(floorHex);
    if (!(lum > 0)) return TRIM_MAX;
    const ratio = linearLuminance(referenceHex) / lum;
    return Math.min(TRIM_MAX, Math.max(TRIM_MIN, ratio));
}

/**
 * Compose a `lightTune` for a location from a mood base and its floor colour.
 *
 * @param {{key?:number, ambient?:number, fill?:number, rim?:number}} base
 * @param {number} floorHex     the surface the player will be standing on
 * @param {number} referenceHex the floor the base was tuned against
 */
export function tuneForFloor(base, floorHex, referenceHex) {
    const t = albedoTrim(floorHex, referenceHex);
    const out = {};
    for (const k of ['key', 'ambient', 'fill', 'rim']) {
        if (base[k] != null) out[k] = +(base[k] * t).toFixed(4);
    }
    return out;
}
