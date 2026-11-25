-- Data only. Terms for the reworked pre-orders (docs/COMMERCE_BUILD_PLAN.md
-- section 14a): a new "Pre-orders" section after "Orders and payment", and
-- the payment gateway fee line in "Returns and refunds". Each change applies
-- once, so running it again (or after staff edits) changes nothing.

-- Make room straight after "Orders and payment", only if not added yet.
WITH terms AS (
  SELECT p."id" AS page_id,
         COALESCE(
           (SELECT s."sortOrder" FROM "LegalSection" s
             WHERE s."pageId" = p."id" AND s."heading" = 'Orders and payment'
             LIMIT 1),
           (SELECT MAX(s."sortOrder") FROM "LegalSection" s WHERE s."pageId" = p."id")
         ) AS after_order
  FROM "LegalPage" p
  WHERE p."slug" = 'terms'
    AND NOT EXISTS (
      SELECT 1 FROM "LegalSection" s
       WHERE s."pageId" = p."id" AND s."heading" = 'Pre-orders'
    )
)
UPDATE "LegalSection" AS s
SET "sortOrder" = s."sortOrder" + 1
FROM terms
WHERE s."pageId" = terms.page_id
  AND s."sortOrder" > terms.after_order;

INSERT INTO "LegalSection" ("id", "pageId", "heading", "body", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  'preorders_' || substr(md5(random()::text), 1, 16),
  p."id",
  'Pre-orders',
  E'- A pre-order is paid in two parts: a reserve when you order, and the balance later. The reserve and the balance are shown in your bag and at checkout before you pay, and the reserve counts towards your final price.\n- The pre-order discount and gifts live when you pay the reserve are locked in for that order. If you cancel and order again, you get the offer live at that time.\n- You can cancel a pre-order from your account until pre-orders close, unless we have already sent you the reminder to pay the balance. What you paid becomes credit on your account, valid for 12 months.\n- Pay the balance by the date shown on your order. If it is not paid by then, nothing ships, the pre-order offer ends, and what you paid becomes credit on your account, valid for 12 months.\n- Credit cannot be exchanged for cash. If we agree to refund a reserve in cash instead, the refund excludes the payment gateway fee.',
  COALESCE(
    (SELECT s."sortOrder" + 1 FROM "LegalSection" s
      WHERE s."pageId" = p."id" AND s."heading" = 'Orders and payment' LIMIT 1),
    (SELECT COALESCE(MAX(s."sortOrder"), -1) + 1 FROM "LegalSection" s WHERE s."pageId" = p."id")
  ),
  true,
  now(),
  now()
FROM "LegalPage" AS p
WHERE p."slug" = 'terms'
  AND NOT EXISTS (
    SELECT 1 FROM "LegalSection" s
     WHERE s."pageId" = p."id" AND s."heading" = 'Pre-orders'
  );

-- "Returns and refunds": add the gateway fee line to whatever the text is now.
UPDATE "LegalSection" AS s
SET "body" = rtrim(s."body") || ' Cash refunds of a pre-order reserve exclude the payment gateway fee.',
    "updatedAt" = now()
FROM "LegalPage" AS p
WHERE s."pageId" = p."id"
  AND p."slug" = 'terms'
  AND s."heading" = 'Returns and refunds'
  AND s."body" NOT LIKE '%payment gateway fee%';

-- The consent version is the pages' last edit time, so people agreeing from
-- now on are recorded against the new text.
UPDATE "LegalPage" SET "updatedAt" = now() WHERE "slug" = 'terms';
