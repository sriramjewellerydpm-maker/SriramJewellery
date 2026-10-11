/**
 * How many images one product may carry, gallery included.
 *
 * Shared because both sides need it: the admin form refuses a longer selection
 * before uploading anything, and the schema refuses one that arrives anyway.
 *
 * It lives here rather than in middleware/validate.js — where the schema that
 * uses it sits — because that module imports utils/rateGuards.js, which reads
 * process.env at module scope and so cannot be pulled into a browser bundle.
 * The same reason shared/rateBounds.js exists.
 */
export const MAX_PRODUCT_IMAGES = 6;

export default MAX_PRODUCT_IMAGES;
