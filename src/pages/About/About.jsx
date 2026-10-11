import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CustomHelmet from "../../components/CustomHelmet/CustomHelmet";
import { getApiBaseUrl } from "../../utils/apiConfig";

const About = () => {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    axios
      .post(`${getApiBaseUrl()}/contact`, contactForm)
      .then(() => {
        setContactSubmitted(true);
        setContactForm({ name: "", email: "", message: "" });
      })
      .catch((error) => {
        toast.error(error.response?.data?.error || "Failed to send message. Please try again.");
      })
      .finally(() => setContactSubmitting(false));
  };

  return (
    <main className="min-h-screen bg-background font-body-base text-on-surface pt-32 pb-0">
      <CustomHelmet title={"Our Story & Contact"} />

      {/* Section 1: About Us (Our Story) */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in-up">
          <span className="font-label-caps text-label-caps text-primary tracking-[0.3em] block mb-6 uppercase">
            HERITAGE
          </span>
          <h1 className="font-display-lg text-[48px] md:text-display-lg text-on-surface mb-8">
            Timeless Craftsmanship
          </h1>
          <div className="space-y-6 font-body-lg text-body-lg text-on-surface-variant leading-relaxed italic">
            <p>Founded on the principles of uncompromising quality and poetic design, Sri Ram Jewellery began as a small boutique atelier. For generations, our master craftsmen have dedicated their lives to the alchemy of precious metals and gemstones, specializing in 22k gold and pure silver.</p>
            <p>Every piece we create is a narrative of tradition meeting modernity. We do not simply design jewellery; we forge heirlooms that carry the weight of memory and the sparkle of future legacies.</p>
          </div>
          <div className="mt-12">
            <div className="w-16 h-[1px] bg-sand/50 mx-auto"></div>
          </div>
        </div>
        
        {/* Full-bleed style Editorial Photography */}
        <div className="relative w-full h-[500px] md:h-[700px] overflow-hidden rounded-sm animate-fade-in-up border border-outline-variant/30" style={{ transitionDelay: "200ms" }}>
          <div className="absolute inset-0 bg-black/5 z-10 pointer-events-none"></div>
          <img 
            className="w-full h-full object-cover transition-transform duration-[10000ms] ease-out hover:scale-105" 
            alt="Artisan working on gold jewellery" 
            src="/images/artisan.jpg"
          />
        </div>
      </section>

      {/* Section 2: Contact (Get in Touch) */}
      <section className="mt-32 border-t border-outline-variant/30 pt-24 bg-surface" id="contact">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid md:grid-cols-2 gap-16 lg:gap-24 items-start pb-section-gap-lg">
          
          {/* Contact Form */}
          <div className="animate-fade-in-up">
            <span className="font-label-caps text-label-caps text-primary tracking-[0.3em] block mb-6 uppercase">
              GET IN TOUCH
            </span>
            <h2 className="font-display-lg text-[40px] md:text-display-md text-on-surface mb-12">
              Let’s Start a Conversation
            </h2>
            <form className="space-y-12" onSubmit={handleContactSubmit}>
              {contactSubmitted && (
                <div className="p-4 bg-success-sage/10 border border-success-sage/30 text-success text-sm font-semibold flex items-center gap-2 animate-fade-in">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Thank you! We'll get back to you shortly.
                </div>
              )}
              
              <div className="relative group">
                <label className="font-label-caps text-[10px] text-primary block mb-2 opacity-0 group-focus-within:opacity-100 transition-opacity">NAME</label>
                <input 
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-sand/50 focus:border-primary focus:ring-0 py-4 px-0 font-body-base text-on-surface placeholder:text-on-surface-variant/50 transition-ui duration-300 outline-none" 
                  placeholder="Name" 
                  type="text" 
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="relative group">
                <label className="font-label-caps text-[10px] text-primary block mb-2 opacity-0 group-focus-within:opacity-100 transition-opacity">EMAIL</label>
                <input 
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-sand/50 focus:border-primary focus:ring-0 py-4 px-0 font-body-base text-on-surface placeholder:text-on-surface-variant/50 transition-ui duration-300 outline-none" 
                  placeholder="Email" 
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="relative group">
                <label className="font-label-caps text-[10px] text-primary block mb-2 opacity-0 group-focus-within:opacity-100 transition-opacity">MESSAGE</label>
                <textarea 
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-sand/50 focus:border-primary focus:ring-0 py-4 px-0 font-body-base text-on-surface placeholder:text-on-surface-variant/50 resize-none transition-ui duration-300 outline-none" 
                  placeholder="How can we assist you?" 
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  required
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={contactSubmitting}
                className="bg-primary text-white font-button-text tracking-widest px-12 py-5 hover:bg-primary/90 transition-ui duration-300 inline-flex items-center gap-4 justify-center cursor-pointer disabled:opacity-70 uppercase w-full sm:w-auto"
              >
                {contactSubmitting ? <span className="loading loading-spinner loading-md"></span> : "SEND MESSAGE"}
                {!contactSubmitting && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
              </button>
            </form>
          </div>
          
          {/* Store Details Card */}
          <div className="animate-fade-in-up" style={{ transitionDelay: "300ms" }}>
            <div className="bg-surface-dim p-12 lg:p-16 border border-sand/30 space-y-12">
              <div>
                <h3 className="font-display-lg text-[28px] text-primary mb-6">Flagship Boutique</h3>
                <p className="font-body-base text-on-surface-variant leading-relaxed">
                  Sri Ram Jewellery<br/>
                  280/212, Vasantha Road<br/>
                  Dharapuram 638656
                </p>
              </div>
              <div>
                <h3 className="font-display-lg text-[28px] text-primary mb-6">Contact</h3>
                <div className="font-body-base text-on-surface-variant space-y-2 flex flex-col">
                  <a href="tel:+918248456747" className="hover:text-primary transition-colors inline-flex items-center min-h-11">+91 8248456747</a>
                  <a href="tel:+919443920946" className="hover:text-primary transition-colors inline-flex items-center min-h-11">+91 9443920946</a>
                </div>
              </div>
              <div>
                <h3 className="font-display-lg text-[28px] text-primary mb-6">Social</h3>
                <a href="https://www.instagram.com/sri_ram_jewellery" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 min-h-11 font-body-base text-on-surface-variant hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                  @sri_ram_jewellery
                </a>
              </div>
              <div className="pt-8 border-t border-sand/30">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Sri+Ram+Jewellery+280%2F212+Vasantha+Road+Dharapuram+638656"
                  target="_blank"
                  rel="noreferrer"
                  className="relative h-48 w-full grayscale hover:grayscale-0 transition-ui duration-700 overflow-hidden group border border-sand/30 block"
                >
                  <img
                    className="w-full h-full object-cover"
                    alt="Map Location"
                    src="/images/world-map.jpg"
                  />
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors"></div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="bg-surface text-primary px-4 py-2 font-label-caps text-xs tracking-widest shadow-sm border border-sand/30">VIEW ON MAP</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default About;
