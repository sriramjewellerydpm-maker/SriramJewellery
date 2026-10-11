import { describe, it, expect } from "vitest";
import {
  ACCEPTED_IMAGE_TYPES,
  buildEntry,
  dedupeKeyOf,
  entryError,
  formatMB,
  makeMain,
  mergeSelection,
  removeAt,
  selectionBlockers,
  totalBytes,
} from "../../src/utils/imageSelection.js";
import {
  downscaleImage,
  fitWithin,
  shouldDownscale,
} from "../../src/utils/downscaleImage.js";

const MB = 1024 * 1024;
const TWO_MB = 2 * MB;

/** A File is only read for these four fields by the selection logic. */
const file = (name, mb, type = "image/jpeg", lastModified = 1_000) => ({
  name,
  size: Math.round(mb * MB),
  type,
  lastModified,
});

const pick = (current, files, opts) =>
  mergeSelection(current, files.map((f) => buildEntry(f)), opts);

describe("image selection — the picker's rules", () => {
  it("appends to the selection instead of replacing it", () => {
    const first = pick([], [file("a.jpg", 1)]).entries;
    const second = pick(first, [file("b.jpg", 1)]).entries;
    expect(second.map((e) => e.name)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("keeps 6 of 7 files and says how many were kept", () => {
    const seven = Array.from({ length: 7 }, (_, i) =>
      file(`p${i}.jpg`, 0.5, "image/jpeg", 1000 + i)
    );
    const { entries, rejected } = pick([], seven);
    expect(entries).toHaveLength(6);
    expect(rejected).toEqual([
      { name: "p6.jpg", reason: "over the 6-image limit" },
    ]);
  });

  it("keeps an oversized file in the list, flagged with the limit", () => {
    const { entries, rejected } = pick([], [file("huge.jpg", 2.1)]);
    expect(rejected).toEqual([]);
    expect(entries).toHaveLength(1);
    // Visible and removable, not silently dropped.
    expect(entries[0].error).toBe("2.1MB — over the 2.0MB limit");
  });

  it("keeps a non-image in the list with a reason", () => {
    const { entries } = pick([], [file("invoice.pdf", 0.2, "application/pdf")]);
    expect(entries[0].error).toBe("Not a JPEG, PNG or WebP (application/pdf)");
  });

  it("removes a file from the middle without disturbing the rest", () => {
    const { entries } = pick([], [
      file("a.jpg", 1, "image/jpeg", 1),
      file("b.jpg", 1, "image/jpeg", 2),
      file("c.jpg", 1, "image/jpeg", 3),
    ]);
    expect(removeAt(entries, 1).map((e) => e.name)).toEqual(["a.jpg", "c.jpg"]);
  });

  it("refuses the same file twice but allows it back after removal", () => {
    const a = file("ring.jpg", 1);
    const { entries } = pick([], [a]);

    const again = pick(entries, [a]);
    expect(again.entries).toHaveLength(1);
    expect(again.rejected[0].reason).toBe("already chosen");

    const afterRemoval = pick(removeAt(entries, 0), [a]);
    expect(afterRemoval.entries).toHaveLength(1);
    expect(afterRemoval.rejected).toEqual([]);
  });

  it("tells two different files with the same name apart", () => {
    const { entries } = pick([], [
      file("IMG_0001.jpg", 1, "image/jpeg", 111),
      file("IMG_0001.jpg", 1, "image/jpeg", 222),
    ]);
    expect(entries).toHaveLength(2);
    expect(dedupeKeyOf(file("x.jpg", 1))).toBe(`x.jpg:${MB}:1000`);
  });

  it("promotes any row to the listing image", () => {
    const { entries } = pick([], [
      file("a.jpg", 1, "image/jpeg", 1),
      file("b.jpg", 1, "image/jpeg", 2),
      file("c.jpg", 1, "image/jpeg", 3),
    ]);
    expect(makeMain(entries, 2).map((e) => e.name)).toEqual([
      "c.jpg",
      "a.jpg",
      "b.jpg",
    ]);
    // Slot 1 is already main, and out-of-range is a no-op.
    expect(makeMain(entries, 0)).toBe(entries);
    expect(makeMain(entries, 9)).toBe(entries);
  });

  it("states why Publish is unavailable, per count of offenders", () => {
    const one = pick([], [file("big.jpg", 3)]).entries;
    expect(selectionBlockers(one)).toEqual([
      '"big.jpg" cannot be uploaded — remove it to continue',
    ]);

    const two = pick([], [
      file("big.jpg", 3, "image/jpeg", 1),
      file("doc.pdf", 1, "application/pdf", 2),
    ]).entries;
    expect(selectionBlockers(two)).toEqual([
      "2 images cannot be uploaded — remove them to continue",
    ]);

    expect(selectionBlockers(pick([], [file("ok.jpg", 1)]).entries)).toEqual([]);
  });

  it("totals the bytes that will actually be uploaded", () => {
    const { entries } = pick([], [
      file("a.jpg", 1, "image/jpeg", 1),
      file("b.jpg", 0.5, "image/jpeg", 2),
    ]);
    expect(formatMB(totalBytes(entries))).toBe("1.5MB");
  });

  it("accepts exactly the three types Cloudinary is sent", () => {
    expect(ACCEPTED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(entryError(buildEntry(file("a.webp", 1, "image/webp")))).toBeNull();
    expect(entryError(buildEntry(file("a.gif", 1, "image/gif")))).toMatch(/Not a JPEG/);
  });
});

describe("downscaling before upload", () => {
  it("skips a photo already small enough and within the dimension cap", () => {
    expect(
      shouldDownscale(
        { size: 0.4 * MB, type: "image/jpeg", width: 1200, height: 900 },
        { maxBytes: TWO_MB }
      )
    ).toBe(false);
  });

  it("re-encodes an oversized photo, and an over-large one even when small", () => {
    expect(
      shouldDownscale(
        { size: 5 * MB, type: "image/jpeg", width: 1200, height: 900 },
        { maxBytes: TWO_MB }
      )
    ).toBe(true);
    expect(
      shouldDownscale(
        { size: 0.3 * MB, type: "image/jpeg", width: 4032, height: 3024 },
        { maxBytes: TWO_MB }
      )
    ).toBe(true);
  });

  it("never re-encodes something that is not one of the accepted types", () => {
    expect(
      shouldDownscale(
        { size: 9 * MB, type: "application/pdf", width: 4000, height: 4000 },
        { maxBytes: TWO_MB }
      )
    ).toBe(false);
  });

  it("preserves aspect ratio when fitting to 2000px", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 });
    // Already inside the box: returned untouched, not upscaled.
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("leaves the original alone where there is no canvas", async () => {
    await expect(
      downscaleImage(file("a.jpg", 5), { maxBytes: TWO_MB })
    ).resolves.toBeNull();
  });

  it("a 4.5MB-total selection fits once each file is re-encoded", () => {
    // Three 1.5MB phone photos: each under the per-file limit, 4.5MB together.
    const picked = [
      file("p1.jpg", 1.5, "image/jpeg", 1),
      file("p2.jpg", 1.5, "image/jpeg", 2),
      file("p3.jpg", 1.5, "image/jpeg", 3),
    ];
    expect(formatMB(totalBytes(pick([], picked).entries))).toBe("4.5MB");

    // What the picker stores after the canvas hands back a smaller file: the
    // compressed size is what counts toward the total and what is uploaded.
    const compressed = picked.map((f) =>
      buildEntry(f, { uploadFile: { ...f, size: 0.35 * MB, type: "image/jpeg" } })
    );
    const { entries } = mergeSelection([], compressed);
    expect(entries.every((e) => e.compressed)).toBe(true);
    expect(entries.every((e) => e.error === null)).toBe(true);
    expect(formatMB(totalBytes(entries))).toBe("1.0MB");
    expect(entries[0].originalSize).toBe(Math.round(1.5 * MB));
  });
});
