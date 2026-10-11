import React, { createContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useUserInfo from "../../hooks/useUserInfo";
import ShippingAddressForm from "../../components/ShippingAddressForm/ShippingAddressForm";
import Payment from "../Payment/Payment";
import { deliveryChargeFor } from "../../../shared/delivery.js";
import useCart from "../../hooks/useCart";
import useAuthContext from "../../hooks/useAuthContext";
import useAxiosSecure from "../../hooks/useAxiosSecure";
import CustomHelmet from "../../components/CustomHelmet/CustomHelmet";
import OrderSummary from "../../components/OrderSummary/OrderSummary";
import toast from "react-hot-toast";

// Payment Context to handle payment info
export const PaymentContext = createContext(null);

const Checkout = () => {
  const { user } = useAuthContext();
  const [userFromDB] = useUserInfo();
  const [axiosSecure] = useAxiosSecure();

  const [paymentMethod, setPaymentMethod] = useState("card");
  // Editing the address happens here, not on another page: sending someone to
  // /dashboard/myAddress mid-checkout abandons the checkout they were in.
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const { cartData, cartSubtotal, refetch } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // "Buy Now" hands a single product straight to checkout without touching the
  // cart. When present it replaces the cart for this session only; the cart
  // itself is left untouched (and not cleared on success).
  const buyNowItem = location.state?.buyNow || null;
  const checkoutItems = buyNowItem ? [buyNowItem] : cartData;
  const checkoutSubtotal = buyNowItem
    ? (buyNowItem.price || 0) * (buyNowItem.quantity || 1)
    : cartSubtotal?.subtotal || 0;

  // GST portion of the total above. Prices already include GST, so this is tax
  // taken back out, never added on. For the cart it is computed server-side —
  // cart documents carry no gstPercent, so the client cannot derive it. The
  // Buy Now item carries the rate from the product page, the one place it is
  // known client-side.
  const checkoutGst = buyNowItem
    ? (() => {
        const rate = Number(buyNowItem.gstPercent) || 0;
        if (!rate) return null;
        const line = (buyNowItem.price || 0) * (buyNowItem.quantity || 1);
        return line - line / (1 + rate / 100);
      })()
    : cartSubtotal?.gstAmount !== undefined
      ? Number(cartSubtotal.gstAmount)
      : null;

  // Delivery, from the same shared rule the server charges by. Shown before
  // the customer commits rather than appearing on the Razorpay screen — the
  // server is still the one that decides it, and it prices from the
  // catalogue, so this can only ever agree with what is charged.
  const deliveryCharge = deliveryChargeFor(
    buyNowItem
      ? [{
          deliveryCharge: buyNowItem.deliveryCharge,
          unitPrice: buyNowItem.price,
          quantity: buyNowItem.quantity || 1,
        }]
      : (cartData || []).map((i) => ({
          deliveryCharge: i.deliveryCharge,
          unitPrice: i.price,
          quantity: i.quantity || 1,
        }))
  );

  // Once Razorpay reports success the server has ALREADY placed the order
  // (paid, stock reserved, owner alerted). From then on the payment method is
  // locked and Complete Order only finishes that order — switching to Cash on
  // Delivery used to post a second order for the same items (bug B20).
  const isPaid = paymentInfo?.status === "success";
  const choosePaymentMethod = (method) => {
    if (!isPaid) setPaymentMethod(method);
  };

  const onlinePaymentBox = (
    <div className="mt-6 pt-6 border-t border-outline-variant/30 px-2" onClick={(e) => e.stopPropagation()}>
      <PaymentContext.Provider
        value={{
          // The items and the total must come from the same source: Payment
          // used to read the cart itself, so a "Buy Now" checkout billed the
          // cart while showing the Buy Now total.
          orderTotal: checkoutSubtotal,
          checkoutItems: checkoutItems,
          isBuyNow: !!buyNowItem,
          setPaymentInfo: setPaymentInfo,
        }}
      >
        <Payment />
      </PaymentContext.Provider>
    </div>
  );

  const handlePlaceOrder = () => {
    // Every checkout is paid through Razorpay first, so Complete Order only
    // ever finishes an order that already exists and is already paid. There is
    // no unpaid path left to fall through to: POST /api/orders placed cash-on-
    // delivery orders and the shop no longer offers it.
    if (!isPaid) return;
    setIsPlacingOrder(true);

    // The order already exists, created and verified in Payment.jsx. Finish it
    // — whatever tile is highlighted — and never post another one.
    navigate("/order-success", {
      state: {
        orderStatus: "success",
        from: location,
        orderId: paymentInfo.orderId,
      },
    });

    // The server took the paid items out of the bag when it confirmed the
    // payment (B21), and left it alone for a Buy Now — so nothing is cleared
    // here; the refetch shows the bag as it now is.
    setPaymentInfo(null);
    refetch();
  };

  return (
    <main className="pt-32 pb-section-gap-lg max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop min-h-screen font-body-base bg-background">
      <CustomHelmet title="Checkout" />
      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left Side: Form (60%) */}
        <div className="w-full lg:w-[60%] fade-in">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-3 mb-10 text-on-surface-variant font-label-caps tracking-widest text-[11px]">
            <Link to="/shop" className="hover:text-primary transition-colors">SHOP</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">CHECKOUT</span>
          </nav>
          
          <section className="mb-12">
            <h2 className="font-display-lg text-headline-sm mb-8 text-primary">Shipping Address</h2>
            {isEditingAddress || !userFromDB?.shippingAddress ? (
              <ShippingAddressForm
                heading={userFromDB?.shippingAddress ? "Edit delivery address" : "Where should we deliver?"}
                onCancel={userFromDB?.shippingAddress ? () => setIsEditingAddress(false) : undefined}
                onSaved={() => setIsEditingAddress(false)}
              />
            ) : (
              <div className="p-6 border border-outline-variant/30 bg-white space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-[0.2em] block mb-1">Name</span>
                    <p className="text-on-surface font-semibold">
                      {userFromDB?.shippingAddress.firstName} {userFromDB?.shippingAddress.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-[0.2em] block mb-1">Email</span>
                    <p className="text-on-surface font-semibold">
                      {userFromDB?.shippingAddress.email}
                    </p>
                  </div>
                  <div>
                    <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-[0.2em] block mb-1">Phone</span>
                    <p className="text-on-surface font-semibold">
                      {userFromDB?.shippingAddress.number || userFromDB?.shippingAddress.mobileNumber}
                    </p>
                  </div>
                  <div>
                    <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-[0.2em] block mb-1">City</span>
                    <p className="text-on-surface font-semibold">
                      {userFromDB?.shippingAddress.city}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-outline-variant/20">
                  <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-[0.2em] block mb-1">Full Address</span>
                  <p className="text-on-surface">
                    {userFromDB?.shippingAddress.streetAddress}, {userFromDB?.shippingAddress.city},{" "}
                    {userFromDB?.shippingAddress.state} - {userFromDB?.shippingAddress.postalCode},{" "}
                    {userFromDB?.shippingAddress.country}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(true)}
                  className="inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors font-label-caps text-xs mt-4"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  EDIT ADDRESS
                </button>
              </div>
            )}
          </section>

          <section className="mb-12">
            <h2 className="font-display-lg text-headline-sm mb-8 text-primary">Payment Method</h2>
            {isPaid && (
              <p role="status" className="mb-6 p-4 border border-primary/30 bg-surface-container text-on-surface text-sm">
                Payment received — your order is placed. Select Complete Order to finish; the payment
                method can no longer be changed.
              </p>
            )}
            <div className="space-y-4">
              <label 
                className={`flex flex-col p-5 bg-white border cursor-pointer hover:border-primary transition-ui group ${paymentMethod === 'card' ? 'border-primary' : 'border-outline-variant'}`}
                onClick={() => choosePaymentMethod('card')}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <input 
                      checked={paymentMethod === 'card'} 
                      readOnly
                      className="text-primary focus:ring-primary w-5 h-5 border-outline-variant" 
                      type="radio" 
                      name="payment" 
                    />
                    <span className="font-label-caps text-on-surface">CREDIT CARD</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant">credit_card</span>
                  </div>
                </div>
                {paymentMethod === 'card' && onlinePaymentBox}
              </label>

              <label 
                className={`flex flex-col p-5 bg-white border cursor-pointer hover:border-primary transition-ui group ${paymentMethod === 'upi' ? 'border-primary' : 'border-outline-variant'}`}
                onClick={() => choosePaymentMethod('upi')}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <input 
                      checked={paymentMethod === 'upi'}
                      readOnly
                      className="text-primary focus:ring-primary w-5 h-5 border-outline-variant" 
                      type="radio" 
                      name="payment" 
                    />
                    <span className="font-label-caps text-on-surface">UPI / QR SCAN</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">qr_code_2</span>
                </div>
                {/* Razorpay's checkout offers UPI and QR itself, so the UPI tile
                    uses the very same payment box as the card tile — one
                    payment path, never a second one. */}
                {paymentMethod === 'upi' && onlinePaymentBox}
              </label>

            </div>

            {/* Said plainly here, not only in the policy: a customer who
                expects to pay the courier should find out now, not when the
                parcel does not arrive. */}
            <p className="mt-5 font-body-base text-[13px] text-on-surface-variant">
              We do not offer cash on delivery — every order is paid in full here.
              Once paid, an order cannot be cancelled, so please check your
              selection and address before you pay.{" "}
              <Link to="/legal/cancellation-policy" className="underline hover:text-primary transition-colors">
                Cancellation Policy
              </Link>
            </p>
          </section>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-outline-variant/30">
            <Link to="/shop" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-[12px]">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              RETURN TO SHOP
            </Link>
            <button 
              className="w-full md:w-auto px-12 py-5 bg-primary-container text-on-primary-container font-button-text text-button-text uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-ui shadow-lg shadow-primary/10 text-center disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
              onClick={handlePlaceOrder}
              disabled={
                // Every order is paid through Razorpay first; Complete Order
                // only confirms what has already been paid.
                !isPaid ||
                !userFromDB?.shippingAddress ||
                isPlacingOrder ||
                !checkoutItems?.length
              }
            >
              {isPlacingOrder ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Processing...
                </>
              ) : 'Complete Order'}
            </button>
          </div>
        </div>

        {/* Right Side: Order Summary (40%) */}
        <aside className="w-full lg:w-[40%]">
          <OrderSummary
            className="lg:sticky lg:top-32 rounded-none fade-in"
            items={checkoutItems}
            total={(Number(checkoutSubtotal) || 0) + deliveryCharge}
            gstAmount={checkoutGst}
            shipping={deliveryCharge > 0 ? `₹${deliveryCharge.toLocaleString("en-IN")}` : "FREE"}
            rows={
              paymentInfo
                ? [{
                    label: "Payment status",
                    tone: "success",
                    value: (
                      <span className="font-bold inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                        PAID
                      </span>
                    ),
                  }]
                : []
            }
            footer={
              <div className="mt-8 pt-8 border-t border-outline-variant/30 grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  <span className="text-[10px] font-label-caps tracking-widest">SECURE</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                  <span className="text-[10px] font-label-caps tracking-widest">INSURED</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                  <span className="text-[10px] font-label-caps tracking-widest">GUARANTEE</span>
                </div>
              </div>
            }
          />
        </aside>
      </div>
    </main>
  );
};

export default Checkout;
