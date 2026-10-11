/**
 * Shrink a photo in the browser before it is uploaded.
 *
 * The 2MB per-file limit used to be the shop owner's problem to solve: a phone
 * or WhatsApp photo arrives at 3–8MB and the form could only say so. Re-encoding
 * to 2000px here puts almost all of them comfortably under it, so the limit
 * stops being something they have to work around.
 *
 * Nothing about the upload itself changes — the signed direct-to-Cloudinary
 * route and its config are untouched. This only decides what bytes go into it.
 *
 * ── Two things a canvas re-encode gets wrong unless handled ────────────────
 *
 * EXIF orientation. The canvas keeps pixels and drops metadata, so a photo
 * stored sideways with an orientation tag correcting it comes out rotated, and
 * the tag that said how to fix it is gone. All eight values are applied here,
 * reflections included.
 *
 * Alpha. JPEG has no alpha channel, so a transparent PNG re-encoded as JPEG
 * gets black where it was see-through. Painting a flat colour instead is no
 * answer for THIS site: product images sit on #fcf2e3 on a card, #f7edde on
 * the detail page and on its thumbnails, so any single fill is visibly wrong
 * in at least one of the three. A PNG that really is transparent therefore
 * stays a PNG; one that is not is re-encoded to JPEG for the size.
 */

import { ACCEPTED_IMAGE_TYPES } from "./imageSelection";
import {
  orientationTransform,
  parseExifOrientation,
  swapsAxes,
} from "./exifOrientation";

export const MAX_IMAGE_DIMENSION = 2000;
export const JPEG_QUALITY = 0.85;

/** Only a JPEG carries the orientation tag; PNG and WebP do not. */
const carriesExif = (type) => type === "image/jpeg";

/**
 * Whether it is worth re-encoding at all. A file already small enough and
 * already within the dimension cap is left exactly as it is — re-encoding it
 * would only lose detail for nothing.
 *
 * Takes DISPLAY dimensions: a 4000×2000 photo tagged "rotate 90°" is 2000×4000
 * on screen, and it is the displayed size that has to fit.
 */
export const shouldDownscale = (
  { size, type, width, height },
  { maxBytes, maxDimension = MAX_IMAGE_DIMENSION } = {}
) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(type)) return false;
  const oversize = size > maxBytes;
  const overlarge = (width || 0) > maxDimension || (height || 0) > maxDimension;
  return oversize || overlarge;
};

/** Target pixel size, aspect ratio preserved. */
export const fitWithin = (width, height, maxDimension = MAX_IMAGE_DIMENSION) => {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/** Swap the extension to match the bytes actually produced. */
export const renameFor = (name, mime) => {
  const extension = mime === "image/png" ? ".png" : ".jpg";
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return base + extension;
};

/**
 * Does this browser apply EXIF orientation itself when decoding?
 *
 * It matters because the answer decides whether our own transform is the fix
 * or a second rotation on top of the browser's. The spec default for
 * `imageOrientation` changed from "none" to "from-image" partway through its
 * life and browsers followed at different times, so neither assuming nor
 * passing an option is reliable — this asks instead.
 *
 * The probe is a 2×1 JPEG tagged "rotate 90°". A browser that honours the tag
 * decodes it as 1×2. Measured once and remembered.
 */
const ORIENTATION_PROBE =
  "data:image/jpeg;base64,/9j/4QAiRXhpZgAASUkqAAgAAAABABIBAwABAAAABgAAAAAAAAD/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAbEAEAAAcAAAAAAAAAAAAAAAAAAQIEBTVzsv/EABQBAQAAAAAAAAAAAAAAAAAAAAj/xAAeEQABAQkAAAAAAAAAAAAAAAAAAwECBAYyNXFzsv/aAAwDAQACEQMRAD8AlrZjaTTJzAAWFK3shLmK9Ru1Ttp//9k=";

let probedAutoOrient = null;

export const browserAppliesExif = async () => {
  if (probedAutoOrient !== null) return probedAutoOrient;
  try {
    const blob = await (await fetch(ORIENTATION_PROBE)).blob();
    const bitmap = await createImageBitmap(blob);
    // Stored 2×1; reported 1×2 means the browser rotated it for us.
    probedAutoOrient = bitmap.height > bitmap.width;
    bitmap.close?.();
  } catch {
    // Unreadable probe: assume the browser does nothing and let our own
    // transform do the work. Being wrong this way leaves the image upright
    // for the majority of files, which carry no orientation tag at all.
    probedAutoOrient = false;
  }
  return probedAutoOrient;
};

/** Test seam: lets the verification harness force either branch. */
export const __setBrowserAppliesExif = (value) => {
  probedAutoOrient = value;
};

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // Safari below 17 has no createImageBitmap for File input.
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read this image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** True as soon as one pixel is not fully opaque. */
const hasAlpha = (ctx, width, height) => {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
};

/**
 * @returns {Promise<File|null>} a smaller file, or null when the original
 * should be kept — already small enough, unreadable, or the re-encode came out
 * no better, which happens with flat graphics that PNG already stores tightly.
 */
export const downscaleImage = async (
  file,
  { maxBytes, maxDimension = MAX_IMAGE_DIMENSION, quality = JPEG_QUALITY } = {}
) => {
  if (typeof document === "undefined") return null;
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return null;

  // The orientation tag is read from the bytes before anything decodes them.
  let orientation = 1;
  if (carriesExif(file.type)) {
    try {
      // 64KB is always enough to hold APP1; reading the whole file would mean
      // holding a second copy of an 8MB photo in memory for one tag.
      const head = await file.slice(0, 65536).arrayBuffer();
      orientation = parseExifOrientation(head);
    } catch {
      orientation = 1;
    }
  }

  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    // Left to the upload to refuse, rather than failing the whole selection.
    return null;
  }

  // If the browser already applied the tag while decoding, the bitmap is
  // upright and applying the transform again would rotate it twice.
  const applied = orientation !== 1 && (await browserAppliesExif());
  const effective = applied ? 1 : orientation;

  // Display dimensions. The bitmap is upright when the browser did the work,
  // so its own width and height are already the displayed ones.
  const rotates = swapsAxes(effective);
  const displayWidth = rotates ? bitmap.height : bitmap.width;
  const displayHeight = rotates ? bitmap.width : bitmap.height;

  const needsRotation = effective !== 1;
  if (
    !needsRotation &&
    !shouldDownscale(
      { size: file.size, type: file.type, width: displayWidth, height: displayHeight },
      { maxBytes, maxDimension }
    )
  ) {
    // Small enough, upright, and within the cap: left exactly as it is.
    bitmap.close?.();
    return null;
  }

  const { width, height } = fitWithin(displayWidth, displayHeight, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(...orientationTransform(effective, width, height));
  // Drawn in source space: a 90° turn exchanges the two extents.
  ctx.drawImage(bitmap, 0, 0, rotates ? height : width, rotates ? width : height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  bitmap.close?.();

  // A JPEG never has alpha, so there is nothing to check and nothing to lose.
  const transparent = carriesExif(file.type) ? false : hasAlpha(ctx, width, height);
  const mime = transparent ? "image/png" : "image/jpeg";

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mime, mime === "image/jpeg" ? quality : undefined)
  );
  if (!blob) return null;
  // Bigger than what we started with is not an improvement — unless the image
  // had to be turned, in which case the rotation IS the point and the original
  // is simply wrong.
  if (blob.size >= file.size && !needsRotation) return null;

  return new File([blob], renameFor(file.name, mime), {
    type: mime,
    lastModified: file.lastModified,
  });
};
