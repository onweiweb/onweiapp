"use client";

import { useState } from "react";

export interface AdminTabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function AdminTabs({
  tabs,
  defaultActive,
}: {
  tabs: AdminTabItem[];
  defaultActive?: string;
}) {
  const [active, setActive] = useState(
    defaultActive && tabs.some((tab) => tab.id === defaultActive)
      ? defaultActive
      : (tabs[0]?.id ?? ""),
  );
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`rounded-[30px] px-4 py-1.5 font-cta text-sm uppercase tracking-wide transition-colors ${
                isActive
                  ? "bg-onwei-blue text-onwei-beige"
                  : "border border-onwei-blue/30 bg-transparent text-onwei-blue/70 hover:border-onwei-blue"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}
