import { hasPermission } from "@onwei/auth";
import { deriveInStock, formatCurrency, toMinorUnits } from "@onwei/core";
import { prisma } from "@onwei/database";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import { requirePageSession } from "../_lib/requirePageSession";
import { DeleteProductButton } from "../_components/DeleteProductButton";
import { ProductThumb } from "../_components/ProductThumb";
import {
  AdminBadge,
  AdminButton,
  AdminInput,
  AdminPager,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  LinkButton,
  PageHeader,
} from "../_components/ui";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Live",
  ARCHIVED: "Discontinued",
};

const STATUS_TONES = {
  ACTIVE: "success",
  DRAFT: "pending",
  ARCHIVED: "problem",
} as const;

const FILTERS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Live" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Discontinued" },
] as const;

function priceText(prices: { toString(): string }[]): string {
  if (prices.length === 0) return "No price yet";
  const minor = prices.map((p) => toMinorUnits(p as never));
  const low = Math.min(...minor);
  const high = Math.max(...minor);
  return low === high
    ? formatCurrency(low, "INR")
    : `${formatCurrency(low, "INR")} to ${formatCurrency(high, "INR")}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const { permissions } = await requirePageSession();
  const canDelete = hasPermission(permissions, "product:delete");
  const { page: pageParam, status, q } = await searchParams;
  const page = parsePage(pageParam);
  const statusFilter = FILTERS.some((f) => f.value && f.value === status)
    ? (status as "ACTIVE" | "DRAFT" | "ARCHIVED")
    : undefined;
  const query = q?.trim() || undefined;

  const fetched = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      category: { select: { name: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
      variants: {
        select: {
          price: true,
          inventory: {
            select: { quantityOnHand: true, quantityReserved: true },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...pageWindow(page),
  });
  const { rows: products, hasNext } = trimPage(fetched);

  const hrefFor = (next: string) => {
    const params = new URLSearchParams();
    if (next) params.set("status", next);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="Everything you sell. Open a product to edit its details, photos and variants."
        actions={<LinkButton href="/products/new">Add a product</LinkButton>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = f.value === (statusFilter ?? "");
            return (
              <LinkButton
                key={f.value || "all"}
                href={hrefFor(f.value)}
                variant={on ? "primary" : "secondary"}
                className="!px-4 !py-1 text-xs"
              >
                {f.label}
              </LinkButton>
            );
          })}
        </nav>
        <form className="flex items-center gap-2">
          {statusFilter ? (
            <input type="hidden" name="status" value={statusFilter} />
          ) : null}
          <AdminInput
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search by name"
            aria-label="Search products"
            className="!h-9 w-56"
          />
          <AdminButton type="submit" variant="secondary" className="!py-1.5">
            Search
          </AdminButton>
        </form>
      </div>

      {products.length === 0 ? (
        statusFilter || query ? (
          <EmptyState
            title="No products match"
            description="Try a different status or search."
            action={
              <LinkButton href="/products" variant="secondary">
                Clear filters
              </LinkButton>
            }
          />
        ) : (
          <EmptyState
            title="No products yet"
            description="Add your first product to start building the catalog."
            action={<LinkButton href="/products/new">Add a product</LinkButton>}
          />
        )
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Product</AdminTableHeaderCell>
            <AdminTableHeaderCell>Category</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Price</AdminTableHeaderCell>
            <AdminTableHeaderCell>Stock</AdminTableHeaderCell>
            <AdminTableHeaderCell>
              <span className="sr-only">Actions</span>
            </AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {products.map((product) => {
              const inStock = product.variants.some((variant) =>
                deriveInStock(variant.inventory),
              );
              const thumb = product.images[0]?.url;
              return (
                <AdminTableRow key={product.id}>
                  <AdminTableCell>
                    <a
                      href={`/products/${product.id}`}
                      className="flex items-center gap-3 font-medium hover:underline"
                    >
                      <ProductThumb url={thumb} />
                      {product.name}
                    </a>
                  </AdminTableCell>
                  <AdminTableCell>{product.category.name}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge
                      tone={
                        STATUS_TONES[
                          product.status as keyof typeof STATUS_TONES
                        ] ?? "pending"
                      }
                    >
                      {STATUS_LABELS[product.status] ?? product.status}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    {priceText(product.variants.map((v) => v.price))}
                  </AdminTableCell>
                  <AdminTableCell>
                    {product.variants.length === 0
                      ? "No variants yet"
                      : inStock
                        ? "In stock"
                        : "Out of stock"}
                  </AdminTableCell>
                  <AdminTableCell className="flex justify-end gap-2">
                    <LinkButton
                      href={`/products/${product.id}`}
                      variant="secondary"
                      className="!px-3 !py-1 text-xs"
                    >
                      Edit
                    </LinkButton>
                    {canDelete ? (
                      <DeleteProductButton
                        productId={product.id}
                        productName={product.name}
                        compact
                      />
                    ) : null}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      <AdminPager
        pathname="/products"
        page={page}
        hasNext={hasNext}
        params={{
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(query ? { q: query } : {}),
        }}
      />
    </main>
  );
}
