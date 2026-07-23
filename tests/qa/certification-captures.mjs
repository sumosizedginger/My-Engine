// Regenerate the 44 visual certification captures in docs/media/certification/.
//
//   node tests/qa/certification-captures.mjs
//
// 14 dungeons × (entry room + boss room) = 28, plus 8 overworld regions ×
// (Crust + Abyss) = 16.
//
// These are the images `CERTIFICATION.md` links from, and columns C (camera
// frames the room), D (no void bleed) and H (story lines) are certified BY EYE
// from them — so they have to be regenerated whenever the game stops looking
// the way they show it. They had been stale since the Session 6 camera retune
// (65° FOV → 40°), and the lighting pass made that worse: nearly every room in
// the game gained sun shadows, every mesh started receiving them, and the
// ambient/key balance moved in both moods.
//
// Headless is not a compromise here — CERTIFICATION.md says these are headless
// captures by design. What headless *cannot* certify is frame rate (swiftshader
// runs ~1.5 fps), which is a separate outstanding item and needs a real GPU.
//
// Notes on getting a usable frame, each of which cost something to learn:
//
//  * HUD chrome is hidden via `hud.setHidden(true)` — the same thing dev mode's
//    `H` does. A capture with the cheat sheet and dialogue box over it cannot
//    be used to judge whether the camera frames the room.
//  * Teleporting the player between dungeon rooms trips the CURRENT room's door
//    trigger and snaps them back to a doorway, so `enterRoom` comes first and
//    the position is taken from `respawnPoint()` afterwards.
//  * The overworld cannot be teleported across at all — a screen that has not
//    been baked is void, and the player falls through it. Its position and
//    mirror state are written to the save and the level is reloaded instead.
//  * The boss intro runs a camera push-in; left alone it frames the boss's face
//    instead of the room.

import fs from 'node:fs';
import { startServer, findChromeVerbose, sleep, disableGamepads } from '../harness.mjs';

const OUT = 'docs/media/certification';

// One representative screen per region, computed from `regionOf` over the 7×7
// grid and pinned here so a capture always shows the same place.
const REGION_SCREENS = {
    tombfields: 'r1c1',
    spindle: 'r1c3',
    pyre: 'r2c5',
    sinklands: 'r3c1',
    citadel: 'sink',
    quarry: 'r5c1',
    cryomire: 'r5c6',
    bonetown: 'r6c2',
};

// `--only=dungeons` / `--only=overworld` so half the set can be re-shot without
// paying for the other half.
const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const doDungeons = !onlyArg || onlyArg === 'dungeons';
const doOverworld = !onlyArg || onlyArg === 'overworld';

const chrome = findChromeVerbose();
if (!chrome.path) { console.error('no chrome'); process.exit(2); }
const puppeteer = await import('puppeteer-core');

fs.mkdirSync(OUT, { recursive: true });
const server = await startServer(8789);
let browser;
const written = [];
const failed = [];

