import mongoose from "mongoose";

/**
 * One row per Razorpay webhook delivery we have accepted.
 *
 * Razorpay retries, so the same event arrives more than once. The unique index
 * on `eventId` is the gate: the insert either succeeds (this delivery is new
 * and we process it) or raises a duplicate-key error (we have seen it, and we
 * acknowledge without doing the work again). Checking first and writing after
 * would be a race, not a guard.
 *
 * The claim is released if processing then fails, so that Razorpay's retry is
 * not mistaken for a duplicate of a delivery that never completed.
 *
 * Rows expire after 90 days. This is a replay guard and an audit trail, not a
 * permanent ledger, and the cluster is an M0 with a fixed disk.
 */
const webhookEventSchema = new mongoose.Schema(
  {
    // Razorpay's `x-razorpay-event-id` header — unique per event, stable
    // across that event's retries.
    eventId: { type: String, required: true, unique: true },
    event: { type: String, default: null },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    // What we did with it, for reading back during a dispute.
    outcome: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
  },
  { versionKey: false }
);

export const WebhookEvent = mongoose.models.WebhookEvent
  || mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
