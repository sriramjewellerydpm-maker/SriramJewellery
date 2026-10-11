import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useProducts from "../../../hooks/useProducts";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import Swal from "sweetalert2";
import { optimizeCloudinaryUrl } from "../../../utils/cloudinaryImage";
import useAdminMutation from "../../../hooks/useAdminMutation";
import { certainFailure } from "../../../utils/mutationError";

const AdminProducts = () => {
  const [products, isProductsLoading] = useProducts();
  const [axiosSecure] = useAxiosSecure();
  const [searchText, setSearchText] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const displayedProducts = (products || []).filter(p => 
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalPages = Math.ceil(displayedProducts.length / itemsPerPage);
  const paginatedProducts = displayedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Both row actions used to swallow their own failure: the toggle logged to
  // the console and left the switch showing the old position, and a delete
  // that answered anything other than { success: true } produced no dialog at
  // all. Neither had a pending state, so either could be fired twice.
  const deleteProduct = useAdminMutation({
    mutationFn: async (_id) => {
      const res = await axiosSecure.delete(`/products/${_id}`);
      if (!res.data?.success) {
        throw certainFailure("The server did not confirm the deletion.");
      }
      return res.data;
    },
    invalidate: [["products"], ["admin-stats"], ["admin-best-selling"]],
    successTitle: "Product deleted",
    errorTitle: "Product not deleted",
    errorFallback: "The product could not be deleted.",
  });

  const toggleVisibility = useAdminMutation({
    mutationFn: async ({ _id, nextStatus }) => {
      const res = await axiosSecure.patch(`/products/${_id}`, { isActive: nextStatus });
      if (!res.data?.success && !res.data?.modifiedCount) {
        throw certainFailure("The server did not confirm the change.");
      }
      return res.data;
    },
    invalidate: [["products"]],
    successTitle: "Visibility updated",
    errorTitle: "Visibility unchanged",
    errorFallback: "The product's visibility could not be changed.",
  });

  // Which row is busy, so a spinner lands on the one that was clicked rather
  // than on all of them.
  const isDeleting = (_id) => deleteProduct.isLoading && deleteProduct.variables === _id;
  const isToggling = (_id) => toggleVisibility.isLoading && toggleVisibility.variables?._id === _id;
  const isRowBusy = (_id) => isDeleting(_id) || isToggling(_id);

  const handleDeleteProduct = async (_id) => {
    const { isConfirmed } = await Swal.fire({
      title: "Are you sure?",
      text: "This product will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#704c31",
      cancelButtonColor: "#ba1a1a",
      confirmButtonText: "Yes, delete it!"
    });
    if (isConfirmed) deleteProduct.mutate(_id);
  };

  const handleToggleVisibility = (_id, currentStatus) => {
    toggleVisibility.mutate({ _id, nextStatus: !currentStatus });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="h-20 flex items-center justify-between px-6 md:px-margin-desktop bg-background/80 backdrop-blur-md border-b border-outline-variant/30 z-40">
        <h2 className="font-display-lg text-headline-md text-primary">Products</h2>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative w-48 md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 bg-transparent border-0 border-b border-outline-variant focus:ring-0 focus:border-primary text-body-base outline-none transition-ui placeholder:text-outline/60" 
              placeholder="Search products..." 
              type="text" 
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Link to="/dashboard/adminAddProducts">
            <button className="flex items-center gap-2 bg-primary-container text-white px-4 md:px-6 py-2.5 rounded-lg font-button-text hover:scale-[1.02] active:scale-95 transition-ui shadow-lg shadow-primary/10">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden md:inline">Add Product</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Table Section */}
      <section className="flex-1 overflow-y-auto p-4 md:p-margin-desktop custom-scrollbar">
        <div className="bg-surface-dim border border-secondary/20 overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant/50 bg-surface-container-high/50">
                <th className="px-6 py-4 font-label-caps text-outline text-[11px]">Thumbnail</th>
                <th className="px-6 py-4 font-label-caps text-outline text-[11px]">Product Name</th>
                <th className="px-6 py-4 font-label-caps text-outline text-[11px]">Category</th>
                <th className="px-6 py-4 font-label-caps text-outline text-[11px]">Total Price</th>
                <th className="px-6 py-4 font-label-caps text-outline text-[11px] text-center">Status</th>
                <th className="px-6 py-4 font-label-caps text-outline text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {paginatedProducts.map(product => (
                <tr
                  key={product._id}
                  aria-busy={isRowBusy(product._id)}
                  className={`hover:bg-white/40 transition-colors group ${isRowBusy(product._id) ? "opacity-60" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="w-16 h-16 rounded bg-surface-container-highest border border-outline-variant/30 overflow-hidden">
                      <img src={optimizeCloudinaryUrl(product.image || product.img, { width: 150 }) || '/placeholder.jpg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-button-text text-primary">{product.name}</p>
                    <p className="text-[12px] text-outline">SKU: {product.productId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-[12px] font-medium border border-outline-variant/30">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    {product.isQuoteOnly ? (
                      <p className="font-button-text italic text-outline">Quote Only</p>
                    ) : product.price ? (
                      <>
                        {/* The customer-facing total: metal + wastage + GST.
                            Unformatted it read as an arbitrary number and gave
                            no way to tell a wrong rate from a wrong weight. */}
                        <p className="font-button-text">
                          ₹ {Number(product.price).toLocaleString("en-IN")}
                        </p>
                        {product.priceBreakdown && (
                          <p className="text-[11px] text-on-surface-variant">
                            metal ₹{Number(product.priceBreakdown.metalValue).toLocaleString("en-IN")}
                            {" + "}wastage ₹{Number(product.priceBreakdown.wastageValue).toLocaleString("en-IN")}
                            {" + "}GST ₹{Number(product.priceBreakdown.gst).toLocaleString("en-IN")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="font-button-text italic text-outline">Dynamic</p>
                    )}
                    <p className="text-[11px] text-tertiary-container uppercase tracking-tighter">
                      {product.metalType || "Gold"} | {product.weight}g
                      {product.priceBreakdown?.ratePerGram
                        ? ` @ ₹${Number(product.priceBreakdown.ratePerGram).toLocaleString("en-IN")}/g`
                        : ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <label className="relative inline-block w-[44px] h-[22px]">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={product.isActive !== false} 
                        disabled={isRowBusy(product._id)}
                        aria-busy={isToggling(product._id)}
                        aria-label={`${product.isActive !== false ? "Hide" : "Show"} ${product.name}`}
                        onChange={() => handleToggleVisibility(product._id, product.isActive !== false)}
                      />
                      <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 transition-ui duration-300 rounded-[34px] ${product.isActive !== false ? 'bg-primary-container' : 'bg-outline-variant'} before:absolute before:content-[''] before:h-[16px] before:w-[16px] before:left-[3px] before:bottom-[3px] before:bg-white before:transition-ui before:duration-300 before:rounded-full ${product.isActive !== false ? 'before:translate-x-[22px]' : ''}`}></span>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/dashboard/adminAddProducts/${product._id}`}>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant/50 text-outline hover:text-primary hover:border-primary transition-ui">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        disabled={isRowBusy(product._id)}
                        aria-label={`Delete ${product.name}`}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant/50 text-outline hover:text-error hover:border-error transition-ui disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isDeleting(product._id) ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && !isProductsLoading && (
                  <tr>
                      <td colSpan="6" className="text-center py-10 text-outline font-body-base">No products found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-surface-dim border border-secondary/20 rounded-lg">
            <span className="text-sm text-outline font-body-base">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, displayedProducts.length)} of {displayedProducts.length} entries
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-outline-variant rounded hover:bg-surface disabled:opacity-50 transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded transition-colors ${currentPage === page ? 'bg-primary text-white border-primary' : 'border-outline-variant hover:bg-surface'}`}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-outline-variant rounded hover:bg-surface disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminProducts;
