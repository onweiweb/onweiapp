import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Raleway } from "next/font/google";
import Image from "next/image";
import { AdminNav } from "./_components/AdminNav";
import { SignOutButton } from "./_components/SignOutButton";
import { AdminFeedbackProvider } from "./_components/ui";
import { getCurrentStaff } from "./_lib/session";
import "./globals.css";

// Same font families as apps/web (see apps/web/app/layout.tsx) so admin
// reads as the same product, minus the display-headline scale, which is
// storefront-only. No --font-script (Caveat) here, marketing accent only.
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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Onwei Admin",
  description: "Internal tools for running the Onwei store.",
};

const NAV_GROUPS = [
  {
    items: [{ label: "Dashboard", href: "/", icon: "LayoutDashboard" }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: "Package" },
      { label: "Categories", href: "/categories", icon: "Tags" },
      { label: "Inventory", href: "/inventory", icon: "Warehouse" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/orders", icon: "ShoppingCart" },
      { label: "Returns", href: "/returns", icon: "Undo2" },
      { label: "Coupons", href: "/coupons", icon: "Ticket" },
      { label: "Customers", href: "/customers", icon: "UsersRound" },
    ],
  },
  {
    label: "Audience",
    items: [
      { label: "Waitlist", href: "/waitlist", icon: "ListChecks" },
      { label: "Newsletter", href: "/newsletter", icon: "Mail" },
      { label: "Visitors", href: "/analytics", icon: "BarChart3" },
    ],
  },
  {
    label: "Website content",
    items: [
      { label: "Blog posts", href: "/content/blog", icon: "Newspaper" },
      {
        label: "Homepage sections",
        href: "/content/homepage",
        icon: "FileText",
      },
      { label: "Legal pages", href: "/content/legal", icon: "Scale" },
      { label: "Reviews", href: "/reviews", icon: "Star" },
      {
        label: "Review placements",
        href: "/reviews/placements",
        icon: "LayoutList",
      },
    ],
  },
  {
    label: "Team and settings",
    items: [
      { label: "Staff", href: "/staff", icon: "UserCog" },
      { label: "Roles", href: "/roles", icon: "ShieldCheck" },
      { label: "Site settings", href: "/settings", icon: "Settings" },
      { label: "Audit log", href: "/audit-log", icon: "ScrollText" },
      { label: "Data requests", href: "/dsr", icon: "FileSearch" },
    ],
  },
] as const;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();
  const staffName = staff?.name ?? null;

  return (
    <html
      lang="en"
      className={`${raleway.variable} ${archivo.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-onwei-beige font-grotesk text-onwei-blue">
        <AdminFeedbackProvider>
          {staffName ? (
            <div className="flex min-h-screen">
              <nav
                aria-label="Admin"
                className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col justify-between gap-3 self-start bg-onwei-blue p-3 text-onwei-beige lg:flex"
              >
                <div className="admin-nav-scroll -mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
                  <div className="mb-5 flex items-center gap-2 px-3 pt-1">
                    <Image
                      src="/images/footer/logo-circle.svg"
                      alt=""
                      width={24}
                      height={24}
                      aria-hidden
                    />
                    <p className="font-display text-base font-semibold uppercase">
                      Onwei Admin
                    </p>
                  </div>
                  <AdminNav groups={NAV_GROUPS} />
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-onwei-beige/20 pt-3">
                  <p className="min-w-0 truncate px-1 text-xs text-onwei-beige/80">
                    {staffName}
                  </p>
                  <SignOutButton />
                </div>
              </nav>
              <div className="min-w-0 flex-1">
                <details className="border-b border-onwei-blue/10 bg-onwei-blue text-onwei-beige lg:hidden">
                  <summary className="cursor-pointer px-4 py-3 font-display text-sm font-semibold uppercase">
                    Onwei Admin menu
                  </summary>
                  <div className="max-h-[70vh] overflow-y-auto p-3">
                    <AdminNav groups={NAV_GROUPS} />
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-onwei-beige/20 pt-3">
                      <p className="truncate text-xs">{staffName}</p>
                      <SignOutButton />
                    </div>
                  </div>
                </details>
                <div className="mx-auto w-full max-w-[96rem] px-4 py-5 lg:px-8 lg:py-6">
                  {children}
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </AdminFeedbackProvider>
      </body>
    </html>
  );
}
