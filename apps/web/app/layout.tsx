import type { Metadata } from "next";
import { Archivo, Caveat, IBM_Plex_Mono, Raleway } from "next/font/google";
import "./globals.css";

// Figma specs "Author Variable" (display headlines, weights Medium/Semibold/
// Bold), "ABC Monument Grotesk Mono Unlicensed Trial" (nav/body/labels,
// weights Regular/Medium/Bold — a MONOSPACE grotesk, not a proportional one)
// and "Summer Mood" (handwritten annotations). None of the three are Google
// Fonts and Figma does not export the underlying font binaries. Closest
// Google Fonts substitutes: Archivo (a variable family whose heavier cuts
// share Author's blocky, minimal-aperture character — apply font-bold/
// font-semibold/font-medium per instance, never left at default weight),
// IBM Plex Mono (a true monospace grotesk, unlike the previously-used Space
// Grotesk which isn't monospace at all) and Caveat. Raleway is a real match
// for the existing --text-cta token (confirmed against Figma's "CTA 1" style).
const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
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
      className={`${raleway.variable} ${archivo.variable} ${ibmPlexMono.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
