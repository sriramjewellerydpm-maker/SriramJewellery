import { useQuery } from "react-query";
import useAxiosSecure from "./useAxiosSecure";
import useAuthContext from "./useAuthContext";
import useAdminMutation from "./useAdminMutation";
import { certainFailure } from "../utils/mutationError";

const useRates = () => {
  const { isAuthLoading } = useAuthContext();
  const [axiosSecure] = useAxiosSecure();
  const hasValidUser = !isAuthLoading;

  const { data: rates, isLoading, refetch } = useQuery({
    enabled: hasValidUser,
    queryKey: ["rates"],
    queryFn: async () => {
      const res = await axiosSecure.get("/rates");
      return res.data;
    },
  });

  // Shares the feedback every other admin save has: a pending state, a
  // confirmation only once the server has answered, and the server's own
  // reason when it refuses an implausible rate.
  const updateRates = useAdminMutation({
    mutationFn: async (newRates) => {
      const res = await axiosSecure.patch("/rates", newRates);
      if (!res.data?.success) {
        throw certainFailure("The server did not confirm the new rates.");
      }
      return res.data;
    },
    // Both keys, plus the prices derived from them. The admin pages cache the
    // same rates under ["admin-rates"], and every storefront price is computed
    // from these — refetching one and not the other left the shop quoting the
    // old rate.
    invalidate: [["rates"], ["admin-rates"], ["products"], ["product"]],
    successTitle: "Live rates updated",
    successText: "All prices now use the new rates.",
    errorTitle: "Rates unchanged",
    errorFallback: "The rates could not be updated.",
  });

  return { rates, isLoading, refetch, updateRates };
};

export default useRates;
