/**
 * Shrink a photo in the browser before it is uploaded.
 *
 * The 2MB per-file limit used to be the shop owner's problem to solve: a phone
 * or WhatsApp photo arrives at 3–8MB and the form could only say so. Re-encoding
 * to 2000px / JPEG 0.85 here puts almost all of them comfortably under it, so
 * the limit stops being something they have to work around.
 *
 * Nothing about the upload itself changes — the signed direct-to-Cloudinary
 * route and its config are untouched. This only decides what bytes go into it.
 */

import { ACCEPTED_IMAGE_TYPES } from "./imageSelection";

export const MAX_IMAGE_DIMENSION = 2000;
export const JPEG_QUALITY = 0.85;

/**
 * Whether it is worth re-encoding at all. A file already small enough and
 * already within the dimension cap is left exactly as it is — re-encoding it
 * would only lose detail for nothing.
 */
export const shouldDownscale = (
  { size, type, width, height },
  { maxBytes, maxDimension = MAX_IMAGE_DIMENSION } = {}
) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(type)) return false;
  const oversize = size > maxBytes;
  const overlarge =
    (width || 0) > maxDimension || (height || 0) > maxDimension;
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

/**
 * @returns {Promise<File|null>} a smaller JPEG, or null when the original
 * should be kept — already small enough, unreadable, or the re-encode came out
 * no better, which happens with flat graphics that PNG stores more tightly.
 */
export const downscaleImage = async (
  file,
  { maxBytes, maxDimension = MAX_IMAGE_DIMENSION, quality = JPEG_QUALITY } = {}
) => {
  if (typeof document === "undefined") return null;

  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    // Left to the upload to refuse, rather than failing the whole selection.
    return null;
  }

  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;

  if (
    !shouldDownscale(
      { size: file.size, type: file.type, width: sourceWidth, height: sourceHeight },
      { maxBytes, maxDimension }
    )
  ) {
    bitmap.close?.();
    return null;
  }

  const { width, height } = fitWithin(sourceWidth, sourceHeight, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // JPEG has no alpha: without this, a transparent PNG background comes out
  // black instead of the white these product shots are taken on.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob || blob.size >= file.size) return null;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
};
