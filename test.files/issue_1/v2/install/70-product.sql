ALTER TABLE "product"
ADD CONSTRAINT fk_category_id
FOREIGN KEY ("category_id") REFERENCES "category" ("id");
