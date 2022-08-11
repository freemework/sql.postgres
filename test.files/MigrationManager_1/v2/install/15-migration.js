async function migration(cancellationToken, FSqlProvider, log) {
	log.info(__filename);

	const idData = await FSqlProvider.statement(
		`SELECT "id" FROM "topic" WHERE "name" = $1`
	).executeScalar(cancellationToken, "migration.js");

	await FSqlProvider.statement(
		`INSERT INTO "subscriber" ("subscriber_uuid", "topic_id") VALUES ('1fbb7a8a-cace-4a80-a9de-77ff14e6762d', $1)`
	).execute(cancellationToken, idData.asInteger);
}
