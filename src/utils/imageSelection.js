/**
 * The product image selection, as data.
 *
 * The picker used to render `input.files` straight from the DOM. A FileList is
 * read-only, so removing one oversized file out of six meant re-picking all
 * six. Everything here operates on a plain array instead, which the form holds
 * in state and is the single source of truth for both the list and the upload.
 *
 * Kept free of React and of browser APIs — no object URLs, no canvas — so the
 * rules below are unit-testable in the node suite. The component owns the
 * parts that need a DOM.
 */

import { MAX_IMAGE_BYTES } from "./uploadToCloudinary";
import { MAX_PRODUCT_IMAGES } from "../../shared/productImages.js";

/**
 * What Cloudinary is actually sent. The file dialog's `accept` attribute is a
 * filter, not a guarantee — "All files" in the OS dialog defeats it — so the
 * type is checked here as well.
 */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

/** Identity for dedupe. The same photo picked twice should not upload twice. */
export const dedupeKeyOf = (file) =>
  `${file.name}:${file.size}:${file.lastModified}`;

/**
 * Why this file cannot be uploaded, phrased for the shop owner, or null.
 * An invalid file still goes in the list so it can be seen and removed.
 */
export const entryError = (entry, maxBytes = MAX_IMAGE_BYTES) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(entry.type)) {
    return `Not a JPEG, PNG or WebP${entry.type ? ` (${entry.type})` : ""}`;
  }
  if (entry.size > maxBytes) {
    return `${formatMB(entry.size)} — over the ${formatMB(maxBytes)} limit`;
  }
  return null;
};

/**
 * One row of the list. `file` is what gets uploaded, which after downscaling is
 * not the file that was picked; `originalSize` is kept so the row can show the
 * saving rather than silently reporting a different number than the OS does.
 */
export const buildEntry = (file, { uploadFile = null, previewUrl = null } = {}) => {
  const upload = uploadFile || file;
  return {
    id: `${dedupeKeyOf(file)}:${Math.random().toString(36).slice(2, 8)}`,
    dedupeKey: dedupeKeyOf(file),
    name: file.name,
    type: upload.type || file.type,
    size: upload.size,
    originalSize: file.size,
    compressed: Boolean(uploadFile) && upload.size !== file.size,
    file: upload,
    previewUrl,
    error: null,
  };
};

/**
 * Append a new pick to what is already chosen, which is what a file input does
 * NOT do on its own. Returns the rejections separately: a file turned away for
 * exceeding the count has nowhere in the list to be shown.
 */
export const mergeSelection = (
  current,
  incoming,
  { maxCount = MAX_PRODUCT_IMAGES, maxBytes = MAX_IMAGE_BYTES } = {}
) => {
  const entries = [...current];
  const rejected = [];

  for (const entry of incoming) {
    if (entries.some((e) => e.dedupeKey === entry.dedupeKey)) {
      rejected.push({ name: entry.name, reason: "already chosen" });
      continue;
    }
    if (entries.length >= maxCount) {
      rejected.push({ name: entry.name, reason: `over the ${maxCount}-image limit` });
      continue;
    }
    entries.push({ ...entry, error: entryError(entry, maxBytes) });
  }

  return { entries, rejected };
};

export const removeAt = (entries, index) => entries.filter((_, i) => i !== index);

/** Promote a row to slot 1, which is the image listings show. */
export const makeMain = (entries, index) => {
  if (index <= 0 || index >= entries.length) return entries;
  const next = [...entries];
  const [picked] = next.splice(index, 1);
  return [picked, ...next];
};

export const totalBytes = (entries) => entries.reduce((sum, e) => sum + e.size, 0);

/**
 * Why the form cannot be submitted yet, as sentences to put beside the button.
 * A disabled button with no stated reason is the thing this replaces.
 */
export const selectionBlockers = (
  entries,
  { maxCount = MAX_PRODUCT_IMAGES } = {}
) => {
  const blockers = [];
  const invalid = entries.filter((e) => e.error);
  if (invalid.length) {
    blockers.push(
      invalid.length === 1
        ? `"${invalid[0].name}" cannot be uploaded — remove it to continue`
        : `${invalid.length} images cannot be uploaded — remove them to continue`
    );
  }
  if (entries.length > maxCount) {
    blockers.push(`Only ${maxCount} images are allowed`);
  }
  return blockers;
};
