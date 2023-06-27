CREATE TABLE "purchase_item"
(
	"purchase_id" INT NOT NULL,
	"product_id" INT NOT NULL,
	"product_price" DECIMAL(9,2) NOT NULL,
	CONSTRAINT fk_purchase
	FOREIGN KEY ("purchase_id") REFERENCES "purchase" ("id"),
	CONSTRAINT fk_product
	FOREIGN KEY ("product_id") REFERENCES "product" ("id")
);
