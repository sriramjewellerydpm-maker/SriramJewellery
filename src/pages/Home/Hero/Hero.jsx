import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Editorial Image */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center ken-burns" 
          style={{ backgroundImage: "url('/images/hero-jewellery.jpg')" }}
        ></div>
        <div className="absolute inset-0 hero-gradient"></div>
      </div>
      
      {/* Content Overlay */}
      <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop fade-in-up">
        <div className="mb-8 tracking-[0.4em] text-white/90">
          <span className="font-label-caps text-label-caps block mb-2">SINCE 1999</span>
          <div className="w-16 h-[1px] bg-white/50 mx-auto"></div>
        </div>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-6 leading-tight max-w-4xl mx-auto italic">
          The Art of Eternal Heritage
        </h1>
        <p className="font-body-lg text-body-lg text-white/80 max-w-xl mx-auto mb-12 tracking-wide font-light">
          Discover a legacy carved in gold and adorned with history’s finest treasures.
        </p>
        <div className="flex flex-col items-center">
          <Link 
            to="/shop"
            className="font-button-text text-button-text uppercase tracking-widest px-10 py-4 bg-white text-primary hover:bg-surface-container transition-colors duration-500 scale-100 hover:scale-105 active:scale-95 inline-block"
          >
            Explore Collection
          </Link>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 text-white flex flex-col items-center gap-4 bounce-slow pointer-events-none">
        <span className="font-label-caps text-label-caps opacity-60">SCROLL</span>
        <span className="material-symbols-outlined text-3xl font-thin">expand_more</span>
      </div>
    </section>
  );
};

export default Hero;
