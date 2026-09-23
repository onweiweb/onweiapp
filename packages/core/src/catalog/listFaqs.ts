import { prisma } from "@onwei/database";
import type { FaqItem } from "./types";

/** Active FAQs: general (productId null) plus ones scoped to this product. */
export async function listFaqs(productId?: string): Promise<FaqItem[]> {
  const faqs = await prisma.faq.findMany({
    where: {
      isActive: true,
      ...(productId
        ? { OR: [{ productId }, { productId: null }] }
        : { productId: null }),
    },
    orderBy: { sortOrder: "asc" },
  });

  return faqs.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
  }));
}
