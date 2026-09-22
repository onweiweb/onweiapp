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
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        Inventory{lowStockOnly === "true" ? " — running low" : ""}
      </h1>

      {rows.length === 0 ? (
        <p className="text-neutral-600">
          {lowStockOnly === "true"
            ? "Nothing is running low right now."
            : "No stock records yet — add a product with a variant first."}
        </p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Warehouse</th>
              <th className="px-3 py-2 font-medium">On hand</th>
              <th className="px-3 py-2 font-medium">Reserved</th>
              <th className="px-3 py-2 font-medium">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isLow = row.quantityOnHand <= row.reorderThreshold;
              return (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2">
                    {row.productVariant.product.name}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {row.productVariant.sku}
                  </td>
                  <td className="px-3 py-2">{row.warehouse.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={isLow ? "font-semibold text-amber-700" : ""}
                    >
                      {row.quantityOnHand}
                    </span>
                    {isLow ? (
                      <span className="ml-1 text-xs text-amber-700">
                        (running low)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.quantityReserved}</td>
                  <td className="px-3 py-2">
                    <InventoryAdjustRow
                      productVariantId={row.productVariantId}
                      warehouseId={row.warehouseId}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
