import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Raleway } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
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

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Orders", href: "/orders" },
  { label: "Returns", href: "/returns" },
  { label: "Coupons", href: "/coupons" },
  { label: "Reviews", href: "/reviews" },
  { label: "Review placements", href: "/reviews/placements" },
  { label: "Content", href: "/content" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Inventory", href: "/inventory" },
  { label: "Staff", href: "/staff" },
  { label: "Roles", href: "/roles" },
  { label: "Customers", href: "/customers" },
  { label: "Audit Log", href: "/audit-log" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Data requests", href: "/dsr" },
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
                <ul className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="block rounded-[30px] px-3 py-1.5 text-sm uppercase tracking-wide hover:bg-onwei-green hover:text-onwei-blue"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
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
