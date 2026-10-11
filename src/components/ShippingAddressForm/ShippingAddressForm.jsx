import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { City, State } from "country-state-city";
import toast from "react-hot-toast";
import useUserInfo from "../../hooks/useUserInfo";
import useAxiosSecure from "../../hooks/useAxiosSecure";

/**
 * The one shipping-address form.
 *
 * It lives here rather than in AddressBook because checkout needs it too: a
 * customer with no address used to be sent to /dashboard/myAddress to add one,
 * which abandons the checkout they were halfway through. They now fill it in
 * place. Two copies of a form this fiddly — state/city pairing, a default
 * state, phone length — would drift, and the one at checkout is the copy that
 * must not be wrong.
 *
 * It saves through PATCH /users/shipping-address and refetches the shared
 * `useUserInfo` query, so every page reading that query (checkout included)
 * sees the new address without being told about it.
 *
 * @param {object}   props
 * @param {Function} [props.onSaved]  after a successful save
 * @param {Function} [props.onCancel] when set, a close button is shown
 * @param {string}   [props.heading]  overrides the default heading
 */

// This store currently ships within India only.
const COUNTRY_CODE = "IN";
const COUNTRY_NAME = "India";
const PHONE_CODE = "91";
const PHONE_NUMBER_LENGTH = 10;

// Where most customers are, so a new address starts here instead of on whatever
// happens to sort first (Andaman and Nicobar Islands). A default only — the
// dropdown stays fully editable for everyone else.
//
// NOTE for the planned country-state-city removal: these two constants and the
// blank-form guard below are the whole of this behaviour. A static India-only
// state/city dataset only needs to keep exposing an `isoCode` of "TN" for it to
// carry over unchanged; nothing here depends on the library itself.
const DEFAULT_STATE_CODE = "TN";

const FIELD =
  "w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base";
const LABEL = "font-label-caps text-label-caps text-outline uppercase block mb-2";

