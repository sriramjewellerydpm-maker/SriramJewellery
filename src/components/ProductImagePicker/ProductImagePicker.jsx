import React, { useCallback, useEffect, useRef, useState } from "react";
import { optimizeCloudinaryUrl } from "../../utils/cloudinaryImage";
import uploadIcon from "../../assets/image-upload.png";
import { MAX_IMAGE_BYTES } from "../../utils/uploadToCloudinary";
import { MAX_PRODUCT_IMAGES } from "../../../shared/productImages.js";
import { downscaleImage } from "../../utils/downscaleImage";
import {
  ACCEPTED_IMAGE_TYPES,
  buildEntry,
  formatMB,
  makeMain,
  mergeSelection,
  removeAt,
  selectionBlockers,
  totalBytes,
} from "../../utils/imageSelection";

/**
 * The product image picker.
 *
 * The selection lives in `entries` — a plain array the parent holds in state —
 * and the <input> only ever appends to it. That is the whole point of this
 * component: a FileList cannot be edited, so the old version could not remove
 * one bad file out of six.
 *
 * Rules live in utils/imageSelection.js so they can be tested without a DOM.
 * What stays here is what needs one: object URLs, the canvas downscale, and
 * clearing input.value so re-picking the same file fires onChange again.
 *
 * @param {object[]} entries        the current selection (source of truth)
 * @param {Function} onChange       receives the next selection
 * @param {string[]} existingImages already-saved image URLs, when editing
 * @param {string}   uploadingImage name of the file going up right now
 * @param {boolean}  disabled       the form is submitting
 * @param {string}   error          message from the parent's own validation
 * @param {number}   totalWarnBytes optional ceiling for the running total
 */