try {
    browser = await puppeteer.default.launch({
        executablePath: chrome.path,
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--window-size=1280,720'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await disableGamepads(page);
    page.setDefaultTimeout(60000);

    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => !!(window.__sovereignScar?.player), { timeout: 25000 });
    await page.mouse.click(400, 300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await sleep(400);

    await page.evaluate(() => {
        const s = window.__sovereignScar;
        s.game.atTitle = false;
        s.game.paused = false;
        s.menu.close();
        s.hud?.setHidden?.(true);
    });

    // Luminance is sampled at the same moment as the picture, so the numbers in
    // CERTIFICATION.md's Lum column describe the frame stored next to them
    // rather than some earlier build's.
    const lums = {};
    const shoot = async (name) => {
        const path = `${OUT}/${name}.png`;
        await page.screenshot({ path });
        const st = await page.evaluate(async () => {
            const got = [];
            for (let i = 0; i < 3; i++) {
                got.push(await window.__sovereignScar.sampleLuminanceStats());
                await new Promise((r) => setTimeout(r, 140));
            }
            const med = (k) => got.map((g) => g[k]).sort((a, b) => a - b)[1];
            return { mean: med('mean'), contrast: med('contrast') };
        });
        lums[name] = st;
        written.push(name);
        process.stdout.write(`  ${name.padEnd(28)} lum=${st.mean.toFixed(0)} contrast=${st.contrast}\n`);
    };

    // ── Dungeons: entry room + boss room ────────────────────────────────
    const levels = doDungeons ? await page.evaluate(() => window.__sovereignScar.LEVELS
        .filter((l) => l.id.startsWith('beat-'))
        .map((l) => l.id)) : [];

    for (const id of levels) {
        try {
            const rooms = await page.evaluate(async (lid) => {
                const s = window.__sovereignScar;
                s.loadLevel(lid);
                s.game.bossIntro = null;
                s.hud?.setHidden?.(true);
                await new Promise((r) => setTimeout(r, 700));
                const def = s.game.level.def;
                const bossRoom = Object.keys(def.rooms).find((k) => def.rooms[k].boss);
                return { entry: def.start, boss: bossRoom || def.start };
            }, id);

            for (const [kind, roomId] of [['entry', rooms.entry], ['boss', rooms.boss]]) {
                await page.evaluate(async (rid) => {
                    const s = window.__sovereignScar;
                    const lvl = s.game.level;
                    // enterRoom FIRST — teleporting straight there trips the
                    // room you are leaving and bounces you to its doorway.
                    lvl.enterRoom(rid, s.game);
                    const p = lvl.respawnPoint?.();
                    if (p) s.player.root.position.set(p.x, p.y, p.z);
                    s.game.bossIntro = null;
                    s.hud?.setHidden?.(true);
                    await new Promise((r) => setTimeout(r, 900));
                }, roomId);
                await sleep(250);
                await shoot(`${id}-${kind}`);
            }
        } catch (e) {
            failed.push(`${id}: ${e}`);
            console.error(`  FAILED ${id}: ${e}`);
        }
    }

    // ── Overworld: one screen per region, in both mirror states ─────────
    for (const [region, screen] of (doOverworld ? Object.entries(REGION_SCREENS) : [])) {
        for (const state of ['crust', 'abyss']) {
            try {
                await page.evaluate(async (scr, st) => {
                    const s = window.__sovereignScar;
                    // The overworld will not survive a teleport — an unbaked
                    // screen is void and the player falls through it. Write the
                    // save and reload so the screen is baked around them.
                    // `world` is REQUIRED. createOverworld only honours a saved
                    // position when `pos.world === levelId` (the dev test grid
                    // and the real world share screen names but not geography).
                    // Omitting it silently falls back to `screensDef.start`, so
                    // the first run of this script produced sixteen identical
                    // pictures of the starting screen, filed under eight region
                    // names. Two of them being byte-for-byte identical is what
                    // gave it away — regions have different floors.
                    s.patchOverworld({
                        pos: { world: 'overworld', screen: scr, x: 0, z: 0 },
                        state: st,
                    });
                    s.loadLevel('overworld');
                    s.hud?.setHidden?.(true);
                    await new Promise((r) => setTimeout(r, 1100));
                }, screen, state);
                await sleep(250);
                await shoot(`ow-${region}-${state}`);
            } catch (e) {
                failed.push(`ow-${region}-${state}: ${e}`);
                console.error(`  FAILED ow-${region}-${state}: ${e}`);
            }
        }
    }

    console.log('');
    console.log(`wrote ${written.length} captures to ${OUT}`);
    if (failed.length) {
        console.log(`FAILED ${failed.length}:`);
        for (const f of failed) console.log(`  ${f}`);
    }
    console.log('');
    console.log('CERTIFICATION.md Lum column (entry / boss):');
    for (const id of levels) {
        const e = lums[`${id}-entry`], b = lums[`${id}-boss`];
        if (e && b) console.log(`  ${id.padEnd(20)} ${e.mean.toFixed(0)} / ${b.mean.toFixed(0)}`);
    }
    console.log(`page errors during the run: ${errors.length}`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
} finally {
    try { await browser?.close(); } catch (_) {}
    await server.close();
}
