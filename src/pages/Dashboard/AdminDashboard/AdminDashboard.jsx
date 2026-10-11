import React, { useState } from "react";
import RadarChartComponent from "../../../components/RadarChartComponent/RadarChartComponent";
import BarChartComponent from "../../../components/BarChartComponent/BarChartComponent";
import useAdminStats from "../../../hooks/useAdminStats";
import useQuotes from "../../../hooks/useQuotes";
import useRates from "../../../hooks/useRates";
import useProducts from "../../../hooks/useProducts";

const StatCard = ({ title, value, icon, subtitle }) => {
  return (
    <div className="bg-sand-light p-6 rounded-lg border border-outline-variant/20 flex flex-col justify-between hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">{title}</span>
        <span className="material-symbols-outlined text-primary/60">{icon}</span>
      </div>
      <div>
        <p className="font-display-lg text-headline-md text-on-surface">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-secondary mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  // Declared before useAdminStats, which reads it.
  const [mostViewedDays, setMostViewedDays] = useState(30);

  const {
    revenueStats,
    salesByCategory,
    bestSelling,
    mostWishlisted,
    mostViewed,
  } = useAdminStats({ mostViewedDays });

  const { quotes, updateQuoteStatus } = useQuotes();
  const { rates, updateRates } = useRates();
  const [products] = useProducts();

  const [goldInput, setGoldInput] = useState("");
  const [silverInput, setSilverInput] = useState("");

  // First real weighted product, priced by the server from the live rate. Shown
  // beside the rate so an order-of-magnitude error is visible at a glance —
  // ₹96/gram and ₹100,000/gram both look plausible in isolation, but the piece
  // they produce does not.
  const rateSample = (() => {
    const p = products?.find(
      (x) => !x.isQuoteOnly && x.weight > 0 && typeof x.price === "number" && x.price > 0
    );
    return p
      ? { name: p.name, weight: p.weight, metalType: p.metalType || "gold", price: p.price }
      : null;
  })();

  const formatRateDate = (value) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "never";
  
  // Calculate some aggregate values for KPI cards
  const totalRevenue = revenueStats?.reduce((acc, curr) => acc + curr.totalRevenue, 0) || 0;
  const totalOrders = revenueStats?.reduce((acc, curr) => acc + curr.orderCount, 0) || 0;
  const totalWishlisted = mostWishlisted?.reduce((acc, curr) => acc + curr.wishlistCount, 0) || 0;
  const pendingQuotes = quotes?.filter((q) => q.status === "Pending").length || 0;

  const handleUpdateRate = (metal) => {
    // Cleared on confirmation, not on click. Clearing it first meant a refused
    // rate — the server rejects implausible ones — took the typed figure with
    // it, and the owner had to remember what they had entered.
    if (metal === "gold" && goldInput) {
      updateRates.mutate({ gold: Number(goldInput) }, { onSuccess: () => setGoldInput("") });
    } else if (metal === "silver" && silverInput) {
      updateRates.mutate({ silver: Number(silverInput) }, { onSuccess: () => setSilverInput("") });
    }
  };

  // Which row is mid-change, so the select that was used is the one that locks.
  const isQuoteBusy = (id) =>
    updateQuoteStatus.isLoading && updateQuoteStatus.variables?.id === id;

  const handleQuoteStatus = (id, status) => {
    updateQuoteStatus.mutate({ id, status });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-margin-desktop bg-background custom-scrollbar font-body-base">
      <div className="max-w-7xl mx-auto space-y-section-gap-sm pb-section-gap-lg">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Overview</h1>
        </div>

        {/* KPI Overview Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <StatCard
            title="Total Sales"
            value={`₹${totalRevenue.toLocaleString("en-IN")}`}
            icon="payments"
            subtitle="Overall revenue"
          />
          <StatCard
            title="Total Orders"
            value={totalOrders}
            icon="shopping_cart"
            subtitle="Overall orders placed"
          />
          <StatCard
            title="Pending Quotes"
            value={pendingQuotes}
            icon="contact_mail"
            subtitle="Requires attention"
          />
          <StatCard
            title="Total Wishlisted"
            value={totalWishlisted}
            icon="favorite"
            subtitle="Top 10 engagement"
          />
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mt-12">
          {/* Revenue Over Time (Bar Chart) */}
          <div className="bg-surface rounded shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Revenue Over Time</h2>
            </div>
            <div className="h-[380px] p-4 pb-12">
              <BarChartComponent data={revenueStats || []} />
            </div>
          </div>

          {/* Sales by Category (Radar Chart) */}
          <div className="bg-surface rounded shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Sales by Category</h2>
            </div>
            <div className="h-[380px] pb-8">
              <RadarChartComponent data={salesByCategory || []} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mt-12">
          {/* Best-Selling Products */}
          <div className="bg-surface rounded shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Best-Selling</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-light/20 text-on-surface-variant font-label-caps text-[11px] uppercase tracking-[0.1em]">
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Product</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold text-right">Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {bestSelling?.slice(0, 5).map((p) => (
                    <tr key={p.productId} className="hover:bg-sand-light/10 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-outline-variant/30 overflow-hidden shrink-0">
                          <img src={p.productImage} className="w-full h-full object-cover" alt={p.productName} />
                        </div>
                        <span className="text-sm font-medium text-on-surface">{p.productName}</span>
                      </td>
                      <td className="p-4 text-right text-on-surface-variant font-medium">{p.totalUnitsSold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wishlist Engagement */}
          <div className="bg-surface rounded shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Wishlist Engagement</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-light/20 text-on-surface-variant font-label-caps text-[11px] uppercase tracking-[0.1em]">
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Product</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold text-right">Adds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {mostWishlisted?.slice(0, 5).map((p) => (
                    <tr key={p.productId} className="hover:bg-sand-light/10 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-outline-variant/30 overflow-hidden shrink-0">
                          <img src={p.productImage} className="w-full h-full object-cover" alt={p.productName} />
                        </div>
                        <span className="text-sm font-medium text-on-surface">{p.productName}</span>
                      </td>
                      <td className="p-4 text-right text-on-surface-variant font-medium">{p.wishlistCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Most Viewed Products — last 30 days */}
        <section className="mt-12">
          <div className="bg-surface rounded shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Most Viewed Products</h2>
              <label className="flex items-center gap-2">
                <span className="font-label-caps text-[11px] uppercase tracking-[0.1em] text-on-surface-variant">
                  Period
                </span>
                <select
                  value={mostViewedDays}
                  onChange={(e) => setMostViewedDays(Number(e.target.value))}
                  className="bg-transparent border-b border-outline-variant/50 py-1 pr-6 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none cursor-pointer"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last 12 months</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-light/20 text-on-surface-variant font-label-caps text-[11px] uppercase tracking-[0.1em]">
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Product</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Category</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold text-right">Views</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold text-right">Visitors</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold text-right">Signed In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {mostViewed?.length ? (
                    mostViewed.slice(0, 10).map((p) => (
                      <tr key={p.productId} className="hover:bg-sand-light/10 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded border border-outline-variant/30 overflow-hidden shrink-0">
                            <img
                              src={p.productImage || "/logo.png"}
                              className="w-full h-full object-cover"
                              alt={p.productName || "Product"}
                            />
                          </div>
                          <span className="text-sm font-medium text-on-surface">
                            {p.productName || "Removed product"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-on-surface-variant">{p.category || "—"}</td>
                        <td className="p-4 text-right text-on-surface font-medium">{p.viewCount}</td>
                        <td className="p-4 text-right text-on-surface-variant font-medium">{p.uniqueVisitors}</td>
                        <td className="p-4 text-right text-on-surface-variant font-medium">{p.signedInViews}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-on-surface-variant">
                        No product views recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Quote Requests & Live Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-12">
          {/* Quote Requests Table */}
          <section className="lg:col-span-2 bg-surface rounded shadow-sm overflow-hidden border border-outline-variant/10">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Quote Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-light/20 text-on-surface-variant font-label-caps text-[11px] uppercase tracking-[0.1em]">
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Customer</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Interested In</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Contact</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold">Status</th>
                    <th className="p-4 border-b border-outline-variant/10 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {quotes?.map((quote) => (
                    <tr key={quote._id} className="hover:bg-sand-light/10 transition-colors group">
                      <td className="p-4 font-medium text-on-surface">{quote.customerName}</td>
                      <td className="p-4 text-on-surface-variant text-sm">{quote.productName}</td>
                      <td className="p-4 text-on-surface-variant text-sm">{quote.customerMobile}</td>
                      <td className="p-4">
                        {quote.status === "Pending" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-error-container/50 text-on-error-container font-label-caps text-[10px]">Pending</span>
                        )}
                        {quote.status === "Contacted" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-caps text-[10px]">Contacted</span>
                        )}
                        {quote.status === "Closed" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-dim text-on-surface font-label-caps text-[10px]">Closed</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <select
                          className="bg-surface border border-outline-variant/30 text-xs text-on-surface rounded p-1 disabled:opacity-50"
                          value={quote.status}
                          disabled={isQuoteBusy(quote._id)}
                          aria-busy={isQuoteBusy(quote._id)}
                          onChange={(e) => handleQuoteStatus(quote._id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!quotes?.length && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-on-surface-variant">
                        No quote requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Live Rates Panel */}
          <section className="lg:col-span-1 bg-sand-light/40 rounded shadow-sm p-6 flex flex-col border border-outline-variant/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Daily Rates</h2>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 bg-white/50 px-2 py-1 rounded">Live</span>
            </div>

            {/* A stale rate prices every gold item wrongly, so it is called out
                here and checkout refuses to price against it. */}
            {(rates?.gold?.isStale || rates?.silver?.isStale) && (
              <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-xs font-semibold flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
                <span>
                  {[rates?.gold?.isStale && "Gold", rates?.silver?.isStale && "Silver"]
                    .filter(Boolean)
                    .join(" and ")}{" "}
                  rate not updated for over {rates?.staleAfterDays ?? 3} days. Checkout will refuse
                  to price these items until it is refreshed.
                </span>
              </div>
            )}

            {/* A sample price from a real product: a wrong order of magnitude is
                obvious here in a way a bare rate figure never is. */}
            {rateSample && (
              <div className="mb-4 p-3 rounded bg-surface border border-outline-variant/20 text-xs">
                <span className="font-label-caps text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-1">
                  Sample price check
                </span>
                <span className="text-on-surface">
                  {rateSample.name} · {rateSample.weight}g {rateSample.metalType} ={" "}
                  <strong className="text-primary">₹{rateSample.price.toLocaleString("en-IN")}</strong>
                </span>
              </div>
            )}

            <div className="space-y-4 flex-1">
              {/* Gold Rate */}
              <div className="bg-surface p-4 rounded border border-outline-variant/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-outline-gold"></span>
                    <span className="font-medium text-on-surface text-sm">Gold (22K)</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant">per gram</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`font-display-lg text-headline-md ${rates?.gold?.isStale ? "text-error" : "text-primary"}`}>
                    ₹{(rates?.gold?.ratePerGram || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  Updated {formatRateDate(rates?.gold?.updatedAt)}
                  {rates?.gold?.ageInDays > 0 && ` · ${rates.gold.ageInDays}d ago`}
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    className="w-full bg-sand-light/20 border border-outline-variant/20 rounded px-3 py-1.5 text-sm text-on-surface focus:border-primary focus:ring-0 transition-colors font-body-base"
                    placeholder="Update Rate"
                    type="number"
                    value={goldInput}
                    onChange={(e) => setGoldInput(e.target.value)}
                  />
                  <button
                    onClick={() => handleUpdateRate("gold")}
                    disabled={updateRates.isLoading || !goldInput}
                    className="bg-primary text-white px-3 py-1.5 rounded font-button-text text-button-text hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                </div>
              </div>

              {/* Silver Rate */}
              <div className="bg-surface p-4 rounded border border-outline-variant/10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-outline"></span>
                    <span className="font-medium text-on-surface text-sm">Silver (999)</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant">per gram</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`font-display-lg text-headline-md ${rates?.silver?.isStale ? "text-error" : "text-primary"}`}>
                    ₹{(rates?.silver?.ratePerGram || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  Updated {formatRateDate(rates?.silver?.updatedAt)}
                  {rates?.silver?.ageInDays > 0 && ` · ${rates.silver.ageInDays}d ago`}
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    className="w-full bg-sand-light/20 border border-outline-variant/20 rounded px-3 py-1.5 text-sm text-on-surface focus:border-primary focus:ring-0 transition-colors font-body-base"
                    placeholder="Update Rate"
                    type="number"
                    value={silverInput}
                    onChange={(e) => setSilverInput(e.target.value)}
                  />
                  <button
                    onClick={() => handleUpdateRate("silver")}
                    disabled={updateRates.isLoading || !silverInput}
                    className="bg-primary text-white px-3 py-1.5 rounded font-button-text text-button-text hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-6 text-[10px] text-center text-on-surface-variant italic">Rates update globally across the boutique website</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
