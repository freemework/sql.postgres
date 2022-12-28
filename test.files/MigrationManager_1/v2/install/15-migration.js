async function migration(executionContext, sqlConnection, log) {
	log.info(executionContext, __filename);

	const idData = await sqlConnection.statement(
		`SELECT "id" FROM "topic" WHERE "name" = $1`
	).executeScalar(executionContext, "migration.js");

	await sqlConnection.statement(
		`INSERT INTO "subscriber" ("subscriber_uuid", "topic_id") VALUES ('1fbb7a8a-cace-4a80-a9de-77ff14e6762d', $1)`
	).execute(executionContext, idData.asInteger);
}