const ProductImagePicker = ({
  entries,
  onChange,
  existingImages = [],
  uploadingImage = null,
  disabled = false,
  error = null,
  maxCount = MAX_PRODUCT_IMAGES,
  maxBytes = MAX_IMAGE_BYTES,
  totalWarnBytes = null,
}) => {
  const inputRef = useRef(null);
  const createdUrls = useRef(new Set());
  const [rejected, setRejected] = useState([]);
  const [preparing, setPreparing] = useState(null);

  // Every object URL this component made, revoked as soon as it leaves the
  // selection — on removal, on replacement, and when the parent clears the
  // list after a successful save. One diff covers all three.
  useEffect(() => {
    const live = new Set(entries.map((e) => e.previewUrl).filter(Boolean));
    for (const url of createdUrls.current) {
      if (!live.has(url)) {
        URL.revokeObjectURL(url);
        createdUrls.current.delete(url);
      }
    }
  }, [entries]);

  useEffect(
    () => () => {
      for (const url of createdUrls.current) URL.revokeObjectURL(url);
      createdUrls.current.clear();
    },
    []
  );

  const handlePick = useCallback(
    async (event) => {
      const picked = Array.from(event.target.files || []);
      // Cleared immediately: without this, picking the same file again after
      // removing it is not a change event and nothing happens.
      event.target.value = "";
      if (!picked.length) return;

      const built = [];
      for (let i = 0; i < picked.length; i += 1) {
        const file = picked[i];
        setPreparing({ index: i + 1, of: picked.length, name: file.name });

        // Only images are worth handing to the canvas; anything else goes
        // into the list unchanged so its row can say why it is refused.
        let uploadFile = null;
        if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          try {
            uploadFile = await downscaleImage(file, { maxBytes });
          } catch (err) {
            console.error("Downscale failed, using the original:", err);
          }
        }

        const previewUrl = URL.createObjectURL(uploadFile || file);
        createdUrls.current.add(previewUrl);
        built.push(buildEntry(file, { uploadFile, previewUrl }));
      }
      setPreparing(null);

      const result = mergeSelection(entries, built, { maxCount, maxBytes });

      // A file the merge turned away has no row, so its preview URL would
      // otherwise sit there unreferenced.
      const kept = new Set(result.entries.map((e) => e.previewUrl));
      for (const entry of built) {
        if (!kept.has(entry.previewUrl)) {
          URL.revokeObjectURL(entry.previewUrl);
          createdUrls.current.delete(entry.previewUrl);
        }
      }

      setRejected(result.rejected);
      onChange(result.entries);
    },
    [entries, onChange, maxCount, maxBytes]
  );

  const total = totalBytes(entries);
  const totalOver = totalWarnBytes != null && total > totalWarnBytes;
  const blockers = selectionBlockers(entries, { maxCount });
  const full = entries.length >= maxCount;

  return (
    <div>
      {existingImages.length > 0 && entries.length === 0 ? (
        <figure>
          <div className="flex flex-wrap gap-2 justify-center">
            {existingImages.map((src, i) => (
              <img
                key={src + i}
                src={optimizeCloudinaryUrl(src, { width: 200 })}
                alt=""
                className="w-24 h-24 object-cover bg-surface-container p-1 rounded-lg"
              />
            ))}
          </div>
          <figcaption className="text-center text-sm mt-2">
            {/* The old note said choosing files replaces all of them. It no
                longer does — they are added to the set. */}
            Current images — new files are added to these
          </figcaption>
        </figure>
      ) : entries.length === 0 ? (
        <>
          <img src={uploadIcon} alt="" className="block mx-auto mb-1" />
          <p className="text-center text-xs font-light">
            JPEG, PNG or WebP. Large photos are shrunk automatically.
          </p>
        </>
      ) : null}

      {entries.length > 0 && (
        <ul className="mt-4 space-y-2 max-w-md mx-auto">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className={`flex items-center gap-3 p-2 rounded-lg border ${
                entry.error
                  ? "border-error/60 bg-error/5"
                  : "border-sand/30 bg-surface-container-low/50"
              }`}
            >
              {entry.previewUrl ? (
                <img
                  src={entry.previewUrl}
                  alt=""
                  className="w-14 h-14 object-cover rounded flex-none bg-surface-container"
                />
              ) : (
                <div className="w-14 h-14 rounded flex-none bg-surface-container" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-on-surface">{entry.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {i === 0 ? (
                    <span className="text-primary font-label-caps uppercase tracking-[0.1em]">
                      Main image
                    </span>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                  <span className="mx-1.5">·</span>
                  {formatMB(entry.size)}
                  {entry.compressed && (
                    <span className="text-on-surface-variant">
                      {" "}
                      (was {formatMB(entry.originalSize)})
                    </span>
                  )}
                </p>
                {entry.error && (
                  <p className="text-xs text-error mt-0.5">{entry.error}</p>
                )}
              </div>

              {i > 0 && !entry.error && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(makeMain(entries, i))}
                  className="flex-none font-label-caps text-[10px] uppercase tracking-[0.1em] text-primary hover:underline disabled:opacity-40"
                >
                  Make main
                </button>
              )}

              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${entry.name}`}
                onClick={() => onChange(removeAt(entries, i))}
                className="flex-none w-7 h-7 rounded-full text-on-surface-variant hover:bg-error hover:text-white transition-colors disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled || full}
        onChange={handlePick}
        className="w-full max-w-xs mt-4 mx-auto block text-sm text-on-surface-variant file:mr-4 file:py-2.5 file:px-4 file:rounded-sm file:border-0 file:font-label-caps file:text-[11px] file:uppercase file:tracking-[0.1em] file:bg-surface-container file:text-on-surface hover:file:bg-primary hover:file:text-white file:cursor-pointer file:transition-colors disabled:opacity-40"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
      />

      <p className="text-center text-xs text-on-surface-variant mt-2">
        {full
          ? `All ${maxCount} slots used — remove one to add another.`
          : `Up to ${maxCount}; ${maxCount - entries.length} left. The first is shown on listings, the rest in the product gallery.`}
      </p>

      {entries.length > 0 && (
        <p
          className={`text-center text-xs mt-1 ${totalOver ? "text-error" : "text-on-surface-variant"}`}
        >
          Total {formatMB(total)}
          {totalWarnBytes != null && ` of ${formatMB(totalWarnBytes)}`}
          <span className="mx-1.5">·</span>
          {entries.length} {entries.length === 1 ? "image" : "images"}
        </p>
      )}

      {/* Spoken as well as shown: compressing, then uploading, then why the
          selection is refused. */}
      <div aria-live="polite" className="mt-2">
        {preparing && (
          <p className="text-center text-xs text-primary">
            Preparing {preparing.index} of {preparing.of} — {preparing.name}…
          </p>
        )}
        {uploadingImage && (
          <p className="text-center text-xs text-primary">
            Uploading {uploadingImage}…
          </p>
        )}
        {rejected.length > 0 && (
          <ul className="text-xs text-error text-center space-y-0.5">
            {rejected.map((r, i) => (
              <li key={r.name + i}>
                "{r.name}" not added — {r.reason}
              </li>
            ))}
            <li className="text-on-surface-variant">
              {entries.length} of {maxCount} kept.
            </li>
          </ul>
        )}
        {blockers.map((b) => (
          <p key={b} className="text-xs text-error text-center">
            {b}
          </p>
        ))}
        {error && (
          <span className="text-error text-center block">{error}</span>
        )}
      </div>
    </div>
  );
};

export default ProductImagePicker;
