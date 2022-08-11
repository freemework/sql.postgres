async function migration(cancellationToken, FSqlProvider, log) {
	log.info(__filename);
	await FSqlProvider.statement(
		`INSERT INTO "topic" ("name", "description", "media_type", "topic_security", "publisher_security", "subscriber_security") VALUES ('migration.js', 'Market currency', 's', 's', 'd', 'as')`
	).execute(cancellationToken);
}
