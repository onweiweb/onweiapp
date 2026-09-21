import type { Metadata } from "next";
import { Archivo, Caveat, Raleway, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Figma specs "Author Variable" (display headlines), "ABC Monument Grotesk
// Mono Unlicensed Trial" (nav/body/labels) and "Summer Mood" (handwritten
// annotations). None of the three are Google Fonts and Figma does not export
// the underlying font binaries, so they're approximated with the closest
// Google Fonts available: Archivo, Space Grotesk and Caveat respectively.
// Raleway is a real match for the existing --text-cta token.
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
      className={`${raleway.variable} ${archivo.variable} ${spaceGrotesk.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
