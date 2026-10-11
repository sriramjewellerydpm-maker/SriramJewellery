import React from "react";
import { Link } from "react-router-dom";
import useOrders from "../../../hooks/useOrders";
import CustomHelmet from "../../../components/CustomHelmet/CustomHelmet";
import EmptyState from "../../../components/EmptyState/EmptyState";
import { ListSkeleton } from "../../../components/Skeleton/Skeleton";

/**
 * Payment history — deliberately not a second copy of My Orders.
 *
 * My Orders answers "where is my piece?". This answers "what have I paid, and
 * what's the record of it?" — transaction reference, method, GST component,
 * settlement status. Those are the fields someone needs when reconciling a
 * card statement or chasing a refund, and they are noise on a tracking page.
 */

const STATUS_STYLE = {
  paid: "text-success-sage border-success-sage/40 bg-success-sage/10",
  captured: "text-success-sage border-success-sage/40 bg-success-sage/10",
  pending: "text-secondary border-secondary/40 bg-secondary/10",
  created: "text-secondary border-secondary/40 bg-secondary/10",
  failed: "text-error border-error/40 bg-error/10",
  refunded: "text-on-surface-variant border-outline/40 bg-surface-dim/40",
};

const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const Billing = () => {
  const { orders, isOrdersLoading, totalSpent } = useOrders();

  // Only orders that actually reached the payment provider belong here. An
  // order still awaiting owner approval has no transaction to show.
  const transactions = (orders || []).filter(
    (o) => o.razorpayPaymentId || o.razorpayOrderId || o.paymentStatus
  );

  return (
    <section className="w-full">
      <CustomHelmet title="Billing" />

      <header className="mb-8">
        <h1 className="font-display-lg text-headline-sm text-on-surface mb-2">
          Billing &amp; payments
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant">
          Your payment records. For delivery progress, see{" "}
          <Link
            to="/dashboard/myOrders"
            className="text-primary underline underline-offset-4"
          >
            My Orders
          </Link>
          .
        </p>
      </header>

      {isOrdersLoading ? (
        <ListSkeleton rows={3} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="No payments yet"
          message="Once you complete a purchase, its payment record and GST breakdown will appear here."
          actionLabel="Browse the collection"
          actionTo="/shop"
        />
      ) : (
        <>
          {/* Summary */}
          <div className="grid sm:grid-cols-3 gap-px bg-outline-gold/20 border border-outline-gold/20 rounded-sm overflow-hidden mb-8">
            <div className="bg-surface p-5">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-2">
                Total paid
              </p>
              <p className="font-display-lg text-[22px] text-on-surface tabular-nums">
                {formatINR(totalSpent)}
              </p>
            </div>
            <div className="bg-surface p-5">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-2">
                Transactions
              </p>
              <p className="font-display-lg text-[22px] text-on-surface tabular-nums">
                {transactions.length}
              </p>
            </div>
            <div className="bg-surface p-5">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-2">
                Latest
              </p>
              <p className="font-display-lg text-[22px] text-on-surface">
                {formatDate(transactions[0]?.createdAt)}
              </p>
            </div>
          </div>

          {/* Records */}
          <div className="flex flex-col gap-4">
            {transactions.map((tx) => {
              const status = (tx.paymentStatus || "pending").toLowerCase();
              return (
                <article
                  key={tx._id || tx.orderId}
                  className="border border-outline-gold/25 rounded-sm p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="font-body-base text-[15px] text-on-surface">
                        Order {tx.orderId}
                      </p>
                      <p className="font-body-base text-[13px] text-on-surface-variant mt-0.5">
                        {formatDate(tx.createdAt)}
                        {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-none">
                      <span
                        className={`font-label-caps text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-1 ${
                          STATUS_STYLE[status] || STATUS_STYLE.pending
                        }`}
                      >
                        {status}
                      </span>
                      <span className="font-display-lg text-[20px] text-on-surface tabular-nums">
                        {formatINR(tx.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <dl className="grid sm:grid-cols-3 gap-x-6 gap-y-3 pt-4 border-t border-outline-gold/20">
                    <div>
                      <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                        Payment reference
                      </dt>
                      <dd className="font-body-base text-[13px] text-on-surface break-all">
                        {tx.razorpayPaymentId || tx.razorpayOrderId || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                        Of which GST
                      </dt>
                      <dd className="font-body-base text-[13px] text-on-surface tabular-nums">
                        {tx.gstAmount ? formatINR(tx.gstAmount) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                        Items
                      </dt>
                      <dd className="font-body-base text-[13px] text-on-surface">
                        {tx.items?.length || 0}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          {/* The seller GSTIN is set (shared/seller.js), so the invoice on
              the order confirmation is labelled TAX INVOICE and carries it.
              TODO(client): per-item HSN codes are still not set on products.
              B2C supplies below the turnover threshold do not require them,
              which the shop's auditor should confirm before this page offers
              a download rather than pointing at a person. */}
          <p className="font-body-base text-[13px] text-on-surface-variant mt-6">
            Need a GST invoice? Contact us with your order reference and we'll
            send one.
          </p>
        </>
      )}
    </section>
  );
};

export default Billing;
