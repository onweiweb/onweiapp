"use client";

import Link from "next/link";
import { motion } from "motion/react";

// next/link with Motion's gesture props (whileHover/whileTap) available —
// a plain `motion.a` can't route client-side, and Link itself isn't a
// motion component, so this is Motion's documented way to combine the two.
// A separate "use client" file (not inlined) because it gets imported into
// Server Component pages (about/page.tsx) that can't themselves use
// motion/react's hooks.
export const HoverLink = motion.create(Link);
