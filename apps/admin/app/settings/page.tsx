import { PageHeader } from "../_components/ui";
import { getSiteSetting } from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import { SiteSettingForm } from "../_components/SiteSettingForm";

export default async function SettingsPage() {
  await requirePageSession("settings:view");
  const setting = await getSiteSetting();

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Site settings"
        description="Switch the storefront between waitlist and live, and set the launch date."
      />
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
      />
    </main>
  );
}
