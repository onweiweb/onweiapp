import type { Metadata } from "next";
import { getSiteSetting, listActiveInsiderUpdates } from "@onwei/core";
import { InsiderUpdates } from "@/_components/InsiderUpdates";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { InsidersJoinSection } from "@/_components/InsidersJoinSection";

export const metadata: Metadata = {
  title: "Join Onwei Insiders",
  description:
    "Sign up as an Onwei Insider for a personal, lifetime discount code, first picks and event access.",
};

export const revalidate = 60;

// "Find your wei" after launch (owner, 2026-11-16). No Figma frame of its own:
// the site header and footer around the existing "join onwei insiders"
// section from the waitlist page, approved as the basic layout. While the
// site is in waitlist mode, proxy.ts sends visitors to /ontheway instead.
export default async function InsidersPage() {
  const [{ instagramUrl }, updates] = await Promise.all([
    getSiteSetting(),
    listActiveInsiderUpdates(),
  ]);
  return (
    <main className="flex flex-col items-center bg-onwei-beige text-onwei-blue">
      <SiteHeader />
      <InsidersJoinSection instagramUrl={instagramUrl} place="insiders" />
      <InsiderUpdates updates={updates} />
      <div className="w-full">
        <SiteFooter />
      </div>
    </main>
  );
}
