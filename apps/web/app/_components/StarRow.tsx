import Image from "next/image";

// Extracted from the Homepage (was page-local) — reused anywhere a review
// card renders a rating (Homepage, ReviewWall on PDP/Collection).
export function StarRow({
  count,
  size = 18,
  tone = "light",
}: {
  count: number;
  size?: number;
  // "light" (white stars) reads on the colored/photo review-card
  // backgrounds this was built for. The PDP rating row sits on the white
  // info panel instead, where white-on-white is invisible — pass "dark".
  tone?: "light" | "dark";
}) {
  return (
    <div className="flex items-start gap-0.5">
      {Array.from({ length: count }).map((_, index) => (
        <Image
          key={index}
          src={
            tone === "dark"
              ? "/images/shared/star-full-dark.svg"
              : "/images/shared/star-full.svg"
          }
          alt=""
          width={size}
          height={size}
          aria-hidden
        />
      ))}
    </div>
  );
}
