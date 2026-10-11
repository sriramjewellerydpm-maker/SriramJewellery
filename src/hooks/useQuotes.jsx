import { useQuery } from "react-query";
import useAxiosSecure from "./useAxiosSecure";
import useAuthContext from "./useAuthContext";
import useAdminMutation from "./useAdminMutation";
import { certainFailure } from "../utils/mutationError";

const useQuotes = () => {
  const { user, isAuthLoading } = useAuthContext();
  const [axiosSecure] = useAxiosSecure();
  const hasValidUser = !isAuthLoading && !!user;

  const { data: quotes, isLoading, refetch } = useQuery({
    enabled: hasValidUser,
    queryKey: ["quotes"],
    queryFn: async () => {
      const res = await axiosSecure.get("/quotes");
      return res.data?.data || [];
    },
  });

  const updateQuoteStatus = useAdminMutation({
    mutationFn: async ({ id, status }) => {
      const res = await axiosSecure.patch(`/quotes/${id}/status`, { status });
      if (!res.data?.success) {
        throw certainFailure("The server did not confirm the status change.");
      }
      return res.data;
    },
    // ["admin-quotes"] is the same list under the admin page's key, and
    // ["quote-summary"] is the count in the navigation, which would otherwise
    // keep counting a quote already dealt with.
    invalidate: [["quotes"], ["admin-quotes"], ["quote-summary"]],
    successTitle: "Quote status updated",
    errorTitle: "Status unchanged",
    errorFallback: "The quote status could not be changed.",
  });

  return { quotes, isLoading, refetch, updateQuoteStatus };
};

export default useQuotes;
