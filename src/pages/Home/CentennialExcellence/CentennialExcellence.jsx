import React from 'react';
import { Link } from 'react-router-dom';
import useCategories from '../../../hooks/useCategories';

const CentennialExcellence = () => {
  const { categories, isCategoriesLoading } = useCategories();

  const fallbackImg = "/images/artisan.jpg";
  const getCatImg = (cat) => cat?.image || cat?.categoryPic || fallbackImg;

  return (
    <main className="relative z-20 bg-background pt-section-gap-sm">
      {/* Subtle Transition Header */}
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-section-gap-sm text-center">
        <div className="w-16 h-1 bg-primary mx-auto mb-8"></div>
        <h2 className="font-headline-md text-headline-md text-primary mb-4">A Centennial of Excellence</h2>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mx-auto italic">
          Every piece tells a story of devotion, meticulously handcrafted by our master artisans over generations.
        </p>
      </div>

      {/* Bento Grid: Featured Heritage Items */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-section-gap-lg">
        {isCategoriesLoading ? (
          <div className="grid grid-cols-12 gap-gutter items-start h-[700px] animate-pulse">
            <div className="col-span-12 md:col-span-7 bg-surface-container rounded-lg h-full"></div>
            <div className="col-span-12 md:col-span-5 flex flex-col gap-10 md:-mt-12 h-full">
               <div className="bg-surface-container rounded-lg h-64"></div>
               <div className="grid grid-cols-2 gap-6 flex-1">
                 <div className="bg-surface-container rounded-lg h-full"></div>
                 <div className="bg-surface-container rounded-lg h-full"></div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-gutter items-start">
            {/* Large Hero Feature (Left) */}
            <div className="col-span-12 md:col-span-7 relative group overflow-hidden border border-outline-variant/30 aspect-[4/5] md:aspect-auto md:h-[700px] mt-8 block">
              {categories && categories[0] ? (
                <Link to={`/shop?category=${categories[0].categoryName.toLowerCase()}`} className="w-full h-full block">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" style={{ backgroundImage: `url('${getCatImg(categories[0])}')` }}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-10 text-white">
                    <span className="font-label-caps text-label-caps block mb-3 tracking-widest">THE CRAFT</span>
                    <h3 className="font-headline-md text-headline-md mb-6">{categories[0].categoryName}</h3>
                    <button className="font-button-text text-button-text border-b border-white pb-1 hover:border-primary-fixed transition-colors inline-flex items-center min-h-11">Explore the Atelier</button>
                  </div>
                </Link>
              ) : (
                <div className="w-full h-full bg-surface-container flex items-center justify-center text-on-surface-variant">No category found</div>
              )}
            </div>

            {/* Supporting Column (Right) */}
            <div className="col-span-12 md:col-span-5 flex flex-col gap-10 md:-mt-12">
              
              {/* Overlapping Card 1 */}
              <div className="bg-surface-container p-8 border border-outline-variant/30 relative z-10">
                {categories && categories[1] ? (
                  <>
                    <span className="font-label-caps text-label-caps text-primary/60 block mb-3">SIGNATURE</span>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-3">{categories[1].categoryName}</h3>
                    <p className="font-body-base text-on-surface-variant mb-6 italic">Sacred motifs reborn in precious metal, carrying the soul of ancient architecture.</p>
                    <div className="aspect-video overflow-hidden mb-6">
                      <img src={getCatImg(categories[1])} alt={categories[1].categoryName} className="w-full h-full object-cover" />
                    </div>
                    <Link to={`/shop?category=${categories[1].categoryName.toLowerCase()}`} className="font-button-text text-button-text text-primary hover:underline inline-flex items-center min-h-11">Shop the Collection</Link>
                  </>
                ) : (
                   <div className="text-on-surface-variant text-center">No category found</div>
                )}
              </div>

              {/* Overlapping Card 2 */}
              <div className="grid grid-cols-2 gap-6">
                <Link to={categories && categories[2] ? `/shop?category=${categories[2].categoryName.toLowerCase()}` : "/shop"} className="relative aspect-[3/4] overflow-hidden border border-outline-variant/30 group block">
                  {categories && categories[2] ? (
                    <>
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${getCatImg(categories[2])}')` }}></div>
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <p className="font-label-caps text-[10px] tracking-widest uppercase">{categories[2].categoryName}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center text-on-surface-variant text-[10px]">Empty</div>
                  )}
                </Link>

                {categories && categories[3] ? (
                  <Link to={`/shop?category=${categories[3].categoryName.toLowerCase()}`} className="relative aspect-[3/4] overflow-hidden border border-outline-variant/30 group block">
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${getCatImg(categories[3])}')` }}></div>
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="font-label-caps text-[10px] tracking-widest uppercase">{categories[3].categoryName}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-surface-container-low p-6 flex flex-col justify-center border border-outline-variant/30">
                    <span className="material-symbols-outlined text-primary mb-4">workspace_premium</span>
                    <h4 className="font-headline-sm text-[18px] text-primary mb-2">Bespoke</h4>
                    <p className="font-body-base text-[12px] text-on-surface-variant mb-4">Custom family legacies.</p>
                    <Link to="/about" className="text-[11px] font-button-text uppercase tracking-tighter text-primary border-b border-primary w-fit">Inquire</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default CentennialExcellence;
