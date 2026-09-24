import bcrypt from "bcryptjs";
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
  variants: VariantSeed[];
  specs?: { label: string; value: string }[];
  whoThisIsFor?: string;
  careInstructions?: string;
  powerRating?: number;
  spinRating?: number;
  controlRating?: number;
  highlightTags?: string[];
}

interface ReviewSeed {
  productSlug?: string;
  rating: number;
  title: string | null;
  body: string;
  authorDisplay: string;
}

interface FaqSeed {
  productSlug?: string;
  question: string;
  answer: string;
  sortOrder: number;
}

// Figma's own Homepage (node 758:2329, "Frame 31" / the "shop our gear"
// section) reuses one placeholder product photo across every card, even
// though the cards are conceptually different products — there is no
// separate placeholder photo per product in the file. This mirrors that:
// one shared, real Figma-exported placeholder gallery for every seeded
// product, rather than inventing distinct flat-color mocks per SKU. Four
// images (main + 3 thumbnails) so the PDP's gallery/thumbnail rail (Figma
// frame "PDP_draft 2", node 759:3026 "Img") has something to render —
// exported straight from that node's own main/thumbnail children
// (759:3031, 759:3028-3030).
const PLACEHOLDER_IMAGE_SET = [
  {
    suffix: "primary-image",
    url: "/images/products/placeholder-main.png",
    sortOrder: 0,
  },
  {
    suffix: "thumb-1",
    url: "/images/products/placeholder-thumb-1.png",
    sortOrder: 1,
  },
  {
    suffix: "thumb-2",
    url: "/images/products/placeholder-thumb-2.png",
    sortOrder: 2,
  },
  {
    suffix: "thumb-3",
    url: "/images/products/placeholder-thumb-3.png",
    sortOrder: 3,
  },
] as const;

// Shared across the three paddles below — same construction, same care
// regardless of tier. Kept as a constant rather than repeated per product.
const PADDLE_CARE_INSTRUCTIONS =
  "Wipe the paddle face down with a dry or slightly damp cloth after every session — sweat and dust wear down the carbon finish faster than play does. Store it out of direct sun and away from car boots or radiators; heat softens the foam core over time. Keep it in the included cover when it's not on court. If the grip starts to feel slick, replace the overgrip rather than the whole handle.";