const ShippingAddressForm = ({ onSaved, onCancel, heading }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const [userFromDB, , refetch] = useUserInfo();
  const [axiosSecure] = useAxiosSecure();

  const shippingAdd = userFromDB?.shippingAddress || null;

  const [stateData, setStateData] = useState([]);
  const [cityData, setCityData] = useState([]);
  const [stateCode, setStateCode] = useState("");

  const phoneNumInfo = { phoneCode: PHONE_CODE, numberLength: PHONE_NUMBER_LENGTH };

  useEffect(() => {
    setStateData(State.getStatesOfCountry(COUNTRY_CODE));
  }, []);

  useEffect(() => {
    if (!stateData.length) return;

    // Only seed a default into a genuinely blank form. An address being edited
    // carries its own state, applied by the prefill effect below — seeding here
    // first would briefly show the wrong state, and would win outright if the
    // saved one ever failed to match.
    if (shippingAdd) return;

    const hasDefault = stateData.some((s) => s.isoCode === DEFAULT_STATE_CODE);
    setStateCode(hasDefault ? DEFAULT_STATE_CODE : stateData[0]?.isoCode);
  }, [stateData, shippingAdd]);

  useEffect(() => {
    if (!stateCode) return;
    const cities = City.getCitiesOfState(COUNTRY_CODE, stateCode);
    if (cities.length) {
      setCityData(cities);
    } else {
      const allCities = City.getCitiesOfCountry(COUNTRY_CODE);
      setCityData(allCities.filter((city) => city.stateCode === stateCode));
    }
  }, [stateCode]);

  // Prefill: from the saved address when editing, or from the account name
  // when starting a brand-new address.
  useEffect(() => {
    if (shippingAdd) {
      const matchedState = stateData.find((s) => s.name === shippingAdd.state);
      if (matchedState) setStateCode(matchedState.isoCode);
      reset({
        firstName: shippingAdd.firstName || "",
        lastName: shippingAdd.lastName || "",
        email: shippingAdd.email || userFromDB?.email || "",
        streetAddress: shippingAdd.streetAddress || "",
        postalCode: shippingAdd.postalCode || "",
        mobileNumber: shippingAdd.mobileNumber || "",
      });
    } else if (userFromDB) {
      const nameParts = userFromDB?.name?.split(" ") || [];
      reset({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: userFromDB?.email || "",
      });
    }
  }, [shippingAdd, stateData, userFromDB, reset]);

  // Once the city list for the saved state has loaded, select the saved city.
  useEffect(() => {
    if (shippingAdd?.city && cityData.some((c) => c.name === shippingAdd.city)) {
      setValue("city", shippingAdd.city);
    }
  }, [cityData, shippingAdd, setValue]);

  const onSubmit = async (data) => {
    const stateName = State.getStateByCodeAndCountry(data.state, COUNTRY_CODE)?.name || data.state;

    const payload = {
      ...data,
      state: stateName,
      country: COUNTRY_NAME,
      number: `+${phoneNumInfo.phoneCode} ${data.mobileNumber}`,
    };

    try {
      const res = await axiosSecure.patch("/users/shipping-address", payload);
      if (res.data?.modifiedCount > 0 || res.data?.success) {
        toast.success("Shipping address saved");
        // Refetch before handing control back, so a caller that reads the
        // address immediately (checkout enabling Complete Order) sees it.
        await refetch();
        onSaved?.(payload);
      } else {
        toast.error("Could not save the address. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Could not save the address. Please try again.");
    }
  };

  return (
    <div className="bg-surface-container border border-outline-variant/30 p-8 animate-in fade-in duration-500 rounded-xl">
      <div className="flex justify-between items-center mb-8 border-b border-primary/10 pb-4">
        <h4 className="font-headline-sm text-headline-sm text-primary">
          {heading || (shippingAdd ? "Edit Address" : "New Address")}
        </h4>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LABEL}>First Name</label>
            <input type="text" className={FIELD} {...register("firstName", { required: true })} />
            {errors.firstName && <span className="text-error text-xs italic mt-1 block">Required</span>}
          </div>
          <div>
            <label className={LABEL}>Last Name</label>
            <input type="text" className={FIELD} {...register("lastName", { required: true })} />
            {errors.lastName && <span className="text-error text-xs italic mt-1 block">Required</span>}
          </div>
        </div>

        <div>
          <label className={LABEL}>Email</label>
          <input type="email" className={FIELD} {...register("email", { required: true })} />
          {errors.email && <span className="text-error text-xs italic mt-1 block">Required</span>}
        </div>

        <div>
          <label className={LABEL}>Street Address</label>
          <input type="text" className={FIELD} {...register("streetAddress", { required: true })} />
          {errors.streetAddress && <span className="text-error text-xs italic mt-1 block">Required</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LABEL}>Country</label>
            <input
              type="text"
              readOnly
              disabled
              value={COUNTRY_NAME}
              className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 text-on-surface-variant font-body-base cursor-not-allowed"
            />
          </div>
          <div>
            <label className={LABEL}>State</label>
            <select
              className={FIELD}
              {...register("state", { required: true })}
              value={stateCode}
              onChange={(e) => {
                setStateCode(e.target.value);
                // The previously chosen city belongs to the old state, so drop
                // it rather than carry a mismatched pair into the order.
                // Cleared here, on a deliberate change, rather than in an
                // effect that would race the saved-address restore.
                setValue("city", "");
              }}
            >
              {stateData?.map((state) => (
                <option key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LABEL}>City</label>
            <select className={FIELD} {...register("city", { required: true })} defaultValue="">
              {/* There is no sensible default city, so the form opens with none
                  chosen rather than silently selecting whichever sorts first.
                  `required` then makes the customer pick one. */}
              <option value="" disabled>
                Select a city
              </option>
              {cityData?.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
            {errors.city && <span className="text-error text-xs italic mt-1 block">Required</span>}
          </div>
          <div>
            <label className={LABEL}>Zip/Postal Code</label>
            <input type="text" className={FIELD} {...register("postalCode", { required: true })} />
            {errors.postalCode && <span className="text-error text-xs italic mt-1 block">Required</span>}
          </div>
        </div>

        <div>
          <label className={LABEL}>Mobile Number</label>
          <div className="flex border-b border-outline-variant focus-within:border-primary transition-colors">
            <span className="py-3 pr-2 text-on-surface-variant font-body-base">+{phoneNumInfo.phoneCode}</span>
            <input
              type="number"
              className="w-full bg-transparent border-0 py-3 px-0 focus:ring-0 text-on-surface outline-none font-body-base"
              {...register("mobileNumber", {
                required: true,
                maxLength: phoneNumInfo.numberLength,
                minLength: phoneNumInfo.numberLength,
              })}
            />
          </div>
          {errors.mobileNumber && (
            <span className="text-error text-xs italic mt-1 block">
              Required length: {phoneNumInfo.numberLength} digits
            </span>
          )}
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto font-button-text text-button-text bg-primary text-white px-10 py-4 hover:bg-primary/90 transition-ui uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save Address"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShippingAddressForm;
