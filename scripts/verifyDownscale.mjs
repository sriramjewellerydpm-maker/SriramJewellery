/**
 * Runs the REAL downscale over the real fixtures in a real browser, writes the
 * output files out, and then decodes those output files to see what is
 * actually in them.
 *
 * The point is that none of this is asserted from logic. The orientation check
 * reads the colour at each quadrant centre of the produced file: if a photo
 * came out rotated, the colours are in the wrong corners and the report says
 * so. canvas and EXIF cannot run in node, so Chromium runs them.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { QUADRANTS } from "./imageFixtures.mjs";

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), "..");
const OUT = path.join(ROOT, "tmp/downscale");
const FIXTURES = path.join(OUT, "fixtures");
const RESULTS = path.join(OUT, "output");

/** What each fixture should look like once it is the right way up. */
const EXPECTED_CORNERS = {
  "exif1-upright.jpg": ["topLeft", "topRight", "bottomLeft", "bottomRight"],
  // 90° clockwise: the stored top-left corner ends up top-right.
  "exif6-portrait.jpg": ["bottomLeft", "topLeft", "bottomRight", "topRight"],
  // 90° anticlockwise.
  "exif8-portrait.jpg": ["topRight", "bottomRight", "topLeft", "bottomLeft"],
  // Mirrored horizontally.
  "exif2-mirrored.jpg": ["topRight", "topLeft", "bottomRight", "bottomLeft"],
};

const bundle = () => {
  execFileSync("npx", [
    "esbuild",
    path.join(ROOT, "src/utils/downscaleImage.js"),
    "--bundle",
    "--format=iife",
    "--global-name=DS",
    `--outfile=${path.join(OUT, "bundle.js")}`,
    "--log-level=error",
  ], { cwd: ROOT, stdio: "inherit" });
  execFileSync("npx", [
    "esbuild",
    path.join(ROOT, "src/utils/exifOrientation.js"),
    "--bundle",
    "--format=iife",
    "--global-name=EXIF",
    `--outfile=${path.join(OUT, "exif.js")}`,
    "--log-level=error",
  ], { cwd: ROOT, stdio: "inherit" });
};

/**
 * Where each stored corner must end up, per the EXIF specification.
 * 1 none · 2 mirror-H · 3 180° · 4 mirror-V · 5 transpose · 6 90°CW ·
 * 7 transverse · 8 90°CCW
 */
const TRANSFORM_EXPECTED = {
  1: ["topLeft", "topRight", "bottomLeft", "bottomRight"],
  2: ["topRight", "topLeft", "bottomRight", "bottomLeft"],
  3: ["bottomRight", "bottomLeft", "topRight", "topLeft"],
  4: ["bottomLeft", "bottomRight", "topLeft", "topRight"],
  5: ["topLeft", "bottomLeft", "topRight", "bottomRight"],
  6: ["bottomLeft", "topLeft", "bottomRight", "topRight"],
  7: ["bottomRight", "topRight", "bottomLeft", "topLeft"],
  8: ["topRight", "bottomRight", "topLeft", "bottomLeft"],
};

/**
 * Chromium always applies EXIF itself and ignores imageOrientation:"none",
 * so no JPEG fed to it can exercise our own transform. This drives that code
 * with RAW pixels instead — an ImageBitmap built from an ImageData that never
 * went near a JPEG decoder — which is exactly the state a browser that does
 * NOT auto-orient would hand us.
 */
