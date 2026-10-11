import React, { useEffect, useState } from "react";
import useUserInfo from "../../../hooks/useUserInfo";
import toast from "react-hot-toast";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import ShippingAddressForm from "../../../components/ShippingAddressForm/ShippingAddressForm";

const AddressBook = () => {
  const [userFromDB, , refetch] = useUserInfo();
  const [shippingAdd, setShippingAdd] = useState(null);
  const [axiosSecure] = useAxiosSecure();
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (userFromDB?.shippingAddress) {
      setShippingAdd(userFromDB.shippingAddress);
      setIsFormVisible(false);
    } else {
      setShippingAdd(null);
    }
  }, [userFromDB]);

  const handleDeleteAddress = () => {
    axiosSecure
      .patch(`/users/delete-address`)
      .then((res) => {
        if (res.data.modifiedCount > 0) {
          refetch();
          toast.success("Address removed");
        }
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="w-full">
      <header className="mb-12">
        <span className="font-label-caps text-label-caps text-primary tracking-[0.2em] uppercase block mb-2">
          Your Account
        </span>
        <h1 className="font-display-lg text-display-lg text-on-surface">Address Book</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Add New Address Button (Only show if form is hidden and we have less than 2 addresses conceptually, but for now just toggle form) */}
        {!isFormVisible && !shippingAdd && (
          <button 
            onClick={() => setIsFormVisible(true)}
            className="h-64 flex flex-col items-center justify-center gap-4 rounded-xl group cursor-pointer border-2 border-dashed border-primary hover:bg-primary/5 hover:border-solid transition-ui duration-300"
          >
            <div className="w-12 h-12 rounded-full border border-primary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-ui duration-500">
              <span className="material-symbols-outlined">add</span>
            </div>
            <span className="font-button-text text-button-text text-primary uppercase">
              Add New Address
            </span>
          </button>
        )}

        {/* Existing Address Card */}
        {!isFormVisible && shippingAdd && (
          <div className="bg-surface-container-highest p-8 rounded-xl flex flex-col justify-between h-64 relative overflow-hidden group border border-primary-container/10 transition-ui duration-400 hover:border-primary-container hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(139,100,71,0.08)]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {shippingAdd.firstName} {shippingAdd.lastName}
                </h3>
                <span className="px-3 py-1 border border-primary/40 text-[10px] font-label-caps text-primary uppercase tracking-widest rounded-full">
                  Default
                </span>
              </div>
              <div className="text-on-surface-variant space-y-1">
                <p className="font-body-base text-body-base">{shippingAdd.streetAddress}</p>
                <p className="font-body-base text-body-base">{shippingAdd.city}, {shippingAdd.state} - {shippingAdd.postalCode}</p>
                <p className="font-body-base text-body-base">{shippingAdd.country}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">call</span>
                <span className="font-body-base text-body-base">{shippingAdd.number}</span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsFormVisible(true)}
                  className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  aria-label="Edit"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button 
                  onClick={handleDeleteAddress}
                  className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                  aria-label="Delete"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address Form Container */}
      {isFormVisible && (
        <div className="mt-8 max-w-2xl">
          <ShippingAddressForm
            onCancel={shippingAdd ? () => setIsFormVisible(false) : undefined}
            onSaved={() => setIsFormVisible(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AddressBook;
