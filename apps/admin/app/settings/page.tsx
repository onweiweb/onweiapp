import { AdminTabLinks, PageHeader } from "../_components/ui";
import { getSiteSetting, getStoreSettings } from "@onwei/core";
import { hasPermission } from "@onwei/auth";
import { StoreSettingsForm } from "../_components/StoreSettingsForm";
import { requirePageSession } from "../_lib/requirePageSession";
import { SiteSettingForm } from "../_components/SiteSettingForm";

const TABS = [
  { id: "site", label: "Site" },
  { id: "shop", label: "Delivery, payment and returns" },
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const staff = await requirePageSession("settings:view");
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "shop" ? "shop" : "site";

  if (tab === "shop") {
    const store = await getStoreSettings();
    const rupees = (paise: number) => paise / 100;
    return (
      <main className="flex flex-col gap-6">
        <PageHeader
          title="Site settings"
          description="Delivery fee, cash on delivery and return rules for the shop."
        />
        <AdminTabLinks basePath="/settings" tabs={TABS} active={tab} />
        <StoreSettingsForm
          canManage={hasPermission(staff.permissions, "settings:manage")}
          initial={{
            ...store,
            freeShippingThreshold: rupees(store.freeShippingThreshold),
            deliveryFee: rupees(store.deliveryFee),
            codFee: rupees(store.codFee),
            codMinOrder:
              store.codMinOrder === null ? null : rupees(store.codMinOrder),
            codMaxOrder:
              store.codMaxOrder === null ? null : rupees(store.codMaxOrder),
          }}
        />
      </main>
    );
  }

  const setting = await getSiteSetting();

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Site settings"
        description="Switch the storefront between waitlist and live, and set the launch date."
      />
      <AdminTabLinks basePath="/settings" tabs={TABS} active={tab} />
      <SiteSettingForm
        initialSiteMode={setting.siteMode}
        initialLaunchAt={setting.launchAt.toISOString()}
        initialShowCountdown={setting.showCountdown}
        initialAllowInternationalPhone={setting.allowInternationalPhone}
        initialShowBlogOnWaitlist={setting.showBlogOnWaitlist}
        initialInstagramUrl={setting.instagramUrl ?? ""}
        initialLinkedinUrl={setting.linkedinUrl ?? ""}
        initialFacebookUrl={setting.facebookUrl ?? ""}
        initialYoutubeUrl={setting.youtubeUrl ?? ""}
        initialSpotifyUrl={setting.spotifyUrl ?? ""}
        initialContactAddress={setting.contactAddress ?? ""}
        initialContactPhone={setting.contactPhone ?? ""}
        initialContactEmail={setting.contactEmail ?? ""}
      />
    </main>
  );
}
