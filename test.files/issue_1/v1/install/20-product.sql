CREATE TABLE "product"
(
	"id" INT GENERATED ALWAYS AS IDENTITY,
	"name" VARCHAR(256) NOT NULL,
	PRIMARY KEY ("id")
);