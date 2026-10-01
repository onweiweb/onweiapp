"use client";

import { useEffect, useRef, useState } from "react";
import Image from "@/_components/ScaledImage";
import Link from "next/link";

// Figma's mobile header (node 761:4767) has no menu affordance at all, no
// hamburger, no drawer state anywhere in the file, just logo + a decorative
// squiggle + account/cart icons. A real mobile visitor still needs a way to
// reach Shop/Pickleball/Pilates/etc., so per explicit approval this makes
// the logo itself the menu trigger, opening a panel that drops down from
// it, an intentional addition, not something copied from a Figma state.
const NAV_LINKS = [
  { label: "Shop All", href: "/collection/all" },
  { label: "Pickleball", href: "/collection/pickleball" },
  { label: "Pilates", href: "/collection/pilates" },
  { label: "our story", href: "/about" },
  { label: "find your wei", href: "#" },
] as const;

export function MobileNav({ inverted = false }: { inverted?: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Escape-to-close, click-outside-to-close, and moving focus into the
  // panel on open, none of this existed before, so a keyboard user had no
  // way to close the menu short of tabbing all the way through it, and a
  // screen reader had no indication this was a menu at all (no role, no
  // focus management).
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="relative flex flex-col items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="block"
      >
        <Image
          src={`/images/header${inverted ? "/inverted" : ""}/logo.svg`}
          alt="Onwei"
          width={72}
          height={34}
          priority
        />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Main menu"
          className={`absolute top-[calc(100%+0.75rem)] z-20 flex w-[15rem] flex-col items-center gap-4 rounded-[1.25rem] px-6 py-6 shadow-lg ${inverted ? "bg-onwei-green" : "bg-onwei-blue"}`}
        >
          <ul className="flex flex-col items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.label} role="none">
                <Link
                  role="menuitem"
                  href={link.href}
                  onClick={close}
                  className={`block whitespace-nowrap py-2 font-grotesk text-label uppercase ${inverted ? "text-onwei-blue" : "text-onwei-beige"}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            role="menuitem"
            href="#"
            onClick={close}
            className={`font-script text-script-md uppercase leading-none ${inverted ? "text-onwei-blue" : "text-onwei-green"}`}
          >
            insiders
          </Link>
        </div>
      ) : null}
    </div>
  );
}
