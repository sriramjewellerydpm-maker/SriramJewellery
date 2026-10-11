/**
 * Does the picker release every object URL it makes?
 *
 * A leak here is invisible until the shop owner has edited twenty products in
 * one session, so it is counted rather than reasoned about: createObjectURL
 * and revokeObjectURL are wrapped, the real component is driven through each
 * path, and the two numbers are compared.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), "..");
const OUT = path.join(ROOT, "tmp/downscale");
const FIX = path.join(OUT, "fixtures");

const stats = (page) => page.evaluate(() => ({ ...window.__urlStats, live: window.__urlStats.live.size }));

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>url lifecycle</title><div id="root"></div>');
  await page.addScriptTag({ path: path.join(OUT, "urlBundle.js") });
  await page.waitForSelector('input[type="file"]');

  const steps = [];
  const record = async (label) => steps.push({ label, ...(await stats(page)) });

  await record("after mount");

  // Pick four.
  await page.setInputFiles('input[type="file"]', [
    path.join(FIX, "exif1-upright.jpg"),
    path.join(FIX, "exif6-portrait.jpg"),
    path.join(FIX, "opaque.png"),
    path.join(FIX, "transparent.png"),
  ]);
  await page.waitForFunction(() => window.__entries?.length === 4);
  await record("4 files chosen");

  // Remove the middle one.
  await page.locator('button[aria-label^="Remove"]').nth(1).click();
  await page.waitForFunction(() => window.__entries?.length === 3);
  await record("one removed");

  // Promote a row — a reorder must NOT revoke anything.
  await page.locator('button:has-text("Make main")').first().click();
  await page.waitForTimeout(100);
  await record("row promoted");

  // Pick a file already chosen: the duplicate is refused, and the preview URL
  // built for it must not be left behind.
  await page.setInputFiles('input[type="file"]', [path.join(FIX, "exif1-upright.jpg")]);
  await page.waitForTimeout(400);
  await record("duplicate refused");

  // What a successful save does.
  await page.evaluate(() => window.__setEntries([]));
  await page.waitForFunction(() => window.__entries?.length === 0);
  await record("selection cleared (saved)");

  // Pick again, then unmount with files still in the list.
  await page.setInputFiles('input[type="file"]', [
    path.join(FIX, "exif8-portrait.jpg"),
    path.join(FIX, "panorama-wide.jpg"),
  ]);
  await page.waitForFunction(() => window.__entries?.length === 2);
  await record("2 more chosen");
  await page.evaluate(() => window.__unmount());
  await page.waitForTimeout(100);
  await record("unmounted");

  await browser.close();

  console.log("\n  STEP                        CREATED  REVOKED  STILL LIVE");
  console.log("  " + "─".repeat(58));
  for (const s of steps) {
    console.log(`  ${s.label.padEnd(27)} ${String(s.created).padStart(5)}  ${String(s.revoked).padStart(7)}  ${String(s.live).padStart(10)}`);
  }
  const final = steps[steps.length - 1];
  const leaked = final.live;
  console.log(`\n  ${leaked === 0 ? "No leak: every URL released ✓" : `LEAK: ${leaked} object URL(s) never revoked`}`);
  if (leaked !== 0) process.exitCode = 1;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) await run();
