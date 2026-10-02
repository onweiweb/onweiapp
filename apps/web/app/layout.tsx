import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Raleway, Space_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "../lib/seo/siteUrl";
import { JsonLd } from "../lib/seo/jsonLd";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "../lib/seo/structuredData";
import "./globals.css";

// Figma specs "Author Variable" (display headlines, weights Medium/Semibold/
// Bold) and "Summer Mood" (handwritten annotations), both self-hosted
// (Author via Fontshare's ITF Free Font License; Summer Mood is licensed
// by the client for production use). Body/nav/labels use Space Mono (see below).
// Raleway is a real match for the existing --text-cta token (confirmed
// against Figma's "CTA 1" style) and stays on Google Fonts.
const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

// Self-hosted from Fontshare (api.fontshare.com/v2/css?f[]=author@400,500,600,700)
//, weights match the CSS comment's "never left at default" Medium/
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

// Nav/body/labels font. The designer approved Space Mono (SIL OFL, free
// for production) in place of ABC Monument Grotesk Mono. It only ships
// Regular and Bold, so any Medium (500) text renders as Regular.
const groteskMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Self-hosted from the client's licensed copy (Fonts/SummerMood.otf). Same .otf-to-.woff2
// conversion as groteskMono, for the same payload-size reason; regenerate
// from the untracked root Fonts/SummerMood.otf if the source ever changes.
const summerMood = localFont({
  src: "../public/fonts/summer-mood/SummerMood.woff2",
  variable: "--font-caveat",
  display: "swap",
});

// metadataBase lets every route below use a relative path for URL-based
// metadata fields (openGraph.images, alternates.canonical, etc., see
// Phase 1's generateMetadata additions) instead of each one having to build
// an absolute URL by hand. The title template means a route's own
// `metadata.title` (or generateMetadata's) composes as "X | Onwei" instead
// of silently overriding this default outright.
// viewport-fit=cover lets content reach the notch/home-bar area; globals.css
// pads the body with env(safe-area-inset-*) so nothing sits under them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Onwei", template: "%s | Onwei" },
  description: "Sports and Fitness accessories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} ${author.variable} ${groteskMono.variable} ${summerMood.variable}`}
    >
      <body>
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebSiteJsonLd()} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
