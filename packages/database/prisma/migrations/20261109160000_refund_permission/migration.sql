-- Data only. New permission for giving money back (order refunds, return
-- refunds). The super-admin has every permission automatically; roles get
-- it from the admin Roles page.
INSERT INTO "Permission" ("id", "key", "description")
VALUES ('perm_order_refund', 'order:refund', 'Refund money on orders and returns')
ON CONFLICT ("key") DO NOTHING;