const verifyTransforms = async (page, QUADRANTS) => {
  const got = await page.evaluate(async ({ QUADRANTS }) => {
    const W = 400, H = 200;
    const src = document.createElement("canvas");
    src.width = W; src.height = H;
    const sctx = src.getContext("2d");
    sctx.fillStyle = QUADRANTS.topLeft;     sctx.fillRect(0, 0, W / 2, H / 2);
    sctx.fillStyle = QUADRANTS.topRight;    sctx.fillRect(W / 2, 0, W / 2, H / 2);
    sctx.fillStyle = QUADRANTS.bottomLeft;  sctx.fillRect(0, H / 2, W / 2, H / 2);
    sctx.fillStyle = QUADRANTS.bottomRight; sctx.fillRect(W / 2, H / 2, W / 2, H / 2);
    const bitmap = await createImageBitmap(src);

    const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const nearest = ([r, g, b]) => {
      let best = null, bestD = Infinity;
      for (const [key, value] of Object.entries(QUADRANTS)) {
        const [vr, vg, vb] = hex(value);
        const d = (r - vr) ** 2 + (g - vg) ** 2 + (b - vb) ** 2;
        if (d < bestD) { bestD = d; best = key; }
      }
      return best;
    };

    const out = {};
    for (let o = 1; o <= 8; o += 1) {
      const rotates = window.EXIF.swapsAxes(o);
      const dw = rotates ? H : W;
      const dh = rotates ? W : H;
      const c = document.createElement("canvas");
      c.width = dw; c.height = dh;
      const ctx = c.getContext("2d");
      // The same two calls downscaleImage makes, in the same order.
      ctx.setTransform(...window.EXIF.orientationTransform(o, dw, dh));
      ctx.drawImage(bitmap, 0, 0, rotates ? dh : dw, rotates ? dw : dh);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const at = (fx, fy) => {
        const d = ctx.getImageData(Math.floor(dw * fx), Math.floor(dh * fy), 1, 1).data;
        return nearest([d[0], d[1], d[2]]);
      };
      out[o] = { size: [dw, dh], corners: [at(0.25, 0.25), at(0.75, 0.25), at(0.25, 0.75), at(0.75, 0.75)] };
    }
    bitmap.close?.();
    return out;
  }, { QUADRANTS });

  console.log("\nAll eight orientation transforms, driven with raw pixels");
  console.log("(the fallback path, which no JPEG can reach in Chromium)\n");
  console.log("  VALUE  OUTPUT     CORNERS (TL/TR/BL/BR)                              RESULT");
  console.log("  " + "─".repeat(96));
  let failures = 0;
  const short = { topLeft: "TL", topRight: "TR", bottomLeft: "BL", bottomRight: "BR" };
  for (let o = 1; o <= 8; o += 1) {
    const r = got[o];
    const expected = TRANSFORM_EXPECTED[o];
    const ok = r.corners.join() === expected.join();
    if (!ok) failures += 1;
    const corners = r.corners.map((c) => short[c]).join(" ");
    const exp = expected.map((c) => short[c]).join(" ");
    console.log(
      `  ${String(o).padEnd(6)} ${`${r.size[0]}×${r.size[1]}`.padEnd(10)} ` +
      `${corners.padEnd(50)} ${ok ? "correct ✓" : `WRONG — expected ${exp}`}`
    );
  }
  console.log(`\n  ${8 - failures}/8 transforms correct`);
  return failures;
};

