// One nav for every page, desktop and mobile (owner, 2026-11-24): the
// Homepage links (Figma 758:2246) everywhere. "find your wei" is off the nav
// for now (client feedback 2026-11-16), "insiders" stays as a plain link.
export const NAV_LINKS = [
  { label: "Shop All", href: "/collection/all" },
  { label: "Pickleball", href: "/collection/pickleball" },
  { label: "Pilates", href: "/collection/pilates" },
  { label: "our story", href: "/about" },
  { label: "insiders", href: "/insiders" },
] as const;
