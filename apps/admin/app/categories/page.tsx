import { prisma } from "@onwei/database";
import {
  AdminBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  LinkButton,
  PageHeader,
} from "../_components/ui";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Categories"
        description="The groups shoppers browse by, such as Pickleball or Pilates."
        actions={<LinkButton href="/categories/new">Add a category</LinkButton>}
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Add your first category to start organizing products."
          action={
            <LinkButton href="/categories/new">Add a category</LinkButton>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Name</AdminTableHeaderCell>
            <AdminTableHeaderCell>Products</AdminTableHeaderCell>
            <AdminTableHeaderCell>Visible on site</AdminTableHeaderCell>
            <AdminTableHeaderCell>
              <span className="sr-only">Actions</span>
            </AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {categories.map((category) => (
              <AdminTableRow key={category.id}>
                <AdminTableCell className="font-medium">
                  {category.name}
                </AdminTableCell>
                <AdminTableCell>{category._count.products}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={category.isActive ? "success" : "pending"}>
                    {category.isActive ? "Visible" : "Hidden"}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell className="text-right">
                  <LinkButton
                    href={`/categories/${category.id}`}
                    variant="secondary"
                    className="!px-3 !py-1 text-xs"
                  >
                    Edit
                  </LinkButton>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
