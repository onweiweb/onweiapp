import { getSiteSetting } from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import { SiteSettingForm } from "../_components/SiteSettingForm";

export default async function SettingsPage() {
  await requirePageSession("settings:view");
  const setting = await getSiteSetting();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Site settings
      </h1>
      <SiteSettingForm
        initialSiteMode={setting.siteMode}
        initialLaunchAt={setting.launchAt.toISOString()}
        initialAllowInternationalPhone={setting.allowInternationalPhone}
        initialInstagramUrl={setting.instagramUrl ?? ""}
        initialLinkedinUrl={setting.linkedinUrl ?? ""}
        initialFacebookUrl={setting.facebookUrl ?? ""}
        initialYoutubeUrl={setting.youtubeUrl ?? ""}
        initialSpotifyUrl={setting.spotifyUrl ?? ""}
      />
    </main>
  );
}
