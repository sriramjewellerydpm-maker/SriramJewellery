import React from "react";
import { classifyMutationError } from "../../utils/mutationError";

/**
 * What an admin save is doing, in words.
 *
 * The toast is the thing that catches the eye; this is the thing a screen
 * reader hears and the thing still on screen a minute later. Colour alone
 * cannot carry it, so each state is also stated.
 */
const MutationStatus = ({
  mutation,
  pendingLabel = "Saving…",
  successLabel = "Saved",
  errorFallback = "The change could not be saved.",
  className = "",
}) => {
  if (!mutation) return null;

  const { isLoading, isSuccess, isError, error } = mutation;
  if (!isLoading && !isSuccess && !isError) return null;

  let text = pendingLabel;
  let tone = "text-primary";

  if (isError) {
    text = classifyMutationError(error, errorFallback).message;
    tone = "text-error";
  } else if (isSuccess) {
    text = successLabel;
    tone = "text-primary";
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className={`font-label-caps text-[11px] uppercase tracking-[0.1em] ${tone} ${className}`}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="loading loading-spinner loading-xs mr-2 align-middle"
        />
      )}
      {text}
    </p>
  );
};

export default MutationStatus;
