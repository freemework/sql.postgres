CREATE TABLE "purchase"
(
	"id" INT GENERATED ALWAYS AS IDENTITY,
	"date" TIMESTAMP NOT NULL DEFAULT NOW(),
	"customer" VARCHAR(128),
	PRIMARY KEY("id")
);
