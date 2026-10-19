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
import { listInventory } from "@onwei/core";
import { InventoryAdjustRow } from "../_components/InventoryAdjustRow";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ lowStockOnly?: string }>;
}) {
  const { lowStockOnly } = await searchParams;
  const rows = await listInventory({ lowStockOnly: lowStockOnly === "true" });

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title={<>Inventory{lowStockOnly === "true" ? ", running low" : ""}</>}
        description="Stock on hand for every variant. Adjust counts when stock arrives or goes missing."
      />

      <div className="flex gap-2">
        <LinkButton
          href="/inventory"
          variant={lowStockOnly === "true" ? "secondary" : "primary"}
          className="!px-4 !py-1 text-xs"
        >
          All stock
        </LinkButton>
        <LinkButton
          href="/inventory?lowStockOnly=true"
          variant={lowStockOnly === "true" ? "primary" : "secondary"}
          className="!px-4 !py-1 text-xs"
        >
          Running low
        </LinkButton>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            lowStockOnly === "true"
              ? "Nothing is running low right now"
              : "No stock records yet"
          }
          description={
            lowStockOnly === "true"
              ? undefined
              : "Add a product with a variant first."
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Product</AdminTableHeaderCell>
            <AdminTableHeaderCell>SKU</AdminTableHeaderCell>
            <AdminTableHeaderCell>Warehouse</AdminTableHeaderCell>
            <AdminTableHeaderCell>On hand</AdminTableHeaderCell>
            <AdminTableHeaderCell>Reserved</AdminTableHeaderCell>
            <AdminTableHeaderCell>Adjust</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {rows.map((row) => {
              const isLow = row.quantityOnHand <= row.reorderThreshold;
              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell className="font-medium">
                    {row.productVariant.product.name}
                  </AdminTableCell>
                  <AdminTableCell className="font-mono text-xs">
                    {row.productVariant.sku}
                  </AdminTableCell>
                  <AdminTableCell>{row.warehouse.name}</AdminTableCell>
                  <AdminTableCell>
                    {row.quantityOnHand}
                    {isLow ? (
                      <span className="ml-2">
                        <AdminBadge tone="problem">Running low</AdminBadge>
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>{row.quantityReserved}</AdminTableCell>
                  <AdminTableCell>
                    <InventoryAdjustRow
                      productVariantId={row.productVariantId}
                      warehouseId={row.warehouseId}
                    />
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
