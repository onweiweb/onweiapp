import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onwei Admin",
  description: "Internal tools for running the Onwei store.",
};

const NAV_ITEMS = [
  "Dashboard",
  "Products",
  "Orders",
  "Coupons",
  "Reviews",
  "Settings",
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav aria-label="Admin">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
