import { listFeaturedProducts } from "@onwei/core";
import { NextResponse } from "next/server";

/** "You'll also love" in the cart drawer: in-stock products, newest first. */
export async function GET(request: Request) {
  const exclude = new Set(
    (new URL(request.url).searchParams.get("exclude") ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 50),
  );
  const products = (await listFeaturedProducts(12))
    .filter((product) => product.inStock && !exclude.has(product.id))
    .slice(0, 6);
  return NextResponse.json(
    { ok: true, products },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
