import { prisma } from "../src/client";

// Runs against the same shared Neon dev database as everything else in this
// repo, so every write here is an `upsert` (or find-then-create for
// Warehouse, which has no unique business key) — safe to re-run any number
// of times without erroring or duplicating rows. Only invoke this via
// `prisma db seed` (wired in prisma.config.ts), never `tsx prisma/seed.ts`
// directly — that command is what loads packages/database/.env.

interface VariantSeed {
  sku: string;
  attributes: { size: string; color: string };
  price: number;
  compareAtPrice?: number;
  weightGrams: number;
  quantityOnHand: number;
}

interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  status: "ACTIVE" | "DRAFT";
  imagePath: string;
  variants: VariantSeed[];
}

const PICKLEBALL_PRODUCTS: ProductSeed[] = [
  {
    slug: "pickleball-performance-polo",
    name: "Pickleball Performance Polo",
    description: "Moisture-wicking polo built for long rallies and hot courts.",
    status: "ACTIVE",
    imagePath: "/images/products/pickleball-performance-polo.svg",
    variants: [
      {
        sku: "PBPOLO-M-NAVY",
        attributes: { size: "M", color: "Navy" },
        price: 1999,
        compareAtPrice: 2499,
        weightGrams: 210,
        quantityOnHand: 25,
      },
      {
        sku: "PBPOLO-L-NAVY",
        attributes: { size: "L", color: "Navy" },
        price: 1999,
        compareAtPrice: 2499,
        weightGrams: 220,
        // Deliberately zero — exercises the out-of-stock UI state.
        quantityOnHand: 0,
      },
      {
        sku: "PBPOLO-M-WHITE",
        attributes: { size: "M", color: "White" },
        price: 1999,
        weightGrams: 210,
        quantityOnHand: 18,
      },
    ],
  },
  {
    slug: "pickleball-dink-shorts",
    name: "Pickleball Dink Shorts",
    description:
      "Four-way stretch shorts with a side pocket sized for a spare ball.",
    status: "ACTIVE",
    imagePath: "/images/products/pickleball-dink-shorts.svg",
    variants: [
      {
        sku: "PBSHORT-S-BLACK",
        attributes: { size: "S", color: "Black" },
        price: 1499,
        weightGrams: 180,
        quantityOnHand: 30,
      },
      {
        sku: "PBSHORT-M-BLACK",
        attributes: { size: "M", color: "Black" },
        price: 1499,
        weightGrams: 190,
        quantityOnHand: 22,
      },
    ],
  },
  {
    slug: "pickleball-court-cap",
    name: "Pickleball Court Cap",
    description: "Lightweight cap with a UPF-rated brim.",
    status: "ACTIVE",
    imagePath: "/images/products/pickleball-court-cap.svg",
    variants: [
      {
        sku: "PBCAP-OS-BEIGE",
        attributes: { size: "One Size", color: "Beige" },
        price: 799,
        weightGrams: 90,
        quantityOnHand: 40,
      },
    ],
  },
];

