-- Data only. Legal text for Onwei Insiders (docs/COMMERCE_BUILD_PLAN.md,
-- section 4). Each change applies once and only to the default wording, so
-- text staff already rewrote in the admin is left alone.

-- Privacy, "What we collect": addresses are also collected to post the
-- Insider card.
UPDATE "LegalSection" AS s
SET "body" = replace(
      s."body",
      'Delivery addresses and order details when you place an order.',
      'Delivery addresses and order details when you place an order, or when you ask us to post you something, such as your Insider card.'
    ),
    "updatedAt" = now()
FROM "LegalPage" AS p
WHERE s."pageId" = p."id"
  AND p."slug" = 'privacy'
  AND s."body" LIKE '%Delivery addresses and order details when you place an order.%';

-- Terms: new "Insider codes" section straight after "Coupons and offers".
-- Make room first, then insert, both only if the section isn't there yet.
WITH terms AS (
  SELECT p."id" AS page_id,
         COALESCE(
           (SELECT s."sortOrder" FROM "LegalSection" s
             WHERE s."pageId" = p."id" AND s."heading" = 'Coupons and offers'
             LIMIT 1),
           (SELECT MAX(s."sortOrder") FROM "LegalSection" s WHERE s."pageId" = p."id")
         ) AS after_order
  FROM "LegalPage" p
  WHERE p."slug" = 'terms'
    AND NOT EXISTS (
      SELECT 1 FROM "LegalSection" s
       WHERE s."pageId" = p."id" AND s."heading" = 'Insider codes'
    )
)
UPDATE "LegalSection" AS s
SET "sortOrder" = s."sortOrder" + 1
FROM terms
WHERE s."pageId" = terms.page_id
  AND s."sortOrder" > terms.after_order;

INSERT INTO "LegalSection" ("id", "pageId", "heading", "body", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  'insider_codes_' || substr(md5(random()::text), 1, 16),
  p."id",
  'Insider codes',
  'If you joined the Insiders list, you get a personal Insider code. It is yours alone: it only works when you are signed in with the email or phone number you joined with, and it cannot be shared, sold or exchanged for cash. The code does not expire, but the discount it gives may change over time, and some offers may not combine with it. We may withdraw a code if it is misused.',
  COALESCE(
    (SELECT s."sortOrder" + 1 FROM "LegalSection" s
      WHERE s."pageId" = p."id" AND s."heading" = 'Coupons and offers' LIMIT 1),
    (SELECT COALESCE(MAX(s."sortOrder"), -1) + 1 FROM "LegalSection" s WHERE s."pageId" = p."id")
  ),
  true,
  now(),
  now()
FROM "LegalPage" AS p
WHERE p."slug" = 'terms'
  AND NOT EXISTS (
    SELECT 1 FROM "LegalSection" s
     WHERE s."pageId" = p."id" AND s."heading" = 'Insider codes'
  );

-- The consent version is the pages' last edit time, so people agreeing from
-- now on are recorded against the new text.
UPDATE "LegalPage" SET "updatedAt" = now() WHERE "slug" IN ('privacy', 'terms');
