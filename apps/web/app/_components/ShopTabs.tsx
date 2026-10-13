"use client";

import { useState } from "react";
import Image from "@/_components/ScaledImage";

// Homepage "shop our gear" (Figma 758:2325 with pickle ball picked, 758:2632
// with yoga mats picked): the heading, two tabs, and a grid that swaps with
// the tab. Each panel is rendered on the server and passed in, so this file
// only holds the picked tab and never pulls catalog code into the browser.
// The picked tab is drawn with the hand-drawn oval on desktop and an
// underline on mobile (761:4880), the other tab is plain.
export interface ShopTab {
  key: string;
  label: string;
  // Mobile spells "pickle ball" as one word.
  mobileLabel?: string;
  panel: React.ReactNode;
}

export function ShopTabs({ tabs }: { tabs: readonly ShopTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);

  return (
    <>
      <section className="flex items-end justify-center bg-onwei-white px-3 pb-0 pt-12 desk:px-14 desk:pb-12 desk:pt-[4.5rem]">
        <div className="flex w-full max-w-[90rem] flex-col items-center gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-8">
          <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-display-md">
            shop our gear
          </p>
          <div role="tablist" className="flex items-start gap-8">
            {tabs.map((tab) => {
              const active = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveKey(tab.key)}
                  className="relative inline-flex flex-col items-center desk:w-[6.25rem]"
                >
                  {active ? (
                    <Image
                      src="/images/shop/pill-outline.svg"
                      alt=""
                      width={122}
                      height={45}
                      aria-hidden
                      className="pointer-events-none absolute left-[-0.9375rem] top-[-0.8006rem] max-desk:hidden"
                    />
                  ) : null}
                  <span
                    className={`relative whitespace-nowrap font-display text-[1.125rem] uppercase text-onwei-blue desk:w-full desk:text-center desk:text-[1.25rem] desk:leading-[1.1] ${
                      active ? "font-medium" : "font-medium desk:font-normal"
                    }`}
                  >
                    <span
                      className={
                        tab.mobileLabel ? "max-desk:hidden" : undefined
                      }
                    >
                      {tab.label}
                    </span>
                    {tab.mobileLabel ? (
                      <span className="desk:hidden">{tab.mobileLabel}</span>
                    ) : null}
                  </span>
                  {active ? (
                    <Image
                      src="/images/shop/underline-mobile.svg"
                      alt=""
                      width={93}
                      height={2}
                      aria-hidden
                      className="pointer-events-none h-[0.1369rem] w-[5.82rem] desk:hidden"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center bg-onwei-white px-3 pb-24 desk:px-14">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            role="tabpanel"
            hidden={tab.key !== activeKey}
            className="w-full max-w-[90rem]"
          >
            {tab.panel}
          </div>
        ))}
      </section>
    </>
  );
}
