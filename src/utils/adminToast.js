import toast from "react-hot-toast";

/**
 * How long a confirmation stays up.
 *
 * react-hot-toast defaults success to 2s, which is long enough to miss: the
 * eye is still on the button it just clicked. Four and a half seconds is long
 * enough to be read after looking back up, which is the whole purpose of the
 * confirmation.
 */
export const SUCCESS_TOAST_MS = 4500;
export const ERROR_TOAST_MS = 6000;

export const adminSuccessToast = (title, text = "") =>
  toast.success(text ? `${title} — ${text}` : title, {
    duration: SUCCESS_TOAST_MS,
  });

export const adminErrorToast = (message) =>
  toast.error(message, { duration: ERROR_TOAST_MS });
