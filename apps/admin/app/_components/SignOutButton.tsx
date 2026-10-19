"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="shrink-0 rounded-lg border border-onwei-beige/40 px-2.5 py-1 text-xs uppercase tracking-wide text-onwei-beige hover:bg-onwei-green hover:text-onwei-blue"
    >
      Sign out
    </button>
  );
}
