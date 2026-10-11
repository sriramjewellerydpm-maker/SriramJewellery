/**
 * Real image fixtures for the downscale verification.
 *
 * Canvas in a headless Chromium produces the pixels; the EXIF APP1 segment is
 * then written in by hand, because nothing in the browser can set it. No image
 * library is involved, so there is nothing to install and nothing to trust.
 *
 * Every fixture is drawn as four coloured quadrants, which is what makes a
 * rotation observable: if the colours come back in the wrong corners, the
 * orientation handling is wrong.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const QUADRANTS = {
  topLeft: "#ff0000",     // red
  topRight: "#00c000",    // green
  bottomLeft: "#0000ff",  // blue
  bottomRight: "#ffd800", // yellow
};

/**
 * An EXIF APP1 segment carrying nothing but the orientation tag, inserted
 * directly after the SOI marker.
 *
 *   FFE1 <len>  "Exif\0\0"  "II" 2A00 <ifd0 at 8>
 *   <1 entry>  tag 0112, type 3 (SHORT), count 1, value
 *   <next IFD = 0>
 */
export const withExifOrientation = (jpegBytes, orientation) => {
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw new Error("not a JPEG — no SOI marker");
  }
  const payload = Buffer.alloc(32);
  payload.write("Exif\0\0", 0, "latin1");
  payload.write("II", 6, "latin1");
  payload.writeUInt16LE(0x002a, 8);
  payload.writeUInt32LE(8, 10); // IFD0 begins 8 bytes into the TIFF header
  payload.writeUInt16LE(1, 14); // one entry
  payload.writeUInt16LE(0x0112, 16); // Orientation
  payload.writeUInt16LE(3, 18); // SHORT
  payload.writeUInt32LE(1, 20); // count
  payload.writeUInt16LE(orientation, 24);
  payload.writeUInt32LE(0, 28); // no next IFD

  const segment = Buffer.concat([
    Buffer.from([0xff, 0xe1]),
    (() => {
      const len = Buffer.alloc(2);
      len.writeUInt16BE(payload.length + 2);
      return len;
    })(),
    payload,
  ]);

  return Buffer.concat([
    Buffer.from(jpegBytes.subarray(0, 2)), // SOI
    segment,
    Buffer.from(jpegBytes.subarray(2)),
  ]);
};

/** Draws the quadrant pattern at a given size and encodes it. */
const render = (page, width, height, mime, { transparent = false, quality } = {}) =>
  page.evaluate(
    async ({ width, height, mime, transparent, quality, QUADRANTS }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const hw = Math.ceil(width / 2);
      const hh = Math.ceil(height / 2);

      if (transparent) {
        // Opposite corners left fully see-through, so black fill is obvious.
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = QUADRANTS.topLeft;
        ctx.fillRect(0, 0, hw, hh);
        ctx.fillStyle = QUADRANTS.bottomRight;
        ctx.fillRect(hw, hh, width - hw, height - hh);
      } else {
        ctx.fillStyle = QUADRANTS.topLeft;
        ctx.fillRect(0, 0, hw, hh);
        ctx.fillStyle = QUADRANTS.topRight;
        ctx.fillRect(hw, 0, width - hw, hh);
        ctx.fillStyle = QUADRANTS.bottomLeft;
        ctx.fillRect(0, hh, hw, height - hh);
        ctx.fillStyle = QUADRANTS.bottomRight;
        ctx.fillRect(hw, hh, width - hw, height - hh);
      }

      // Noise, so a photographic JPEG does not compress to nothing and the
      // size numbers in the report mean something.
      if (mime === "image/jpeg") {
        const img = ctx.getImageData(0, 0, width, height);
        for (let i = 0; i < img.data.length; i += 4) {
          const n = (Math.random() * 24) | 0;
          img.data[i] = Math.min(255, img.data[i] + n);
          img.data[i + 1] = Math.min(255, img.data[i + 1] + n);
          img.data[i + 2] = Math.min(255, img.data[i + 2] + n);
        }
        ctx.putImageData(img, 0, 0);
      }

      const blob = await new Promise((r) => canvas.toBlob(r, mime, quality));
      const buffer = await blob.arrayBuffer();
      return Array.from(new Uint8Array(buffer));
    },
    { width, height, mime, transparent, quality, QUADRANTS }
  );

export const generateFixtures = async (outDir) => {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>fixtures</title>");

  const write = async (name, bytes) => {
    const file = path.join(outDir, name);
    await fs.writeFile(file, Buffer.from(bytes));
    return { name, bytes: Buffer.from(bytes).length };
  };

  const made = [];

  // Stored landscape, displayed portrait once the tag is honoured.
  const landscape = await render(page, 3000, 2000, "image/jpeg", { quality: 0.9 });
  made.push(await write("exif6-portrait.jpg", withExifOrientation(Uint8Array.from(landscape), 6)));
  made.push(await write("exif8-portrait.jpg", withExifOrientation(Uint8Array.from(landscape), 8)));
  // A reflection, which most implementations skip entirely.
  made.push(await write("exif2-mirrored.jpg", withExifOrientation(Uint8Array.from(landscape), 2)));
  made.push(await write("exif1-upright.jpg", Buffer.from(landscape)));

  made.push(await write("transparent.png", await render(page, 2400, 1600, "image/png", { transparent: true })));
  made.push(await write("opaque.png", await render(page, 2400, 1600, "image/png")));
  made.push(await write("panorama-wide.jpg", await render(page, 5000, 800, "image/jpeg", { quality: 0.9 })));
  made.push(await write("panorama-tall.jpg", await render(page, 800, 5000, "image/jpeg", { quality: 0.9 })));
  made.push(await write("already-small.jpg", await render(page, 400, 300, "image/jpeg", { quality: 0.7 })));

  // The 2×1 probe the downscaler uses to ask whether this browser applies EXIF.
  const probe = await render(page, 2, 1, "image/jpeg", { quality: 0.9 });
  const probeWithExif = withExifOrientation(Uint8Array.from(probe), 6);
  made.push(await write("probe-2x1-exif6.jpg", probeWithExif));
  await fs.writeFile(path.join(outDir, "probe.base64.txt"), probeWithExif.toString("base64"));

  await browser.close();
  return made;
};

// pathToFileURL, not a template string: this repo's path contains a space,
// which import.meta.url percent-encodes and a hand-built file:// URL does not.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] || "tmp/downscale/fixtures";
  const made = await generateFixtures(out);
  for (const f of made) console.log(`  ${f.name.padEnd(24)} ${(f.bytes / 1024).toFixed(1)} KB`);
  console.log(`\n${made.length} fixtures in ${out}`);
}
