// Use-case categories for browsing public projects on /explore. The
// publish-details dialog uses this list to populate its category
// picker, and the explore page builds its filter from the same source
// so the two never drift. Server stores the chosen string verbatim
// (with a 60-char cap) and defaults to "Other" for any project that
// hasn't been re-published since the column landed.
export const PROJECT_CATEGORIES = [
  "SaaS",
  "Services",
  "Technology",
  "Real Estate",
  "Landing Page",
  "E-commerce",
  "Portfolio",
  "Blog",
  "Education",
  "Other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
