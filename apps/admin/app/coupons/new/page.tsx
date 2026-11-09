import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { CouponBuilder, EMPTY_DRAFT } from "../../_components/CouponBuilder";
import { PageHeader } from "../../_components/ui";

export default async function NewCouponPage() {
  await requirePageSession("coupon:create");
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/coupons", label: "Coupons" }}
        title="New coupon"
        description="Answer each question, check the preview, then create it."
      />
      <CouponBuilder
        initial={EMPTY_DRAFT}
        locked={false}
        categories={categories}
        products={products}
      />
    </main>
  );
}
