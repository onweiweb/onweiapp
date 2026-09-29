import type { Metadata } from "next";
import localFont from "next/font/local";
import { Caveat, IBM_Plex_Mono, Raleway } from "next/font/google";
import "./globals.css";

// Figma specs "Author Variable" (display headlines, weights Medium/Semibold/
// Bold), "ABC Monument Grotesk Mono Unlicensed Trial" (nav/body/labels,
// weights Regular/Medium/Bold — a MONOSPACE grotesk, not a proportional one)
// and "Summer Mood" (handwritten annotations). Author is the real font now
// (self-hosted below, free for commercial use via Fontshare's ITF Free Font
// License — confirmed, not a Google Fonts substitute). Grotesk Mono and
// Summer Mood are still paid fonts the client hasn't purchased yet, so
// those two stay on their closest free substitutes: IBM Plex Mono (a true
// monospace grotesk, unlike the previously-used Space Grotesk which isn't
// monospace at all) and Caveat. Raleway is a real match for the existing
// --text-cta token (confirmed against Figma's "CTA 1" style).
const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

// Self-hosted from Fontshare (api.fontshare.com/v2/css?f[]=author@400,500,600,700)
// — weights match the CSS comment's "never left at default" Medium/
// Semibold/Bold instances, plus Regular for anything not yet audited.
const author = localFont({
  src: [
    { path: "../public/fonts/author/Author-Regular.woff2", weight: "400" },
    { path: "../public/fonts/author/Author-Medium.woff2", weight: "500" },
    { path: "../public/fonts/author/Author-SemiBold.woff2", weight: "600" },
    { path: "../public/fonts/author/Author-Bold.woff2", weight: "700" },
  ],
  variable: "--font-author",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Onwei",
  description: "Pickleball and Pilates apparel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} ${author.variable} ${ibmPlexMono.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