const PILATES_PRODUCTS: ProductSeed[] = [
  {
    slug: "pilates-sculpt-leggings",
    name: "Pilates Sculpt Leggings",
    description: "High-rise leggings with a squat-proof, buttery-soft fabric.",
    status: "ACTIVE",
    imagePath: "/images/products/pilates-sculpt-leggings.svg",
    variants: [
      {
        sku: "PILEGG-S-PURPLE",
        attributes: { size: "S", color: "Purple" },
        price: 2499,
        weightGrams: 230,
        quantityOnHand: 20,
      },
      {
        sku: "PILEGG-M-PURPLE",
        attributes: { size: "M", color: "Purple" },
        price: 2499,
        weightGrams: 240,
        quantityOnHand: 15,
      },
      {
        sku: "PILEGG-L-BLACK",
        attributes: { size: "L", color: "Black" },
        price: 2499,
        weightGrams: 245,
        quantityOnHand: 12,
      },
    ],
  },
  {
    slug: "pilates-studio-tank",
    name: "Pilates Studio Tank",
    description: "A relaxed-fit tank with a built-in shelf bra.",
    status: "ACTIVE",
    imagePath: "/images/products/pilates-studio-tank.svg",
    variants: [
      {
        sku: "PITANK-S-BEIGE",
        attributes: { size: "S", color: "Beige" },
        price: 1299,
        weightGrams: 140,
        quantityOnHand: 28,
      },
      {
        sku: "PITANK-M-BEIGE",
        attributes: { size: "M", color: "Beige" },
        price: 1299,
        weightGrams: 145,
        quantityOnHand: 26,
      },
    ],
  },
  {
    slug: "pilates-wrap-top",
    name: "Pilates Wrap Top",
    description:
      "A wrap-front top that layers over a sports bra for studio-to-street wear.",
    status: "ACTIVE",
    imagePath: "/images/products/pilates-wrap-top.svg",
    variants: [
      {
        sku: "PIWRAP-S-GREEN",
        attributes: { size: "S", color: "Green" },
        price: 1799,
        compareAtPrice: 2199,
        weightGrams: 160,
        quantityOnHand: 16,
      },
      {
        sku: "PIWRAP-M-GREEN",
        attributes: { size: "M", color: "Green" },
        price: 1799,
        compareAtPrice: 2199,
        weightGrams: 165,
        quantityOnHand: 14,
      },
    ],
  },
  {
    // Deliberately DRAFT — exercises storefront hiding. Not asserted on by
    // automated tests, which build their own fixtures; this is for manual QA.
    slug: "pilates-grip-socks-coming-soon",
    name: "Pilates Grip Socks",
    description: "Grip socks with silicone dot soles, coming soon.",
    status: "DRAFT",
    imagePath: "/images/products/pilates-grip-socks.svg",
    variants: [
      {
        sku: "PISOCK-M-BLACK",
        attributes: { size: "M", color: "Black" },
        price: 599,
        weightGrams: 60,
        quantityOnHand: 0,
      },
    ],
  },
];

async function seedCategory(input: {
  name: string;
  slug: string;
  sortOrder: number;
  imageUrl: string;
  products: ProductSeed[];
}) {
  const category = await prisma.category.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
    },
    create: {
      name: input.name,
      slug: input.slug,
      isActive: true,
      sortOrder: input.sortOrder,
      imageUrl: input.imageUrl,
    },
  });

  const warehouse = await getOrCreateMainWarehouse();

  for (const productSeed of input.products) {
    const product = await prisma.product.upsert({
      where: { slug: productSeed.slug },
      update: {
        name: productSeed.name,
        description: productSeed.description,
        status: productSeed.status,
        categoryId: category.id,
      },
      create: {
        name: productSeed.name,
        slug: productSeed.slug,
        description: productSeed.description,
        status: productSeed.status,
        categoryId: category.id,
      },
    });

    await prisma.productImage.upsert({
      where: { id: `${product.id}-primary-image` },
      update: { url: productSeed.imagePath },
      create: {
        id: `${product.id}-primary-image`,
        productId: product.id,
        url: productSeed.imagePath,
        altText: productSeed.name,
        sortOrder: 0,
        isPlaceholder: true,
      },
    });

    for (const variantSeed of productSeed.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: variantSeed.sku },
        update: {
          price: variantSeed.price,
          compareAtPrice: variantSeed.compareAtPrice ?? null,
          weightGrams: variantSeed.weightGrams,
          attributes: variantSeed.attributes,
        },
        create: {
          productId: product.id,
          sku: variantSeed.sku,
          attributes: variantSeed.attributes,
          price: variantSeed.price,
          compareAtPrice: variantSeed.compareAtPrice ?? null,
          weightGrams: variantSeed.weightGrams,
        },
      });

      await prisma.inventory.upsert({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variant.id,
            warehouseId: warehouse.id,
          },
        },
        update: { quantityOnHand: variantSeed.quantityOnHand },
        create: {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          quantityOnHand: variantSeed.quantityOnHand,
          quantityReserved: 0,
        },
      });
    }
  }
}

let mainWarehouseCache: { id: string } | undefined;

async function getOrCreateMainWarehouse() {
  if (mainWarehouseCache) return mainWarehouseCache;

  const existing = await prisma.warehouse.findFirst({
    where: { name: "Onwei Main Warehouse" },
  });
  mainWarehouseCache =
    existing ??
    (await prisma.warehouse.create({
      data: { name: "Onwei Main Warehouse" },
    }));
  return mainWarehouseCache;
}

async function main() {
  await seedCategory({
    name: "Pickleball",
    slug: "pickleball",
    sortOrder: 0,
    imageUrl: "/images/categories/pickleball.svg",
    products: PICKLEBALL_PRODUCTS,
  });

  await seedCategory({
    name: "Pilates",
    slug: "pilates",
    sortOrder: 1,
    imageUrl: "/images/categories/pilates.svg",
    products: PILATES_PRODUCTS,
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
