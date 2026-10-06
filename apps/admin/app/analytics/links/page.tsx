import Link from "next/link";
import { UTM_CHANNELS } from "@onwei/core";
import { requirePageSession } from "../../_lib/requirePageSession";
import { UtmLinkBuilder } from "../../_components/UtmLinkBuilder";

const PAGES = [
  { value: "/ontheway", label: "Waitlist page" },
  { value: "/", label: "Homepage" },
  { value: "/collection/all", label: "Shop all" },
  { value: "/about", label: "About page" },
] as const;

export default async function UtmLinksPage() {
  await requirePageSession("waitlist:view");

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href="/analytics" className="text-sm underline">
          Back to visitors and engagement
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold uppercase">
          Make a tracked link
        </h1>
        <p className="mt-1 max-w-xl text-sm text-onwei-blue/70">
          Use a tracked link everywhere you share the site, such as your
          Instagram bio, stories, LinkedIn or WhatsApp. Then the reports show
          exactly which one brought people in and how many signed up.
        </p>
      </div>
      <UtmLinkBuilder
        channels={UTM_CHANNELS.map(({ id, label }) => ({ id, label }))}
        pages={PAGES}
      />
    </main>
  );
}
