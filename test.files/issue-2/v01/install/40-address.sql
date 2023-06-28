CREATE TABLE "address" (
    "id"                BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "address"           BYTEA               NOT NULL,
    "balance"           NUMERIC(48,2),
    "transaction_id"    BIGINT              NOT NULL,
    CONSTRAINT "fk__address__transaction" FOREIGN KEY ("transaction_id") REFERENCES "transaction" ("id")
);
