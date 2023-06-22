CREATE TABLE "blockchain" (
    "id"    BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "name"  CHARACTER VARYING(100)  NOT NULL,
	"address_id" BIGINT          	NOT NULL,
	CONSTRAINT "fk__blockchain__address" FOREIGN KEY ("address_id") REFERENCES "address" ("id")
);
