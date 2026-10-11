import React from 'react';

const OwnPieceHistory = () => {
  return (
    <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-section-gap-lg overflow-hidden border border-outline-variant/30">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Imagery Side */}
        <div className="relative h-64 md:h-auto overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/own-piece.jpg')" }}></div>
          <div className="absolute inset-0 bg-primary/20 backdrop-multiply"></div>
        </div>
        {/* Content Side */}
        <div className="bg-surface-container p-12 md:p-20 flex flex-col justify-center items-start text-left">
          <span className="material-symbols-outlined text-4xl text-primary mb-6">loyalty</span>
          <h2 className="font-headline-md text-headline-md text-primary mb-6">Own a Piece of History</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 leading-relaxed">
            Join our exclusive Gold Scheme and start your journey towards owning the jewellery of your dreams. Timeless value for timeless beauty, secured for generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <button className="bg-primary text-white font-button-text text-button-text px-10 py-4 hover:bg-secondary transition-ui uppercase tracking-widest">Enroll in Scheme</button>
            <button className="border border-primary text-primary font-button-text text-button-text px-10 py-4 hover:bg-white transition-ui uppercase tracking-widest">Locate Store</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnPieceHistory;
