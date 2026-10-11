import express from "express";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Cart } from "../models/Cart.js";
import { verifyJWT, requireAdmin } from "../middleware/auth.js";
import { sendOrderApprovalAlert, sendRefundRequiredAlert } from "../utils/whatsapp.js";
import { releaseStock } from "../utils/stock.js";
import { checkStatusChange, checkApprove, checkReject } from "../utils/orderStatus.js";
import {
  validate,
  orderStatusSchema,
  orderApprovalSchema,
  objectIdParam,
} from "../middleware/validate.js";

const router = express.Router();

// Every :id here is an ObjectId; a malformed one is a 404, not a 500 (S8).
router.param("id", objectIdParam("Order"));

/**
 * A paid online order that will not be fulfilled — cancelled by the customer
 * or the owner, or rejected — holds the customer's money with nothing to ship.
 * Flag it for a refund (made by hand; there is no automatic Razorpay refund)
 * and tell the owner with the same REFUND NEEDED alert the late-payment case
 * uses. Call before saving the order.
 */
const flagRefundIfPaid = (order, reason) => {
  const paidOnline = order.paidAt && String(order.paymentMethod || "").toLowerCase() !== "cod";
  if (!paidOnline || order.refundRequired) return;
  order.refundRequired = true;
  sendRefundRequiredAlert({ order, reason }).catch((err) =>
    console.error("Refund alert failed (non-critical):", err.message)
  );
};

// How long after the owner approves an order it is promised for delivery.
// Single source of truth — the client displays this date, it never computes it.
export const DELIVERY_WINDOW_DAYS = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── User Orders ─────────────────────────────────────────────────────────────

// GET /api/orders — user's own orders
// GET /api/orders — the customer's own orders
//
// Paid ones only. An order row is written BEFORE the customer reaches
// Razorpay, because that is what holds the stock while they pay — so opening
// the payment screen and backing out used to leave a row that said "Placed
// on …" for something never bought. A customer who tried twice saw two of
// them, and had no way to tell them from a real order.
//
// Those rows still exist; they are a reservation, not an order, and the
// sweeper releases them. They simply are not the customer's business until
// money has moved. `paidAt` is the moment it did.
router.get("/", verifyJWT, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId, paidAt: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/admin/all — all orders (admin only)
router.get("/admin/all", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id — single order
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    // Users can only see their own orders, admins can see all
    if (req.user.role !== "ADMIN" && order.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to view this order" });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/orders — withdrawn.
//
// This route only ever created cash-on-delivery orders (see the COD-only rule
// in createOrderSchema). The shop no longer offers cash on delivery: every
// order is paid in full at checkout, so orders are created by
// POST /api/payment/create-order and confirmed by Razorpay.
//
// Kept as an explicit refusal rather than deleted so a stale client gets the
// reason instead of a 404 — and so nothing can place an unpaid order that the
// customer sees as confirmed. The server-side price verification this route
// used to perform lives in the payment route, which does its own.
router.post("/", verifyJWT, async (req, res) => {
  res.status(410).json({
    error: "Cash on delivery is no longer offered. Please complete payment at checkout.",
  });
});

// PATCH /api/orders/:id/status — admin update order status
router.patch("/:id/status", verifyJWT, requireAdmin, validate(orderStatusSchema), async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // The lifecycle table (utils/orderStatus.js) decides, not this handler:
    // end states stay ended, nothing moves backwards, and shipped/delivered
    // need the owner's approval.
    const verdict = checkStatusChange(order, status);
    if (!verdict.ok) return res.status(400).json({ error: verdict.error });
    if (verdict.noop) return res.json({ success: true, data: order });

    order.orderStatus = status;

    // Cancelling puts the pieces back on sale — the same release the customer
    // cancel and the owner rejection make, guarded by the same flag so it can
    // only ever happen once per order.
    if (status === "cancelled" && order.stockReserved) {
      await releaseStock(order.items);
      order.stockReserved = false;
    }
    if (status === "cancelled") flagRefundIfPaid(order, "The shop cancelled this paid order.");

    // Stamped once, on the first transition into delivered, so re-saving a
    // delivered order does not move the date the customer was shown.
    if (status === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// PATCH /api/orders/:id/approval — owner approves or rejects an order (admin)
router.patch("/:id/approval", verifyJWT, requireAdmin, validate(orderApprovalSchema), async (req, res) => {
  try {
    const { approvalStatus, rejectionReason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // The lifecycle table decides. Among other things: re-approving would move
    // the promised delivery date after the customer has seen it; a rejected
    // order has released its stock and cannot be approved; an expired,
    // cancelled or unpaid online order cannot be approved at all.
    const verdict = approvalStatus === "APPROVED" ? checkApprove(order) : checkReject(order);
    if (!verdict.ok) return res.status(400).json({ error: verdict.error });

    if (approvalStatus === "APPROVED") {
      const approvedAt = new Date();
      order.approvalStatus = "APPROVED";
      order.approvedAt = approvedAt;
      // Computed server-side only — a client-supplied date is never trusted.
      order.expectedDeliveryDate = new Date(
        approvedAt.getTime() + DELIVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000
      );
      order.rejectionReason = null;
    } else {
      order.approvalStatus = "REJECTED";
      order.rejectionReason = rejectionReason || null;
      order.approvedAt = null;
      order.expectedDeliveryDate = null;

      // A rejected order is never fulfilled, so its pieces go back on sale.
      if (order.stockReserved) {
        await releaseStock(order.items);
        order.stockReserved = false;
      }
      flagRefundIfPaid(order, `The shop declined this paid order: ${order.rejectionReason || "no reason given"}.`);
    }

    await order.save();

    sendOrderApprovalAlert({ order }).catch((err) =>
      console.error("Owner approval alert failed (non-critical):", err.message)
    );

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Order approval error:", error);
    res.status(500).json({ error: "Failed to update order approval" });
  }
});

// PATCH /api/orders/:id/cancel — withdrawn.
//
// The published Cancellation Policy is that an order cannot be cancelled once
// it is placed and paid for. This endpoint is kept, rather than deleted, so a
// client still holding the old Cancel button gets the reason instead of a 404.
//
// Cancellation BY US is unaffected: an admin still cancels through
// PATCH /:id/status, and the unpaid-order sweeper still expires and restocks
// orders that were never paid for.
router.patch("/:id/cancel", verifyJWT, async (req, res) => {
  res.status(410).json({
    error:
      "Orders cannot be cancelled once placed. If your piece arrived damaged or defective, contact us — see our Return & Exchange Policy.",
  });
});

// DELETE /api/orders/delete-cart-items — clear user's cart
router.delete("/delete-cart-items", verifyJWT, async (req, res) => {
  try {
    const result = await Cart.deleteMany({ userId: req.user.userId });
    res.json({ deletedCount: result.deletedCount, success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete cart items" });
  }
});

export default router;
