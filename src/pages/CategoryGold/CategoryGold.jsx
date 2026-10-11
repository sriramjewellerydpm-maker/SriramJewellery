import React from 'react';
import { Link } from 'react-router-dom';
import CustomHelmet from '../../components/CustomHelmet/CustomHelmet';
import useCategories from '../../hooks/useCategories';
import useProducts from '../../hooks/useProducts';
import { optimizeCloudinaryUrl } from '../../utils/cloudinaryImage';

/**
 * The collections page at /categories.
 *
 * It used to render a fixed list written into this file — Necklaces, Earrings,
 * Bangles & Bracelets and five more. None of them existed in the database, so
 * every tile fell back to an external placeholder that did not load and every
 * count read "0 PIECES". Adding a collection meant editing this file.
 *
 * It now shows exactly the categories created in Dashboard → Categories, so
 * the shop owner controls the page and nothing has to be deployed to change
 * it. The file keeps its old name only so the route and its history stay put.
 */
const CategoryGold = () => {
  const { categories, isCategoriesLoading } = useCategories();
  const [products, isProductsLoading] = useProducts();

  const isLoading = isCategoriesLoading || isProductsLoading;

  // Live counts, matched the same way the shop filters: on the category name,
  // ignoring case. No metal filter — the page previously appended metal=gold
  // to every link, which guaranteed an empty shop for a silver collection.
  const displayCategories = (categories || []).map((category) => ({
    id: category._id || category.categoryName,
    name: category.categoryName,
    image: category.categoryPic || category.image || null,
    count: (products || []).filter(
      (p) => p.category?.toLowerCase() === category.categoryName?.toLowerCase()
    ).length,
  }));

  return (
    <div className="font-body-base bg-background text-on-surface min-h-screen">
      <CustomHelmet title="Our Collections" />

      <main className="pt-32 pb-section-gap-lg max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">

        {/* Header Section */}
        <section className="text-center mb-16 flex flex-col items-center gap-4">
          <p className="font-label-caps text-label-caps tracking-[0.2em] uppercase text-primary">
            Collections
          </p>
          <h1 className="font-display-lg text-[48px] md:text-display-lg text-on-surface mb-2">
            Our Collections
          </h1>
          <p className="font-body-base text-on-surface-variant italic max-w-2xl">
            Every piece, gathered by the collection it belongs to.
          </p>
        </section>

        {isLoading ? (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-full aspect-[4/5] bg-surface-container animate-pulse mb-6 rounded-sm" />
                <div className="h-5 w-28 bg-surface-container animate-pulse rounded" />
              </div>
            ))}
          </section>
        ) : displayCategories.length === 0 ? (
          /* Said plainly rather than shown as a grid of empty boxes, which is
             what the fixed list produced and what it looked like on launch. */
          <section className="text-center py-20 border border-dashed border-outline-variant/50 rounded-sm">
            <p className="font-body-base text-on-surface-variant">
              No collections have been added yet.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
            {displayCategories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${encodeURIComponent(category.name.toLowerCase())}`}
                className="flex flex-col items-center group cursor-pointer"
              >
                <div className="w-full aspect-[4/5] bg-surface-container overflow-hidden mb-6 border border-outline-variant/30 rounded-sm">
                  {category.image ? (
                    <img
                      src={optimizeCloudinaryUrl(category.image, { width: 600 })}
                      alt={category.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    /* A category saved without a photo. Shown as a deliberate
                       monogram rather than a broken image with its alt text
                       hanging in the corner. */
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                      <span className="font-display-lg text-[40px] text-primary/40" aria-hidden="true">
                        {category.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="font-display-lg text-headline-sm text-on-surface text-center">
                  {category.name}
                </h3>
                <p className="font-label-caps text-label-caps tracking-[0.2em] text-on-surface-variant uppercase mt-2">
                  {category.count} {category.count === 1 ? 'Piece' : 'Pieces'}
                </p>
              </Link>
            ))}
          </section>
        )}

      </main>
    </div>
  );
};

export default CategoryGold;
