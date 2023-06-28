CREATE TABLE "block" (
    "id"            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "number"        VARCHAR(256) NOT NULL,
    "hash"          BYTEA NOT NULL,
    "parent_hash"   BYTEA NOT NULL
    -- "blockchain_id" BIGINT              NOT NULL
    -- CONSTRAINT "fk__block__blockchain" FOREIGN KEY ("blockchain_id") REFERENCES "blockchain" ("id")
);
