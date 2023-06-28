async function migration(executionContext, sqlProvider, log) {
  log.info(executionContext, __filename);

  const resultAddressId = await sqlProvider
  .statement(
  `
	SELECT "id" FROM "address" LIMIT 1
  `
  )
  .executeScalar(executionContext);
  const addressId = resultAddressId.asString;

  for (let i = 0; i < 5; i++) {
    let name = "name-" + i;
    const resultBlockchainId = await sqlProvider
      .statement(
        `
		INSERT INTO "blockchain" ("name", "address_id")
		VALUES ('${name}', '${addressId}')
		RETURNING "id"
		`
      )
      .executeScalar(executionContext);
    const blockchainId = resultBlockchainId.asString;
    log.info(executionContext, `${blockchainId}`);
  }
}
