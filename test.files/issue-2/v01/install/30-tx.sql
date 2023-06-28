CREATE TABLE "transaction" (
    "id"          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "hash"        BYTEA               NOT NULL,
    "amount"      NUMERIC(48,2),
    "block_id"    BIGINT              NOT NULL,
    CONSTRAINT "fk__transaction__block" FOREIGN KEY ("block_id") REFERENCES "block" ("id")
);
