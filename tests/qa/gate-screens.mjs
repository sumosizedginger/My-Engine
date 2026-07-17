// One-off: Phase W gate screenshots (Beat 01 slice + overworld region).
import fs from 'fs';
import { startServer, findChromeVerbose, sleep } from '../harness.mjs';

async function main() {
    const chrome = findChromeVerbose();
    const puppeteer = await import('puppeteer-core');
    const server = await startServer(8790);
    fs.mkdirSync('docs/media/w-gate', { recursive: true });
    let browser;
    try {
        browser = await puppeteer.default.launch({
            executablePath: chrome.path,
            headless: 'new',
            args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--window-size=1280,720'],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        page.setDefaultTimeout(60000);
        await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => !!(window.__sovereignScar && window.__sovereignScar.player));
        await page.mouse.click(400, 300);
        await sleep(300);

        const shots = [
            ['overworld', null, 'overworld-scarfield.png'],
            ['beat-01-crypt', null, 'beat01-tomb.png'],
            ['beat-01-crypt', 'corridor', 'beat01-corridor.png'],
            ['beat-01-crypt', 'predecessor', 'beat01-predecessor.png'],
            ['beat-01-crypt', 'warden', 'beat01-warden.png'],
        ];
        for (const [levelId, room, file] of shots) {
            await page.evaluate(async (lid, rid) => {
                const s = window.__sovereignScar;
                s.game.atTitle = false;
                s.game.paused = false;
                s.menu.close();
                if (s.game.levelId !== lid || !rid) s.loadLevel(lid);
                s.game.bossIntro = null;
                await new Promise((r) => setTimeout(r, 200));
                if (rid) {
                    const level = s.game.level;
                    level.enterRoom(rid, s.game);
                    const rect = level.cameraBounds;
                    s.player.rig.position.set((rect.minX + rect.maxX) / 2, 1.95, (rect.minZ + rect.maxZ) / 2);
                }
            }, levelId, room);
            await sleep(900);
            await page.screenshot({ path: `docs/media/w-gate/${file}` });
            console.log('shot', file);
        }
        // Map overlay shot (dungeon view)
        await page.evaluate(() => {
            const s = window.__sovereignScar;
            s.mapScreen.open(s.game);
        });
        await sleep(400);
        await page.screenshot({ path: 'docs/media/w-gate/beat01-map.png' });
        console.log('shot beat01-map.png');
    } finally {
        try { await browser?.close(); } catch (_) {}
        await server.close();
    }
}
main().catch((e) => { console.error(e); process.exit(1); });
