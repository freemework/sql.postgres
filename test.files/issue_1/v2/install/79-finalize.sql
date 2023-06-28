INSERT INTO "category" ("name")
VALUES ('fridge');
INSERT INTO "category" ("name")
VALUES ('TV');

INSERT INTO "product" ("category_id","name")
VALUES (
	(SELECT "id" FROM "category" WHERE "name" = 'fridge'), -- 1
	('Ololo')
);

UPDATE "product"
SET "category_id" = (SELECT "id" FROM "category" WHERE "name" = 'TV')
WHERE "name" = 'SMART';

ALTER TABLE "product"
ALTER COLUMN "category_id" SET NOT NULL;
