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
      className="rounded-[30px] border border-onwei-beige/40 px-3 py-1.5 text-sm uppercase tracking-wide text-onwei-beige hover:bg-onwei-green hover:text-onwei-blue"
    >
      Sign out
    </button>
  );
}
