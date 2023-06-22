async function migration(executionContext, sqlProvider, log) {
  log.info(executionContext, __filename);
  for (let i = 0; i < 5; i++) {
	let number = "number-" + i;
	let hash = "0x00000" + i;
	let num_i = i * 3;
	let parent_hash = "0x00000" + num_i;
	const resultBlockId = await sqlProvider
	.statement(
	`
		INSERT INTO "block" ("number", "hash", "parent_hash")
		VALUES ('${number}', '${hash}', '${parent_hash}')
		RETURNING "id"
	`
	)
	.executeScalar(executionContext);
	const blockId = resultBlockId.asString;
	log.info(executionContext, `${blockId}`);

	for (let i = 0; i < 5; i++){
		let hash = "0x00000" + i;
		let amount = i * 5.25;
		const resultTransactionId = await sqlProvider
		.statement(
		`
			INSERT INTO "transaction" ("hash", "amount", "block_id")
			VALUES ('${hash}', '${amount}', '${blockId}')
			RETURNING "id"
		`
		)
		.executeScalar(executionContext);
		const transactionId = resultTransactionId.asString;
		log.info(executionContext, `${transactionId}`);

			for (let i = 0; i < 5; i++){
				let address = "0x00000" + i;
				let balance = i * 5.45;
				const resultAddressId = await sqlProvider
				.statement(
				`
					INSERT INTO "address" ("address", "balance", "transaction_id")
					VALUES ('${address}', '${balance}', '${transactionId}')
					RETURNING "id"
				`
				)
				.executeScalar(executionContext);
				const addressId = resultAddressId.asString;
				log.info(executionContext, `${addressId}`);
				}
		}
  }
}
