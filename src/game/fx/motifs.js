// C7: per-beat and per-overworld-region music motifs (plan §C7, bible §7
// "per-beat motif — SS-025"). A motif transposes the whole bed and gives the
// rhythmic pulse a small ratio cycle to walk, so every dungeon and region
// reads differently over the same four beds. Ratios are just intonation
// intervals relative to the bed root.

export const BEAT_MOTIFS = {
    'beat-01-crypt': { transpose: 1.0, pattern: [1, 1.5] },              // bare fifth — cold stone
    'beat-02-spindle': { transpose: 1.125, pattern: [1, 1.25, 1.5] },     // major arpeggio — machinery
    'beat-03-sink': { transpose: 0.94, pattern: [1, 1.2] },               // sunken minor third
    'beat-04-sky': { transpose: 1.26, pattern: [1, 1.5, 2] },             // open octaves — height
    'beat-05-citadel': { transpose: 1.0, pattern: [1, 1.41] },            // tritone — the trap
    'beat-06-quarry': { transpose: 0.89, pattern: [1, 1.19] },            // low minor — the mine
    'beat-07-sluice': { transpose: 1.0, pattern: [1, 1.33, 1.5] },        // dripping fourths
    'beat-08-bone': { transpose: 0.84, pattern: [1, 1.26] },              // hollow — the roots
    'beat-09-town': { transpose: 1.06, pattern: [1, 0.94] },              // uncanny semitone waver
    'beat-10-cryo': { transpose: 1.19, pattern: [1, 1.5, 1.26] },         // glassy — the vault
    'beat-11-mire': { transpose: 0.79, pattern: [1, 1.12] },              // sluggish — the mire
    'beat-12-pyre': { transpose: 1.33, pattern: [1, 1.26, 1.5] },         // bright, urgent — fire
    'beat-13-gumoi': { transpose: 1.0, pattern: [1, 1.41, 0.94, 1.5] },   // glitching index
    'beat-14-leviathan': { transpose: 1.0, pattern: [1, 0.5, 1.5] },      // folding octaves
};

export const REGION_MOTIFS = {
    tombfields: { transpose: 1.0, pattern: [1, 1.5] },
    spindle: { transpose: 1.125, pattern: [1, 1.25] },
    sinklands: { transpose: 0.94, pattern: [1, 1.2] },
    citadel: { transpose: 1.06, pattern: [1, 1.41] },
    quarry: { transpose: 0.89, pattern: [1, 1.19] },
    bonetown: { transpose: 0.84, pattern: [1, 1.26] },
    cryomire: { transpose: 1.19, pattern: [1, 1.5] },
    pyre: { transpose: 1.33, pattern: [1, 1.26] },
};
