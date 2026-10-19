import { notFound } from "next/navigation";
import { hasPermission } from "@onwei/auth";
import { prisma } from "@onwei/database";
import { formatCurrency, resolveSurfaceLimit, toMinorUnits } from "@onwei/core";
import { requirePageSession } from "../../_lib/requirePageSession";
import { DeleteProductButton } from "../../_components/DeleteProductButton";
import { ProductForm } from "../../_components/ProductForm";
import { VariantManager } from "../../_components/VariantManager";
import { ImageManager } from "../../_components/ImageManager";
import { ReviewPlacementManager } from "../../_components/ReviewPlacementManager";
import { AdminBadge, AdminTabLinks, PageHeader } from "../../_components/ui";

const TABS = [
  { id: "details", label: "Details" },
  { id: "photos", label: "Photos" },
  { id: "variants", label: "Variants" },
  { id: "reviews", label: "Featured reviews" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_HELP: Record<TabId, string> = {
  details: "The text and settings shoppers see on the product page.",
  photos: "Photos shown on the product page. The first one is the main photo.",
  variants:
    "Each size and color you sell, with its own code and price. A product can't be bought until it has at least one.",
  reviews: "Pick which approved reviews show on this product's page.",
};

const STATUS: Record<
  string,
  { label: string; tone: "success" | "pending" | "problem" }
> = {
  ACTIVE: { label: "Live", tone: "success" },
  DRAFT: { label: "Draft", tone: "pending" },
  ARCHIVED: { label: "Discontinued", tone: "problem" },
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { permissions } = await requirePageSession();
  const { id } = await params;
  const { tab } = await searchParams;
  const active: TabId = TABS.some((t) => t.id === tab)
    ? (tab as TabId)
    : "details";

  const product = await prisma.product.findUnique({ where: { id } });
  // A deleted product is gone from the admin too.
  if (!product || product.deletedAt) notFound();

  const status = STATUS[product.status];

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title={product.name}
        back={{ href: "/products", label: "Products" }}
        actions={
          <>
            {status ? (
              <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
            ) : null}
            {hasPermission(permissions, "product:delete") ? (
              <DeleteProductButton
                productId={product.id}
                productName={product.name}
                redirectTo="/products"
              />
            ) : null}
          </>
        }
      />
      <AdminTabLinks basePath={`/products/${id}`} tabs={TABS} active={active} />
      <p className="-mt-2 max-w-3xl text-sm text-onwei-blue/70">
        {TAB_HELP[active]}
      </p>
      <TabBody tab={active} product={product} />
    </main>
  );
}

async function TabBody({
  tab,
  product,
}: {
  tab: TabId;
  product: NonNullable<Awaited<ReturnType<typeof prisma.product.findUnique>>>;
}) {
  const id = product.id;

  if (tab === "details") {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    });
    return (
      <ProductForm
        mode="edit"
        productId={id}
        categories={categories}
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          description: product.description ?? "",
          status: product.status,
          specs: Array.isArray(product.specs)
            ? (product.specs as { label: string; value: string }[])
            : [],
          whoThisIsFor: product.whoThisIsFor ?? "",
          careInstructions: product.careInstructions ?? "",
          powerRating: product.powerRating?.toString() ?? "",
          spinRating: product.spinRating?.toString() ?? "",
          controlRating: product.controlRating?.toString() ?? "",
          metaTitle: product.metaTitle ?? "",
          metaDescription: product.metaDescription ?? "",
        }}
      />
    );
  }

  if (tab === "photos") {
    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });
    return <ImageManager productId={id} images={images} />;
  }

  if (tab === "variants") {
    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
    });
    return (
      <VariantManager
        productId={id}
        variants={variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          attributes: variant.attributes as Record<string, string>,
          priceFormatted: formatCurrency(toMinorUnits(variant.price), "INR"),
          status: variant.status,
        }))}
      />
    );
  }

  const [approvedReviews, placements, reviewLimit] = await Promise.all([
    prisma.review.findMany({
      where: { targetType: "PRODUCT", productId: id, isApproved: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.reviewPlacement.findMany({
      where: { surface: "PRODUCT_WALL", productId: id },
      include: { review: true },
      orderBy: { sortOrder: "asc" },
    }),
    resolveSurfaceLimit("PRODUCT_WALL", id),
  ]);
  const featuredReviewIds = new Set(placements.map((p) => p.reviewId));

  return (
    <ReviewPlacementManager
      surface="PRODUCT_WALL"
      productId={id}
      placements={placements.map((p) => ({
        placementId: p.id,
        reviewId: p.reviewId,
        rating: p.review.rating,
        title: p.review.title,
        body: p.review.body,
        authorDisplay: p.review.authorDisplay,
      }))}
      candidates={approvedReviews
        .filter((review) => !featuredReviewIds.has(review.id))
        .map((review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          authorDisplay: review.authorDisplay,
        }))}
      limit={reviewLimit}
    />
  );
}
