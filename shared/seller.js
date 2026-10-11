/**
 * Who the shop legally is.
 *
 * One place, because these details appear on the invoice, in the Privacy
 * Policy, in the Help Centre and in the page footer — and a GSTIN or an
 * address that disagrees with itself across a site is worse than one that is
 * missing, because each copy looks authoritative.
 *
 * Confirmed by the client on 11 October 2026.
 */
export const SELLER = {
  /** As registered for GST. */
  name: "SRI RAM JEWELLERY",
  /** A proprietorship, so the proprietor is personally the legal entity. */
  entityType: "Proprietorship",
  proprietor: "Radhakrishnan",
  address: "280/212, Vasantha Road, Dharapuram 638656, Tamil Nadu, India",
  /** 33 is Tamil Nadu; the embedded PAN is AJSPR7785A. */
  gstin: "33AJSPR7785A1ZQ",
  email: "sriramjewellerydpm@gmail.com",
  /** The number the WhatsApp button uses and the one customers are given. */
  phone: "+91 93637 50806",
  whatsapp: "919363750806",
  foundedYear: 1999,
  instagram: "https://www.instagram.com/sri_ram_jewellery",
};

export default SELLER;