// Copy transcribed from Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame "PDP_draft 2",
// node 759:2979) — the comparison-table rows (759:3143), the Reset Touch
// description/who-this-is-for body (759:3095, 759:3507), and the Rally Pro
// name/positioning from the FAQ copy (759:3290-3296). The comparison table's
// third column was left as literal "Lorem ipsum" placeholders in Figma —
// Rally Pro's specs/copy below are newly written to fill that gap, in the
// same voice, consistent with how the FAQ already describes it.
const PICKLEBALL_PRODUCTS: ProductSeed[] = [
  {
    slug: "reset-carbon",
    name: "Reset Carbon",
    description:
      "Your first carbon paddle upgrade. A PP honeycomb core under a T700 carbon frosted face — more pop off the face than a standard polymer paddle, without the price tag of a full foam build. USAPA approved, built for players moving off entry-level gear and into their first real season.",
    status: "ACTIVE",
    highlightTags: ["T700 Carbon Frosted Face", "USAPA Approved"],
    specs: [
      { label: "Best for", value: "First carbon paddle upgrade" },
      { label: "Core", value: "PP Honeycomb" },
      { label: "Sweet spot", value: "Standard" },
      { label: "Power/pop", value: "Higher" },
      { label: "Arm comfort", value: "Good" },
      { label: "Soft game", value: "Good" },
      { label: "Face", value: "T700 Carbon Frosted" },
      { label: "USAPA Approved", value: "Yes" },
    ],
    whoThisIsFor:
      "Playing style — All court. You're still working out whether you play closer to the kitchen or the baseline, and want a paddle that doesn't punish either choice.\n\nWhat you're looking for — Pop. You want more power off the face than a beginner paddle gives you, without paying for a full foam core you might not need yet.\n\nNot for you if — You've already played a season or two of carbon and are chasing touch and arm comfort over raw pop — the Reset Touch is the better next step.",
    careInstructions: PADDLE_CARE_INSTRUCTIONS,
    powerRating: 75,
    spinRating: 55,
    controlRating: 60,
    variants: [
      {
        sku: "PDL-CARBON-S-LIME",
        attributes: { size: "Small", color: "Lime" },
        price: 1199,
        weightGrams: 205,
        quantityOnHand: 24,
      },
      {
        sku: "PDL-CARBON-M-LIME",
        attributes: { size: "Medium", color: "Lime" },
        price: 1199,
        weightGrams: 210,
        quantityOnHand: 30,
      },
      {
        sku: "PDL-CARBON-L-LIME",
        attributes: { size: "Large", color: "Lime" },
        price: 1199,
        weightGrams: 215,
        quantityOnHand: 18,
      },
      {
        sku: "PDL-CARBON-S-BLUE",
        attributes: { size: "Small", color: "Blue" },
        price: 1199,
        weightGrams: 205,
        quantityOnHand: 20,
      },
      {
        sku: "PDL-CARBON-M-BLUE",
        attributes: { size: "Medium", color: "Blue" },
        price: 1199,
        weightGrams: 210,
        quantityOnHand: 26,
      },
      {
        sku: "PDL-CARBON-L-BLUE",
        attributes: { size: "Large", color: "Blue" },
        price: 1199,
        weightGrams: 215,
        // Deliberately zero — exercises the out-of-stock UI state.
        quantityOnHand: 0,
      },
    ],
  },
  {
    slug: "reset-touch",
    name: "Reset Touch",
    description:
      "You know what a carbon paddle feels like. You've played it, you've improved with it, and now you know exactly what it's missing. The dead spots near the edges. The arm that feels it after a long session. The shots at the kitchen line that should feel softer, but don't. The Reset Touch runs a full EPP foam core. Foam fills every gap in the paddle body, no hollow edges, no dead zones. The sweet spot gets larger. Mishits feel controlled instead of punishing. And after 90 minutes on the court, your arm still feels fine. T700 carbon face, thermoformed construction, 16mm foam core. Bigger sweet spot, arm comfort, more control. The upgrade you've been waiting for, at a price built for Indian courts, not global price tags.",
    status: "ACTIVE",
    highlightTags: [
      "T700 Japanese Raw Carbon Fibre",
      "USAPA Approved",
      "Arm Comfort Built In",
      "Full Foam Core",
    ],
    specs: [
      { label: "Best for", value: "Soft game" },
      { label: "Core", value: "EPP Full Foam" },
      { label: "Sweet spot", value: "Larger (foam-expanded)" },
      { label: "Power/pop", value: "Controlled" },
      { label: "Arm comfort", value: "Excellent" },
      { label: "Soft game", value: "Excellent" },
      { label: "Face", value: "T700 Carbon Frosted" },
      { label: "USAPA Approved", value: "Yes" },
    ],
    whoThisIsFor:
      "You've been playing for a while now. Carbon already felt like an upgrade, and it was. But you've started noticing the gaps: mishits that sting, an arm that feels it after a long session, touch shots that should be softer. You're not a beginner anymore, and your paddle should reflect that.\n\nPlaying style — All court. You play the kitchen as well as the baseline. You want a paddle that works in a long dinking rally and on a driven return equally, not built for one or the other.\n\nWhat you're looking for — Feel. You want the foam core difference: more forgiveness on mishits, a larger sweet spot, an arm that still feels fine after 90 minutes. That's exactly what the Reset Touch is built for.\n\nNot for you if — You're picking up your first carbon paddle. The Reset Carbon is the right starting point, at a price that makes that step easier.",
    careInstructions: PADDLE_CARE_INSTRUCTIONS,
    powerRating: 55,
    spinRating: 65,
    controlRating: 80,
    variants: [
      {
        sku: "PDL-TOUCH-S-LIME",
        attributes: { size: "Small", color: "Lime" },
        price: 1500,
        weightGrams: 200,
        quantityOnHand: 22,
      },
      {
        sku: "PDL-TOUCH-M-LIME",
        attributes: { size: "Medium", color: "Lime" },
        price: 1500,
        weightGrams: 205,
        quantityOnHand: 28,
      },
      {
        sku: "PDL-TOUCH-L-LIME",
        attributes: { size: "Large", color: "Lime" },
        price: 1500,
        weightGrams: 210,
        quantityOnHand: 16,
      },
      {
        sku: "PDL-TOUCH-S-BLUE",
        attributes: { size: "Small", color: "Blue" },
        price: 1500,
        compareAtPrice: 1799,
        weightGrams: 200,
        quantityOnHand: 19,
      },
      {
        sku: "PDL-TOUCH-M-BLUE",
        attributes: { size: "Medium", color: "Blue" },
        price: 1500,
        compareAtPrice: 1799,
        weightGrams: 205,
        quantityOnHand: 24,
      },
      {
        sku: "PDL-TOUCH-L-BLUE",
        attributes: { size: "Large", color: "Blue" },
        price: 1500,
        compareAtPrice: 1799,
        weightGrams: 210,
        quantityOnHand: 12,
      },
    ],
  },
  {
    slug: "rally-pro",
    name: "Rally Pro",
    description:
      "For the player who already has a rally going and wants to win the point, not just extend it. The Rally Pro pairs an EPP full foam core with a carbon weave face for the largest sweet spot in the lineup and pop that stays controlled instead of unpredictable at tournament pace. Built for intermediate to advanced players who want more control and touch, not the raw power of a beginner paddle.",
    status: "ACTIVE",
    highlightTags: [
      "T700 Raw Carbon Face",
      "USAPA Approved",
      "Tournament-Grade Control",
    ],
    specs: [
      { label: "Best for", value: "Tournament-level control" },
      { label: "Core", value: "EPP Full Foam + Carbon Weave" },
      { label: "Sweet spot", value: "Largest (edge-to-edge foam)" },
      { label: "Power/pop", value: "Controlled+" },
      { label: "Arm comfort", value: "Excellent" },
      { label: "Soft game", value: "Excellent" },
      { label: "Face", value: "T700 Raw Carbon" },
      { label: "USAPA Approved", value: "Yes" },
    ],
    whoThisIsFor:
      "Playing style — Baseline-first. You drive the ball and close at the net on your terms; you want a paddle that rewards precision over brute force.\n\nWhat you're looking for — Control at pace. You want the largest sweet spot in the range and a face that stays predictable when a rally speeds up, not just when it slows down.\n\nNot for you if — You're new to carbon paddles altogether. Start with the Reset Carbon and move up once you've got a season of court time behind you.",
    careInstructions: PADDLE_CARE_INSTRUCTIONS,
    powerRating: 60,
    spinRating: 75,
    controlRating: 90,
    variants: [
      {
        sku: "PDL-RALLYPRO-S-LIME",
        attributes: { size: "Small", color: "Lime" },
        price: 2499,
        weightGrams: 200,
        quantityOnHand: 15,
      },
      {
        sku: "PDL-RALLYPRO-M-LIME",
        attributes: { size: "Medium", color: "Lime" },
        price: 2499,
        weightGrams: 205,
        quantityOnHand: 20,
      },
      {
        sku: "PDL-RALLYPRO-L-LIME",
        attributes: { size: "Large", color: "Lime" },
        price: 2499,
        weightGrams: 210,
        quantityOnHand: 10,
      },
      {
        sku: "PDL-RALLYPRO-S-BLUE",
        attributes: { size: "Small", color: "Blue" },
        price: 2499,
        weightGrams: 200,
        quantityOnHand: 14,
      },
      {
        sku: "PDL-RALLYPRO-M-BLUE",
        attributes: { size: "Medium", color: "Blue" },
        price: 2499,
        weightGrams: 205,
        quantityOnHand: 18,
      },
      {
        sku: "PDL-RALLYPRO-L-BLUE",
        attributes: { size: "Large", color: "Blue" },
        price: 2499,
        weightGrams: 210,
        quantityOnHand: 9,
      },
    ],
  },
  {
    slug: "pickleball-performance-polo",
    name: "Pickleball Performance Polo",
    description: "Moisture-wicking polo built for long rallies and hot courts.",
    status: "ACTIVE",
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

// Product-level reviews (targetType PRODUCT) for the three paddles, plus a
// handful of brand-level reviews (targetType BRAND, no product) for the
// Homepage/Collection review walls. Figma's own PDP and Homepage frames
// each duplicate one placeholder review card 3x ("Jennifer J." / "Great
// quality…" and "Melanie N." / "Best mat I have owned!!…") — those two
// anchor the tone here, but every row below is distinct copy rather than
// literal duplicates, per the "don't ship it as duplicate spam" note.
const PADDLE_REVIEWS: ReviewSeed[] = [
  {
    productSlug: "reset-carbon",
    rating: 5,
    title: "Great quality",
    body: "Amazing quality and product! Able to play with a lot more power off the face than I expected for a first carbon paddle.",
    authorDisplay: "Jennifer J.",
  },
  {
    productSlug: "reset-carbon",
    rating: 4,
    title: "Solid upgrade from my starter paddle",
    body: "Noticeably more pop than the polymer paddle I started with. Still getting used to the extra power, but that's on me, not the paddle.",
    authorDisplay: "Rohan K.",
  },
  {
    productSlug: "reset-carbon",
    rating: 5,
    title: "Good value for the price",
    body: "Was worried a paddle at this price would feel cheap. It doesn't. USAPA approved and holding up fine after a few weeks of weekend play.",
    authorDisplay: "Priya S.",
  },
  {
    productSlug: "reset-carbon",
    rating: 4,
    title: "My go-to for casual matches",
    body: "Grip feels great, pop is there when I need it. Wish the sweet spot was a touch bigger, but that's what the Touch is for I guess.",
    authorDisplay: "Arjun M.",
  },
  {
    productSlug: "reset-touch",
    rating: 5,
    title: "Arm actually feels fine after 90 minutes",
    body: "This is exactly what was promised. Played a two hour session and no wrist fatigue at all. The foam core difference is real.",
    authorDisplay: "Melanie N.",
  },
  {
    productSlug: "reset-touch",
    rating: 5,
    title: "Best paddle I've owned",
    body: "Mishits don't punish you anymore. The sweet spot is genuinely bigger than my old carbon paddle and my dinking game has improved a lot.",
    authorDisplay: "Jennifer J.",
  },
  {
    productSlug: "reset-touch",
    rating: 4,
    title: "Great for all-court players",
    body: "I split my time between the kitchen and baseline and this paddle handles both well. Only wish it came in a third colourway.",
    authorDisplay: "Sanjay T.",
  },
  {
    productSlug: "reset-touch",
    rating: 5,
    title: "Worth the upgrade from Reset Carbon",
    body: "Went from the Reset Carbon to this after a season and the difference in touch shots is huge. Control feels so much better at the net.",
    authorDisplay: "Divya R.",
  },
  {
    productSlug: "rally-pro",
    rating: 5,
    title: "Tournament ready",
    body: "Used this in my first sanctioned tournament and it held up. Control at pace is exactly what was advertised, no unpredictability when the rally speeds up.",
    authorDisplay: "Karan V.",
  },
  {
    productSlug: "rally-pro",
    rating: 5,
    title: "Control over power, finally",
    body: "I don't need more power, I need the ball to go where I aim it. This paddle delivers that better than anything else I've tried.",
    authorDisplay: "Neha P.",
  },
  {
    productSlug: "rally-pro",
    rating: 4,
    title: "A real step up for advanced players",
    body: "Not for beginners, and the product page is right to say so. If you're still learning, this paddle will feel unforgiving. For advanced play, it's excellent.",
    authorDisplay: "Vikram S.",
  },
  {
    productSlug: "rally-pro",
    rating: 5,
    title: "Sweet spot is enormous",
    body: "Mishits near the edge still land clean. That alone justifies the price for me as someone who plays competitively most weekends.",
    authorDisplay: "Anjali D.",
  },
];

const BRAND_REVIEWS: ReviewSeed[] = [
  {
    rating: 5,
    title: "Actually holds up",
    body: "Five days a week for three months and everything still looks brand new. The build quality across the board is way better than I expected from an Indian brand.",
    authorDisplay: "Melanie N.",
  },
  {
    rating: 5,
    title: "Design that doesn't look budget",
    body: "Finally gear that looks as good as the imported brands without the imported price tag. My whole group chat has switched over.",
    authorDisplay: "Kabir A.",
  },
  {
    rating: 4,
    title: "Great customer support too",
    body: "Had a sizing question before ordering and got a real answer within the hour. Product arrived well packaged and on time.",
    authorDisplay: "Meera J.",
  },
  {
    rating: 5,
    title: "Onwei gets it",
    body: "Not stripped down, not marked up. Just genuinely well designed gear for people who show up regularly — exactly what the brand promises.",
    authorDisplay: "Farhan I.",
  },
];

// General FAQs transcribed/adapted from Figma's "frequently asked
// questions" section (759:3286) — "The Baseline"/"Serve Series" in the
// original copy aren't real catalog products, so those two answers are
// reworded to reference the paddles that actually exist. Per-product
// "Is this paddle good for beginners?" rows below come from the PDP's
// "Have questions?" quick-chip widget (759:3107), one real answer per
// paddle instead of Figma's literal duplicate placeholder.
const FAQS: FaqSeed[] = [
  {
    question: "How do I start a return?",
    answer:
      "Go to your account's Orders page, select the order, and choose Start a return. We'll email you a prepaid shipping label within 24 hours. Returns are accepted within 15 days of delivery for unused items in original packaging.",
    sortOrder: 10,
  },
  {
    question: "How long does shipping take?",
    answer:
      "Orders ship within 1-2 business days. Delivery typically takes 3-5 business days for metro cities and 5-7 business days elsewhere in India. You'll get a tracking link by email once it ships.",
    sortOrder: 20,
  },
  {
    question: "What's the difference between Reset Touch and Rally Pro?",
    answer:
      "Reset Touch is built for arm comfort and forgiveness on mishits — great for long sessions and an all-court game. Rally Pro trades a little of that forgiveness for tournament-level control at pace, built for players who already know their game.",
    sortOrder: 30,
  },
  {
    question: "Do you offer USAPA-approved paddles?",
    answer:
      "Yes — every paddle in the Reset and Rally lineup is USAPA approved and safe to use in sanctioned play.",
    sortOrder: 40,
  },
  {
    productSlug: "reset-carbon",
    question: "Is this paddle good for beginners?",
    answer:
      "Yes — the Reset Carbon is designed as a first carbon paddle upgrade, with more pop than a polymer starter paddle but without the steep learning curve of a full foam core.",
    sortOrder: 5,
  },
  {
    productSlug: "reset-touch",
    question: "Is this paddle good for beginners?",
    answer:
      "It can work for confident beginners, but it's really built for players who've already put in a season of court time and are starting to notice the limits of a basic paddle.",
    sortOrder: 5,
  },
  {
    productSlug: "rally-pro",
    question: "Is this paddle good for beginners?",
    answer:
      "Not really — the Rally Pro is tuned for intermediate to advanced players who want more control and touch. If you're just starting out, the Reset Carbon is a better fit.",
    sortOrder: 5,
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
    const contentFields = {
      specs: productSeed.specs ?? undefined,
      whoThisIsFor: productSeed.whoThisIsFor ?? null,
      careInstructions: productSeed.careInstructions ?? null,
      powerRating: productSeed.powerRating ?? null,
      spinRating: productSeed.spinRating ?? null,
      controlRating: productSeed.controlRating ?? null,
      highlightTags: productSeed.highlightTags ?? [],
    };

    const product = await prisma.product.upsert({
      where: { slug: productSeed.slug },
      update: {
        name: productSeed.name,
        description: productSeed.description,
        status: productSeed.status,
        categoryId: category.id,
        ...contentFields,
      },
      create: {
        name: productSeed.name,
        slug: productSeed.slug,
        description: productSeed.description,
        status: productSeed.status,
        categoryId: category.id,
        ...contentFields,
      },
    });

    for (const image of PLACEHOLDER_IMAGE_SET) {
      await prisma.productImage.upsert({
        where: { id: `${product.id}-${image.suffix}` },
        update: { url: image.url, sortOrder: image.sortOrder },
        create: {
          id: `${product.id}-${image.suffix}`,
          productId: product.id,
          url: image.url,
          altText: productSeed.name,
          sortOrder: image.sortOrder,
          isPlaceholder: true,
        },
      });
    }

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

async function seedReviews(reviews: ReviewSeed[]) {
  for (const [index, reviewSeed] of reviews.entries()) {
    const product = reviewSeed.productSlug
      ? await prisma.product.findUnique({
          where: { slug: reviewSeed.productSlug },
        })
      : null;
    if (reviewSeed.productSlug && !product) continue;

    const id = `review-${reviewSeed.productSlug ?? "brand"}-${index}`;
    await prisma.review.upsert({
      where: { id },
      update: {
        rating: reviewSeed.rating,
        title: reviewSeed.title,
        body: reviewSeed.body,
        authorDisplay: reviewSeed.authorDisplay,
      },
      create: {
        id,
        targetType: product ? "PRODUCT" : "BRAND",
        productId: product?.id,
        source: "SITE",
        rating: reviewSeed.rating,
        title: reviewSeed.title,
        body: reviewSeed.body,
        authorDisplay: reviewSeed.authorDisplay,
        isApproved: true,
        approvedAt: new Date(),
      },
    });
  }
}

async function seedFaqs(faqs: FaqSeed[]) {
  for (const [index, faqSeed] of faqs.entries()) {
    const product = faqSeed.productSlug
      ? await prisma.product.findUnique({
          where: { slug: faqSeed.productSlug },
        })
      : null;
    if (faqSeed.productSlug && !product) continue;

    const id = `faq-${faqSeed.productSlug ?? "general"}-${index}`;
    await prisma.faq.upsert({
      where: { id },
      update: {
        question: faqSeed.question,
        answer: faqSeed.answer,
        sortOrder: faqSeed.sortOrder,
      },
      create: {
        id,
        productId: product?.id,
        question: faqSeed.question,
        answer: faqSeed.answer,
        sortOrder: faqSeed.sortOrder,
        isActive: true,
      },
    });
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

// bcryptjs is used directly here (not packages/auth's hashPassword) to avoid
// a circular package dependency: packages/auth already depends on
// @onwei/database (for getStaffPermissions), so @onwei/database can't
// depend back on packages/auth. Keep SALT_ROUNDS in sync with
// packages/auth/src/password/password.ts if that ever changes.
const SALT_ROUNDS = 12;

// The full catalog of permission keys the admin app checks against
// (apps/admin/app/api/_lib/requireStaffSession.ts). The bootstrapped
// super-admin (packages/auth/src/rbac/getStaffPermissions.ts) gets every
// row in this table automatically — if this table were empty, the
// super-admin would have *no* permissions despite the "gets every
// permission automatically" rule in docs/ARCHITECTURE.md, so these rows
// must exist for that rule to actually mean anything. Every other staff
// user gets permissions only via an assigned Role — see apps/admin's
// /staff and /roles pages (packages/core/src/staff/*.ts).
const PERMISSION_KEYS = [
  "category:create",
  "category:update",
  "product:create",
  "product:update",
  "product:delete",
  "productVariant:create",
  "productVariant:update",
  "productImage:manage",
  "inventory:view",
  "inventory:adjust",
  "order:view",
  "order:updateStatus",
  "return:view",
  "return:approve",
  "return:reject",
  "payment:view",
  "coupon:create",
  "coupon:update",
  "discountRule:create",
  "discountRule:update",
  "staffUser:create",
  "staffUser:update",
  "role:create",
  "role:update",
  "staffUserRole:assign",
  "review:moderate",
  "review:createManual",
  "review:feature",
  "faq:create",
  "faq:update",
  "faq:delete",
  "content:manage",
  "customer:view",
  "auditLog:view",
  "newsletter:view",
  "newsletter:manage",
  "dsr:view",
  "dsr:updateStatus",
  "consentLog:view",
] as const;

async function seedPermissions() {
  for (const key of PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }
}

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;

  if (!email || !initialPassword) {
    console.log(
      "SUPERADMIN_EMAIL / SUPERADMIN_INITIAL_PASSWORD not set — skipping super-admin seed.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(initialPassword, SALT_ROUNDS);

  await prisma.staffUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Super Admin",
    },
  });
}

// Shared Homepage + PDP value-prop cards (Figma reuses the same 3 cards,
// different copy per page — this is the PDP's copy, since it's the more
// recently authored of the two near-identical originals).
const VALUE_PROPS = [
  {
    illustrationUrl: "/images/showcase/value-prop-1.svg",
    width: 151,
    height: 82,
    title: "Designed Intentionally",
    body: "You shouldn't have to choose between performance, durability, and good design.",
  },
  {
    illustrationUrl: "/images/showcase/value-prop-2.svg",
    width: 168,
    height: 60,
    title: "Designed for consistent use",
    body: "You show up — between work, life and everything else. Your gear should match that effort.",
  },
  {
    illustrationUrl: "/images/showcase/value-prop-3.svg",
    width: 170,
    height: 67,
    title: "Designed to Belong",
    body: "Products you'll feel good using, carrying and coming back to every day.",
  },
] as const;

// Shared Homepage + PDP Instagram grid (Figma duplicates this section
// per-page with the same photo set).
const INSTAGRAM_PHOTOS = [
  "/images/instagram/photo-1.png",
  "/images/instagram/photo-2.png",
  "/images/instagram/photo-3.png",
  "/images/instagram/photo-4.png",
  "/images/instagram/photo-5.png",
] as const;

const MARQUEE_ITEMS: {
  placement: "HOME_HERO" | "HOME_SHOWCASE" | "PDP";
  labels: readonly string[];
}[] = [
  {
    placement: "HOME_HERO",
    labels: [
      "OWN YOUR EFFORT",
      "NOT PERFECTLY, JUST CONSISTENTLY",
      "BUILT FOR EVERYDAY",
      "EVEN 20 MINUTES COUNT",
      "PLAY. PAUSE. PROGRESS.",
      "AT YOUR OWN PACE",
    ],
  },
  {
    placement: "HOME_SHOWCASE",
    labels: [
      "BUILT BY AN ATHLETE",
      "FOR EVERYDAY USE",
      "COMFORTABLE GRIP",
      "BUILT FOR PERFORMANCE",
      "ELEVATED DESIGN",
      "FOR EVERYDAY USE",
    ],
  },
  {
    placement: "PDP",
    labels: [
      "BUILT FOR INDIAN COURTS",
      "USAPA APPROVED",
      "ARM COMFORT FIRST",
      "T700 RAW CARBON",
      "DESIGNED, NOT JUST MANUFACTURED",
      "OWN YOUR EFFORT",
    ],
  },
];

async function seedValueProps() {
  for (const [index, prop] of VALUE_PROPS.entries()) {
    const id = `value-prop-${index}`;
    await prisma.valueProp.upsert({
      where: { id },
      update: { ...prop, sortOrder: index },
      create: { id, ...prop, sortOrder: index, isActive: true },
    });
  }
}

async function seedInstagramPhotos() {
  for (const [index, url] of INSTAGRAM_PHOTOS.entries()) {
    const id = `instagram-photo-${index}`;
    await prisma.instagramPhoto.upsert({
      where: { id },
      update: { imageUrl: url, sortOrder: index },
      create: { id, imageUrl: url, sortOrder: index, isActive: true },
    });
  }
}

async function seedMarqueeItems() {
  for (const group of MARQUEE_ITEMS) {
    for (const [index, label] of group.labels.entries()) {
      const id = `marquee-${group.placement}-${index}`;
      await prisma.marqueeItem.upsert({
        where: { id },
        update: { label, sortOrder: index },
        create: {
          id,
          placement: group.placement,
          label,
          sortOrder: index,
          isActive: true,
        },
      });
    }
  }
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

  await seedReviews([...PADDLE_REVIEWS, ...BRAND_REVIEWS]);
  await seedFaqs(FAQS);
  await seedValueProps();
  await seedInstagramPhotos();
  await seedMarqueeItems();

  await seedPermissions();
  await seedSuperAdmin();

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
