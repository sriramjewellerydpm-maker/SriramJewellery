/**
 * The EXIF orientation tag, read from JPEG bytes.
 *
 * Why this exists: a canvas re-encode throws EXIF away. A phone photo whose
 * pixels are stored sideways and corrected by an orientation tag looks right
 * in the file picker and comes out rotated once re-encoded — and the tag that
 * said how to fix it is gone, so the damage is permanent.
 *
 * A minimal APP1 reader is enough for one tag; nothing here needs a full EXIF
 * library. Deliberately free of browser APIs: it takes an ArrayBuffer, so the
 * node suite can read real fixture files through it.
 */

/** The eight values the tag can carry. 1 means "already upright". */
export const ORIENTATION_VALUES = [1, 2, 3, 4, 5, 6, 7, 8];

/** Orientations 5–8 exchange width for height when displayed. */
export const swapsAxes = (orientation) => orientation >= 5 && orientation <= 8;

const SOI = 0xffd8;
const APP1 = 0xffe1;
const ORIENTATION_TAG = 0x0112;

/**
 * @param {ArrayBuffer|Uint8Array} input JPEG bytes (the whole file, or enough
 *   of its head to contain APP1 — 64KB is always enough)
 * @returns {number} 1–8, defaulting to 1 for anything unreadable. Never throws:
 *   a corrupt header must not fail the whole selection, and treating it as
 *   upright is what every other reader does.
 */
export const parseExifOrientation = (input) => {
  try {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.byteLength < 4 || view.getUint16(0) !== SOI) return 1;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      // Markers are 0xFFxx. Anything else means we have lost the frame.
      if ((marker & 0xff00) !== 0xff00) return 1;
      const length = view.getUint16(offset + 2);
      if (length < 2) return 1;

      if (marker === APP1) {
        const exifStart = offset + 4;
        // "Exif\0\0" — an APP1 that is XMP rather than EXIF starts differently.
        if (
          exifStart + 6 <= view.byteLength &&
          view.getUint32(exifStart) === 0x45786966 &&
          view.getUint16(exifStart + 4) === 0x0000
        ) {
          return readTiffOrientation(view, exifStart + 6);
        }
      }

      // Start of frame: the image data begins and there is no EXIF after it.
      if (marker === 0xffda) return 1;
      offset += 2 + length;
    }
    return 1;
  } catch {
    return 1;
  }
};

/** Walks IFD0 for tag 0x0112. `tiff` is the offset of the TIFF header. */
const readTiffOrientation = (view, tiff) => {
  if (tiff + 8 > view.byteLength) return 1;

  const byteOrder = view.getUint16(tiff);
  // "II" little-endian (Intel), "MM" big-endian (Motorola).
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return 1;
  if (view.getUint16(tiff + 2, little) !== 0x002a) return 1;

  const ifd0 = tiff + view.getUint32(tiff + 4, little);
  if (ifd0 + 2 > view.byteLength) return 1;

  const entries = view.getUint16(ifd0, little);
  for (let i = 0; i < entries; i += 1) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > view.byteLength) return 1;
    if (view.getUint16(entry, little) === ORIENTATION_TAG) {
      // Type 3 (SHORT); the value sits in the first 2 bytes of the value field.
      const value = view.getUint16(entry + 8, little);
      return ORIENTATION_VALUES.includes(value) ? value : 1;
    }
  }
  return 1;
};

/**
 * The canvas transform that puts an image the right way up, for a canvas
 * already sized to the DISPLAY dimensions.
 *
 * Returned as the six arguments of setTransform. All eight values are covered,
 * including the four reflections (2, 4, 5, 7) that most code skips — they are
 * rare but they do occur, and a mirrored product photo is still wrong.
 *
 * @param {number} w display width  (post-rotation)
 * @param {number} h display height (post-rotation)
 */
export const orientationTransform = (orientation, w, h) => {
  switch (orientation) {
    case 2: return [-1, 0, 0, 1, w, 0];  // mirror horizontally
    case 3: return [-1, 0, 0, -1, w, h]; // 180°
    case 4: return [1, 0, 0, -1, 0, h];  // mirror vertically
    case 5: return [0, 1, 1, 0, 0, 0];   // transpose
    case 6: return [0, 1, -1, 0, w, 0];  // 90° clockwise
    case 7: return [0, -1, -1, 0, w, h]; // transverse
    case 8: return [0, -1, 1, 0, 0, h];  // 90° anticlockwise
    default: return [1, 0, 0, 1, 0, 0];
  }
};
