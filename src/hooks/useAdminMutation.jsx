import { useMutation, useQueryClient } from "react-query";
import { classifyMutationError } from "../utils/mutationError";
import { adminSuccessToast, adminErrorToast } from "../utils/adminToast";

/**
 * One admin save, with the four states every one of them needs.
 *
 * Before this, admin mutations were bare axios calls: no pending state, so the
 * button could be clicked twice; no confirmation tied to the server's answer,
 * so a Swal could appear whether or not anything was written; and nothing
 * refetched afterwards, so the list kept showing the old row.
 *
 * Two guarantees are worth stating because they are the point:
 *
 *  - Success is never optimistic. It fires on a resolved 2xx and not before.
 *  - By the time it fires, the affected queries have already refetched.
 *    react-query v3 awaits onSuccess before dispatching its success state
 *    (core/mutation.js), so awaiting invalidation here holds the button in its
 *    pending state until the screen agrees with the database.
 *
 * @param {Function} mutationFn    does the request; must reject on failure
 * @param {Array}    invalidate    query keys to refetch before confirming
 * @param {Function} onSuccess     runs after the refetch (navigate, reset…)
 *
 * successTitle/successText may each be a function of (data, variables), for
 * the cases where one mutation has more than one outcome worth naming —
 * approving an order starts a 15-day delivery window, declining one does not.
 */
const useAdminMutation = ({
  mutationFn,
  invalidate = [],
  successTitle = "Saved",
  successText = "",
  errorTitle = "Not saved",
  errorFallback = "The change could not be saved.",
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  return useMutation(mutationFn, {
    onSuccess: async (data, variables) => {
      try {
        await Promise.all(
          invalidate.map((key) => queryClient.invalidateQueries(key))
        );
      } catch (refetchError) {
        // The save DID happen. A refetch that fails afterwards must not be
        // reported as a failed save — and rethrowing here would do exactly
        // that, because v3 routes an onSuccess rejection to the error state.
        console.error("Saved, but refetching afterwards failed:", refetchError);
      }

      const resolve = (value) =>
        typeof value === "function" ? value(data, variables) : value;
      adminSuccessToast(resolve(successTitle), resolve(successText));
      await onSuccess?.(data, variables);
    },

    onError: (error) => {
      // The real error for whoever is debugging; a sentence for the owner.
      console.error(`${errorTitle}:`, error);
      const { certain, message } = classifyMutationError(error, errorFallback);
      // react-hot-toast, like the rest of the app — one <Toaster> in AppShell.
      // A blocking dialog here would be the wrong shape for a row action in a
      // table, and the message stays on screen in MutationStatus regardless.
      adminErrorToast(certain ? `${errorTitle}: ${message}` : message);
    },
  });
};

export default useAdminMutation;
