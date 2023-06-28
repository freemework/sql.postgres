INSERT INTO "purchase_item" ("purchase_id", "product_id", "product_price")
VALUES (
	(SELECT "id" FROM "purchase" WHERE "customer" = 'Hello'),
	(SELECT "id" FROM "product" WHERE "name" = 'SMART'),
	(234.33) 
);
