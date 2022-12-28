async function migration(executionContext, sqlProvider, log) {
	log.info(executionContext, __filename);
	await sqlProvider.statement(
		`INSERT INTO "topic" ("name", "description", "media_type", "topic_security", "publisher_security", "subscriber_security") VALUES ('migration.js', 'Market currency', 's', 's', 'd', 'as')`
	).execute(executionContext);
}
