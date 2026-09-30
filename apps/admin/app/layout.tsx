import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Raleway } from "next/font/google";
import Image from "next/image";
import { cookies } from "next/headers";
import {
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { AdminNav } from "./_components/AdminNav";
import { SignOutButton } from "./_components/SignOutButton";
import "./globals.css";

// Same font families as apps/web (see apps/web/app/layout.tsx) so admin
// reads as the same product, minus the display-headline scale, which is
// storefront-only. No --font-script (Caveat) here — marketing accent only.
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
    label: "Overview",
    icon: "LayoutDashboard",
    items: [
      { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
      { label: "Site settings", href: "/settings", icon: "Settings" },
    ],
  },
  {
    label: "Catalog",
    icon: "Package",
    items: [
      { label: "Products", href: "/products", icon: "Package" },
      { label: "Categories", href: "/categories", icon: "Tags" },
      { label: "Inventory", href: "/inventory", icon: "Warehouse" },
    ],
  },
  {
    label: "Sales",
    icon: "ShoppingCart",
    items: [
      { label: "Orders", href: "/orders", icon: "ShoppingCart" },
      { label: "Returns", href: "/returns", icon: "Undo2" },
      { label: "Coupons", href: "/coupons", icon: "Ticket" },
    ],
  },
  {
    label: "Marketing & content",
    icon: "Megaphone",
    items: [
      { label: "Content", href: "/content", icon: "FileText" },
      { label: "Reviews", href: "/reviews", icon: "Star" },
      {
        label: "Review placements",
        href: "/reviews/placements",
        icon: "LayoutList",
      },
      { label: "Newsletter", href: "/newsletter", icon: "Mail" },
      { label: "Waitlist", href: "/waitlist", icon: "ListChecks" },
    ],
  },
  {
    label: "People",
    icon: "Users",
    items: [
      { label: "Staff", href: "/staff", icon: "UserCog" },
      { label: "Roles", href: "/roles", icon: "ShieldCheck" },
      { label: "Customers", href: "/customers", icon: "UsersRound" },
    ],
  },
  {
    label: "Compliance",
    icon: "ShieldAlert",
    items: [
      { label: "Audit log", href: "/audit-log", icon: "ScrollText" },
      { label: "Data requests", href: "/dsr", icon: "FileSearch" },
    ],
  },
] as const;

async function getCurrentStaffName(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;
  if (!token || !sessionSecret) return null;

  const session = await verifyStaffSessionToken(token, sessionSecret);
  if (!session) return null;

  const staffUser = await prisma.staffUser.findUnique({
    where: { id: session.staffUserId },
    select: { name: true },
  });
  return staffUser?.name ?? null;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staffName = await getCurrentStaffName();

  return (
    <html
      lang="en"
      className={`${raleway.variable} ${archivo.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-onwei-beige font-grotesk text-onwei-blue">
        {staffName ? (
          <div className="flex min-h-screen">
            <nav
              aria-label="Admin"
              className="flex w-56 shrink-0 flex-col justify-between rounded-r-[30px] bg-onwei-blue p-4 text-onwei-beige"
            >
              <div>
                <div className="mb-6 flex items-center gap-2 px-2">
                  <Image
                    src="/images/footer/logo-circle.svg"
                    alt=""
                    width={28}
                    height={28}
                    aria-hidden
                  />
                  <p className="font-display text-lg font-semibold uppercase">
                    Onwei Admin
                  </p>
                </div>
                <AdminNav groups={NAV_GROUPS} />
              </div>
              <div className="flex flex-col gap-2 border-t border-onwei-beige/30 pt-4">
                <p className="px-2 text-xs text-onwei-beige/80">
                  Signed in as
                  <br />
                  <span className="text-onwei-white">{staffName}</span>
                </p>
                <SignOutButton />
              </div>
            </nav>
            <div className="flex-1 p-8">{children}</div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
