import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { ValuePropsEditor } from "../_components/ValuePropsEditor";
import { InstagramPhotosEditor } from "../_components/InstagramPhotosEditor";
import { MarqueeItemsEditor } from "../_components/MarqueeItemsEditor";

export default async function ContentPage() {
  await requirePageSession("content:manage");

  const [valueProps, instagramPhotos, marqueeItems] = await Promise.all([
    prisma.valueProp.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.instagramPhoto.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.marqueeItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const marqueeByPlacement = {
    HOME_HERO: marqueeItems.filter((item) => item.placement === "HOME_HERO"),
    HOME_SHOWCASE: marqueeItems.filter(
      (item) => item.placement === "HOME_SHOWCASE",
    ),
    PDP: marqueeItems.filter((item) => item.placement === "PDP"),
  } as const;

  return (
    <main className="flex flex-col gap-10">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Marketing content
      </h1>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Value props</h2>
          <p className="text-sm text-onwei-blue/70">
            The three cards shown on the homepage and every product page.
          </p>
        </div>
        <ValuePropsEditor items={valueProps} />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Instagram photos</h2>
          <p className="text-sm text-onwei-blue/70">
            The photo strip shown on the homepage and every product page.
          </p>
        </div>
        <InstagramPhotosEditor items={instagramPhotos} />
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold">Marquee tickers</h2>
          <p className="text-sm text-onwei-blue/70">
            The scrolling text bars — homepage has two, each product page has
            its own.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase">Homepage hero</h3>
          <MarqueeItemsEditor
            placement="HOME_HERO"
            items={marqueeByPlacement.HOME_HERO}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase">Homepage showcase</h3>
          <MarqueeItemsEditor
            placement="HOME_SHOWCASE"
            items={marqueeByPlacement.HOME_SHOWCASE}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase">Product page</h3>
          <MarqueeItemsEditor placement="PDP" items={marqueeByPlacement.PDP} />
        </div>
      </div>
    </main>
  );
}
