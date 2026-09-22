import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { ManualReviewForm } from "../../_components/ManualReviewForm";

export default async function NewReviewPage() {
  await requirePageSession("review:createManual");

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Add review
      </h1>
      <ManualReviewForm products={products} />
    </main>
  );
}
