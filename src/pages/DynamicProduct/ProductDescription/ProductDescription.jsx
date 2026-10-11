import React, { useEffect, useState } from "react";
import useProducts from "../../../hooks/useProducts";
import { useParams } from "react-router-dom";

const ProductDescription = () => {
  const { id } = useParams();
  const [products] = useProducts();
  const [dynamicProduct, setDynamicProduct] = useState(null);

  useEffect(() => {
    const filter = products?.find((item) => item._id == id); // find product by id
    setDynamicProduct(filter);
  }, [products, id]);

  return (
    <div className="py-16 px-4 flex flex-col md:flex-row justify-between items-start gap-16 border-b border-outline-variant/30">
      <div className="md:w-7/12 space-y-12">
        <section>
          <h4 className="font-display-lg text-headline-sm text-primary mb-6">
            ABOUT
          </h4>
          <p className="font-body-base text-on-surface-variant leading-relaxed text-justify">
            {dynamicProduct?.details?.description || dynamicProduct?.description}
          </p>
        </section>

        <section>
          <h4 className="font-display-lg text-headline-sm text-primary mb-6">
            FEATURES
          </h4>
          <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
            <div className="flex flex-col">
              <span className="font-label-caps text-xs text-primary uppercase tracking-widest mb-1">Size</span>
              <span className="font-body-base text-on-surface-variant">{dynamicProduct?.size || 'Standard'}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-xs text-primary uppercase tracking-widest mb-1">Purity</span>
              <span className="font-body-base text-on-surface-variant">{dynamicProduct?.carate || '22'}K Gold</span>
            </div>
          </div>
        </section>

        {dynamicProduct?.details?.advantages && dynamicProduct.details.advantages.length > 0 && (
          <section>
            <h4 className="font-display-lg text-headline-sm text-primary mb-6">
              ADVANTAGES
            </h4>
            <ul className="space-y-4 text-on-surface-variant font-body-base">
              {dynamicProduct.details.advantages.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-sm mt-1">diamond</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      
      <div className="md:w-5/12 bg-surface-container-low border border-outline-variant/30 p-8 md:p-12 space-y-8 rounded-sm">
        <section>
          <h4 className="font-display-lg text-headline-sm text-primary mb-6 border-b border-outline-variant/30 pb-4">
            SHIPPING
          </h4>
          <div className="space-y-6 font-body-base text-on-surface-variant leading-relaxed">
            <p>
              Jewellery orders above ₹5,000 are delivered free across India, counted before taxes and delivery. Coins are charged for delivery whatever the order comes to.
            </p>
            <p className="italic">
              Please allow up to 2 business days (excluding weekends, holidays, and sale days) to process your order.
            </p>
            <div className="bg-primary/5 p-4 border-l-2 border-primary text-sm">
              <span className="font-bold text-primary">Processing Time + Shipping Time = Delivery Time</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductDescription;
