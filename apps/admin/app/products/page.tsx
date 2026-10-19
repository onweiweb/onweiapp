import { deriveInStock } from "@onwei/core";
import { prisma } from "@onwei/database";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import {
  AdminBadge,
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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const fetched = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      category: { select: { name: true } },
      variants: {
        select: {
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

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="Everything you sell. Open a product to edit its details, variants and images."
        actions={<LinkButton href="/products/new">Add a product</LinkButton>}
      />

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start building the catalog."
          action={<LinkButton href="/products/new">Add a product</LinkButton>}
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Name</AdminTableHeaderCell>
            <AdminTableHeaderCell>Category</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
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
              return (
                <AdminTableRow key={product.id}>
                  <AdminTableCell className="font-medium">
                    {product.name}
                  </AdminTableCell>
                  <AdminTableCell>{product.category.name}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge
                      tone={
                        product.status === "ACTIVE"
                          ? "success"
                          : product.status === "DRAFT"
                            ? "pending"
                            : "problem"
                      }
                    >
                      {STATUS_LABELS[product.status] ?? product.status}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    {product.variants.length === 0
                      ? "No variants yet"
                      : inStock
                        ? "In stock"
                        : "Out of stock"}
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    <LinkButton
                      href={`/products/${product.id}`}
                      variant="secondary"
                      className="!px-3 !py-1 text-xs"
                    >
                      Edit
                    </LinkButton>
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
        params={{}}
      />
    </main>
  );
}
