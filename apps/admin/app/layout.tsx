import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { SignOutButton } from "./_components/SignOutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onwei Admin",
  description: "Internal tools for running the Onwei store.",
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Inventory", href: "/inventory" },
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
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        {staffName ? (
          <div className="flex min-h-screen">
            <nav
              aria-label="Admin"
              className="flex w-56 shrink-0 flex-col justify-between border-r border-neutral-200 bg-white p-4"
            >
              <div>
                <p className="mb-6 px-2 text-lg font-semibold">Onwei Admin</p>
                <ul className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="block rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
                <p className="px-2 text-sm text-neutral-500">
                  Signed in as
                  <br />
                  <span className="text-neutral-900">{staffName}</span>
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
