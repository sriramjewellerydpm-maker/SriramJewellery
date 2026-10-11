import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import { RATE_BOUNDS } from "../../../../shared/rateBounds.js";
import useAdminMutation from "../../../hooks/useAdminMutation";
import MutationStatus from "../../../components/MutationStatus/MutationStatus";
import { certainFailure } from "../../../utils/mutationError";

const AdminLiveRates = () => {
  // Bounds are served by GET /api/rates so the hint always matches whatever
  // the server will actually accept.
  // The server sends its own bounds with the rates; these are only the
  // fallback for the first render, and they are the SAME definition the
  // server validates against rather than a second copy of the numbers.
  const DEFAULT_BOUNDS = RATE_BOUNDS;
  const [axiosSecure] = useAxiosSecure();
  const [goldRate, setGoldRate] = useState("");
  const [silverRate, setSilverRate] = useState("");
  
  const { data: rates, isLoading: isRatesLoading } = useQuery({
    queryKey: ["admin-rates"],
    queryFn: async () => {
      const result = await axiosSecure.get("/rates");
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.gold) setGoldRate(data.gold.ratePerGram);
      if (data?.silver) setSilverRate(data.silver.ratePerGram);
    }
  });

  useEffect(() => {
    if (rates?.gold) setGoldRate(rates.gold.ratePerGram);
    if (rates?.silver) setSilverRate(rates.silver.ratePerGram);
  }, [rates]);

  const GOLD_RANGE = rates?.bounds?.gold || DEFAULT_BOUNDS.gold;
  const SILVER_RANGE = rates?.bounds?.silver || DEFAULT_BOUNDS.silver;

  // The server rejects implausible rates with a message naming the valid band
  // — the usual cause is entering the per-10-gram price into a per-gram field.
  // That message is a 4xx, so it reaches the owner verbatim rather than as
  // "failed to update".
  const updateRates = useAdminMutation({
    mutationFn: async ({ gold, silver }) => {
      const res = await axiosSecure.patch("/rates", { gold, silver });
      if (!res.data?.success) {
        throw certainFailure("The server did not confirm the new rates.");
      }
      return res.data;
    },
    // Both keys. The admin page caches the rates under ["admin-rates"] while
    // every storefront price comes from useRates' ["rates"] — refetching only
    // the first left the shop quoting yesterday's rate until the cache aged
    // out. Prices are computed from these, so the stale copy was mispricing.
    invalidate: [["admin-rates"], ["rates"], ["products"], ["product"]],
    successTitle: "Live rates updated",
    successText: "All prices now use the new rates.",
    errorTitle: "Rates unchanged",
    errorFallback: "The rates could not be updated.",
  });

  const isUpdating = updateRates.isLoading;

  const handleUpdateRates = (e) => {
    e.preventDefault();
    updateRates.mutate({ gold: Number(goldRate), silver: Number(silverRate) });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="h-20 flex items-center justify-between px-6 md:px-margin-desktop bg-background/80 backdrop-blur-md border-b border-outline-variant/30 z-40 shrink-0">
        <h2 className="font-display-lg text-headline-md text-primary">Live Metal Rates</h2>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-margin-desktop custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          {/* Current Rates Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-dim border border-secondary/20 rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <span className="font-label-caps text-outline text-[12px]">Gold Rate (22K)</span>
                <span className="material-symbols-outlined text-gold">workspace_premium</span>
              </div>
              <div>
                {isRatesLoading ? (
                  <div className="skeleton w-32 h-10 mb-2 rounded bg-outline-variant/20"></div>
                ) : (
                  <p className="text-4xl text-on-surface font-display tracking-tight">
                    ₹{Number(rates?.gold?.ratePerGram || 0).toLocaleString("en-IN")}
                  </p>
                )}
                <p className="text-[11px] text-outline mt-1 uppercase tracking-wider">Per Gram</p>
                <p className="text-[10px] text-outline/60 mt-4">
                  Last updated: {rates?.gold?.updatedAt ? new Date(rates.gold.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="bg-surface-dim border border-secondary/20 rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <span className="font-label-caps text-outline text-[12px]">Silver Rate</span>
                <span className="material-symbols-outlined text-outline">diamond</span>
              </div>
              <div>
                {isRatesLoading ? (
                  <div className="skeleton w-32 h-10 mb-2 rounded bg-outline-variant/20"></div>
                ) : (
                  <p className="text-4xl text-on-surface font-display tracking-tight">
                    ₹{Number(rates?.silver?.ratePerGram || 0).toLocaleString("en-IN")}
                  </p>
                )}
                <p className="text-[11px] text-outline mt-1 uppercase tracking-wider">Per Gram</p>
                <p className="text-[10px] text-outline/60 mt-4">
                  Last updated: {rates?.silver?.updatedAt ? new Date(rates.silver.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Update Form */}
          <div className="bg-surface-dim border border-secondary/20 rounded-xl p-6 md:p-8">
            <h3 className="font-headline-sm text-primary mb-2">Update Today's Rates</h3>
            <p className="text-sm text-on-surface-variant mb-8 font-body-base">
              These rates will be displayed on the customer frontend and used to calculate dynamic prices.
            </p>
            
            <form onSubmit={handleUpdateRates} aria-busy={isUpdating} className="space-y-6">
              {/* One disabled attribute for every control inside. */}
              <fieldset disabled={isUpdating} className="contents">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-label-caps text-outline text-[11px] mb-2">New Gold Rate (₹ / g)</label>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-outline font-button-text">₹</span>
                    <input 
                      type="number"
                      required
                      value={goldRate}
                      onChange={(e) => setGoldRate(e.target.value)}
                      className="w-full pl-6 pr-4 py-2 bg-transparent border-0 border-b border-outline-variant focus:ring-0 focus:border-primary text-body-base text-on-surface outline-none transition-ui placeholder:text-outline/40"
                      placeholder="e.g. 13230"
                    />
                  </div>
                  {/* Per GRAM, not per 10 grams — the trade quotes per 10g and
                      that figure entered here is a 10x overprice. */}
                  <p className="mt-2 text-[11px] text-on-surface-variant">
                    Per <strong>gram</strong>. Accepted range ₹{GOLD_RANGE.min.toLocaleString("en-IN")}–₹{GOLD_RANGE.max.toLocaleString("en-IN")}.
                  </p>
                </div>

                <div>
                  <label className="block font-label-caps text-outline text-[11px] mb-2">New Silver Rate (₹ / g)</label>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-outline font-button-text">₹</span>
                    <input 
                      type="number"
                      required
                      value={silverRate}
                      onChange={(e) => setSilverRate(e.target.value)}
                      className="w-full pl-6 pr-4 py-2 bg-transparent border-0 border-b border-outline-variant focus:ring-0 focus:border-primary text-body-base text-on-surface outline-none transition-ui placeholder:text-outline/40"
                      placeholder="e.g. 218"
                    />
                  </div>
                  {/* Per GRAM, not per 10 grams — the trade quotes per 10g and
                      that figure entered here is a 10x overprice. */}
                  <p className="mt-2 text-[11px] text-on-surface-variant">
                    Per <strong>gram</strong>. Accepted range ₹{SILVER_RANGE.min.toLocaleString("en-IN")}–₹{SILVER_RANGE.max.toLocaleString("en-IN")}.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <MutationStatus
                  mutation={updateRates}
                  pendingLabel="Saving the new rates…"
                  successLabel="Rates saved"
                  errorFallback="The rates could not be updated."
                />
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-button-text hover:bg-primary-container active:scale-95 transition-ui shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isUpdating && (
                    <span aria-hidden="true" className="loading loading-spinner loading-xs mr-2 align-middle" />
                  )}
                  {isUpdating ? "Saving…" : "Save New Rates"}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveRates;
