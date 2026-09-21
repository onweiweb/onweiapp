/**
 * Vendor-abstraction interface for product search (docs/ARCHITECTURE.md).
 * No adapter or vendor has been chosen — not listed in docs/OPEN_DECISIONS.md
 * yet either, so flag a vendor choice with the user before implementing one.
 */
export interface ProductSearchIndex {
  indexProduct(productId: string): Promise<void>;
  removeProduct(productId: string): Promise<void>;
  search(query: string): Promise<{ productId: string; score: number }[]>;
}