const run = async () => {
  await fs.mkdir(RESULTS, { recursive: true });
  bundle();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>downscale verification</title>");
  await page.addScriptTag({ path: path.join(OUT, "bundle.js") });
  await page.addScriptTag({ path: path.join(OUT, "exif.js") });

  const probe = await page.evaluate(() => window.DS.browserAppliesExif());
  console.log(`\nChromium applies EXIF orientation when decoding: ${probe}`);
  console.log("(measured by the 2×1 probe, not assumed)\n");

  const names = (await fs.readdir(FIXTURES)).filter((f) => /\.(jpg|png)$/.test(f) && !f.startsWith("probe"));
  const report = [];

  for (const name of names.sort()) {
    const bytes = await fs.readFile(path.join(FIXTURES, name));
    const mime = name.endsWith(".png") ? "image/png" : "image/jpeg";

    const result = await page.evaluate(
      async ({ name, mime, data, QUADRANTS }) => {
        const file = new File([new Uint8Array(data)], name, { type: mime });

        // What the browser reports for the INPUT, for the before/after columns.
        const inBitmap = await createImageBitmap(file);
        const before = { width: inBitmap.width, height: inBitmap.height, bytes: file.size };
        inBitmap.close?.();

        const out = await window.DS.downscaleImage(file, { maxBytes: 2 * 1024 * 1024 });
        if (!out) return { skipped: true, before };

        // Decode the FILE WE PRODUCED and look at it.
        const outBitmap = await createImageBitmap(out);
        const c = document.createElement("canvas");
        c.width = outBitmap.width;
        c.height = outBitmap.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(outBitmap, 0, 0);

        const at = (fx, fy) => {
          const d = ctx.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data;
          return [d[0], d[1], d[2], d[3]];
        };
        // Quadrant centres, well away from JPEG edge ringing.
        const corners = {
          topLeft: at(0.25, 0.25),
          topRight: at(0.75, 0.25),
          bottomLeft: at(0.25, 0.75),
          bottomRight: at(0.75, 0.75),
        };

        const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
        const nearest = ([r, g, b]) => {
          let best = null, bestD = Infinity;
          for (const [key, value] of Object.entries(QUADRANTS)) {
            const [vr, vg, vb] = hex(value);
            const d = (r - vr) ** 2 + (g - vg) ** 2 + (b - vb) ** 2;
            if (d < bestD) { bestD = d; best = key; }
          }
          return Math.sqrt(bestD) < 110 ? best : `other(${r},${g},${b})`;
        };

        const bufferOut = new Uint8Array(await out.arrayBuffer());
        outBitmap.close?.();
        return {
          skipped: false,
          before,
          after: { width: c.width, height: c.height, bytes: out.size, type: out.type, name: out.name },
          cornerNames: Object.fromEntries(Object.entries(corners).map(([k, v]) => [k, nearest(v)])),
          alpha: Object.fromEntries(Object.entries(corners).map(([k, v]) => [k, v[3]])),
          data: Array.from(bufferOut),
        };
      },
      { name, mime, data: Array.from(bytes), QUADRANTS }
    );

    if (!result.skipped) {
      await fs.writeFile(path.join(RESULTS, result.after.name), Buffer.from(result.data));
      delete result.data;
    }
    report.push({ name, ...result });
  }

  const transformFailures = await verifyTransforms(page, QUADRANTS);
  await browser.close();

  // ─── the report ───────────────────────────────────────────────────────────
  const kb = (b) => `${(b / 1024).toFixed(0)}KB`;
  console.log("FIXTURE                  INPUT              OUTPUT                    RESULT");
  console.log("─".repeat(104));
  for (const r of report) {
    const input = `${r.before.width}×${r.before.height} ${kb(r.before.bytes)}`.padEnd(18);
    if (r.skipped) {
      console.log(`${r.name.padEnd(24)} ${input} ${"— not re-encoded —".padEnd(25)} left untouched`);
      continue;
    }
    const output = `${r.after.width}×${r.after.height} ${kb(r.after.bytes)} ${r.after.type.replace("image/", "")}`.padEnd(25);
    let verdict = "";
    const expected = EXPECTED_CORNERS[r.name];
    if (expected) {
      const got = [r.cornerNames.topLeft, r.cornerNames.topRight, r.cornerNames.bottomLeft, r.cornerNames.bottomRight];
      verdict = got.join() === expected.join()
        ? "upright ✓"
        : `WRONG — corners ${got.join("/")}, expected ${expected.join("/")}`;
    } else if (r.name === "transparent.png") {
      const kept = Object.values(r.alpha).some((a) => a < 255);
      verdict = kept ? `transparency kept ✓ (alpha ${Object.values(r.alpha).join("/")})` : "TRANSPARENCY LOST";
    } else if (r.name === "opaque.png") {
      verdict = r.after.type === "image/jpeg" ? "re-encoded to JPEG ✓" : `stayed ${r.after.type}`;
    } else {
      verdict = `name ${r.after.name}`;
    }
    console.log(`${r.name.padEnd(24)} ${input} ${output} ${verdict}`);
  }
  console.log("\nOutput files written to tmp/downscale/output/ — open them and look.");
  if (transformFailures) process.exitCode = 1;
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) await run();
