/**
 * The site's design tokens, as literal hex, for email.
 *
 * Copied deliberately rather than imported from tailwind.config.js: that file
 * is a build-time config full of values email cannot use, and a mail client
 * resolves no CSS variables — every colour has to arrive as a literal. These
 * are the exact values from tailwind.config.js; if the site's palette moves,
 * move these with it.
 */
export const C = {
  page: "#fff8f2", // surface / background — the cream
  card: "#ffffff", // surface-container-lowest
  panel: "#f7edde", // surface-container — the inset fill behind the code
  ink: "#1f1b12", // on-surface
  muted: "#50443d", // on-surface-variant
  faint: "#82746c", // outline — footer and fine print
  rule: "#d4c3b9", // outline-variant / outline-gold — hairlines
  brand: "#704c31", // primary — the CTA
  onBrand: "#ffffff", // on-primary
  gold: "#d4af37", // gold — the accent rule framing the card
  sand: "#c8a684", // sand
  // Dark mode: the cream would otherwise be force-inverted into something
  // muddy by clients that do their own inversion.
  darkPage: "#17130d",
  darkCard: "#211b14",
  darkPanel: "#2b241b",
  darkInk: "#f4ece1",
  darkMuted: "#cbbfae",
};

/**
 * Mail clients load no webfonts, so EB Garamond and Montserrat are not
 * available. Georgia is the closest widely-installed face to EB Garamond.
 */
export const F = {
  display: "Georgia, 'Times New Roman', serif",
  body: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SF Mono', Menlo, Consolas, 'Courier New', monospace",
};
