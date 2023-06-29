import {
	FExceptionInvalidOperation,
	FExecutionContext,
	FSqlConnection,
	FSqlData,
	FSqlResultRecord,
	FSqlStatement
} from "@freemework/common";

import { FSqlMigrationManager, FSqlMigrationSources } from "@freemework/sql.misc.migration";

import { FSqlConnectionFactoryPostgres } from "./FSqlConnectionFactoryPostgres";

export class FSqlMigrationManagerPostgres extends FSqlMigrationManager {
	private readonly _schema: string;

	public constructor(opts: FSqlMigrationManagerPostgres.Opts) {
		super(opts);
		this._schema = opts.sqlConnectionFactory.defaultSchema;
	}

	public async getCurrentVersion(executionContext: FExecutionContext): Promise<string | null> {
		return await this.sqlConnectionFactory.usingProvider(executionContext, async (FSqlConnection: FSqlConnection) => {

			const isExist = await this._isVersionTableExist(executionContext, FSqlConnection);
			if (isExist === false) { return null; }

			await this._verifyVersionTableStructure(executionContext, FSqlConnection);

			const versionData = await FSqlConnection.statement(
				`SELECT "version" FROM "${this.versionTableName}" ORDER BY "version" DESC LIMIT 1`
			).executeScalarOrNull(executionContext);

			if (versionData === null) {
				return null;
			}

			return versionData.asString;
		});
	}

	protected async _createVersionTable(executionContext: FExecutionContext, sqlProvider: FSqlConnection): Promise<void> {
		await sqlProvider.statement(`CREATE SCHEMA IF NOT EXISTS "${this._schema}"`).execute(executionContext);

		const tables = await sqlProvider.statement(
			`SELECT "tablename" FROM "pg_catalog"."pg_tables" WHERE "schemaname" != 'pg_catalog' AND "schemaname" != 'information_schema' AND "schemaname" = $1 AND "tablename" != 'emptytestflag'`
		).executeQuery(executionContext, this._schema);
		if (tables.length > 0) {
			const tablesString = tables.slice(0, 5).map(sqlData => sqlData.get(0).asString).join(", ") + "..";
			throw new FSqlMigrationManager.MigrationException(`Your database has tables: ${tablesString}. Create Version Table allowed only for an empty database. Please create Version Table yourself.`);
		}

		const views = await sqlProvider.statement(
			`SELECT "viewname" FROM "pg_catalog"."pg_views" WHERE "schemaname" != 'pg_catalog' AND "schemaname" != 'information_schema' AND "schemaname" = $1`
		).executeQuery(executionContext, this._schema);
		if (views.length > 0) {
			const viewsString = views.slice(0, 5).map(sqlData => sqlData.get(0).asString).join(", ") + "..";
			throw new FSqlMigrationManager.MigrationException(`Your database has views: ${viewsString}. Create Version Table allowed only for an empty database. Please create Version Table yourself.`);
		}

		await sqlProvider.statement(`
			CREATE TABLE "${this.versionTableName}" (
				"id" SMALLSERIAL NOT NULL PRIMARY KEY,
				"version" VARCHAR(64) NOT NULL UNIQUE,
				"utc_deployed_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT(now() AT TIME ZONE 'utc'),
				"log" TEXT NOT NULL
			)
		`).execute(executionContext);

		await sqlProvider.statement(`
			CREATE TABLE "${this.versionTableName}_rollback_script" (
				"id" SMALLSERIAL NOT NULL PRIMARY KEY,
				"version_id" SMALLINT NOT NULL,
				"name" VARCHAR(256) NOT NULL,
				"kind" VARCHAR(32) NOT NULL,
				"file" VARCHAR(2048) NOT NULL,
				"content" TEXT NOT NULL,
				CONSTRAINT "fk__${this.versionTableName}_rollback_script__${this.versionTableName}"
					FOREIGN KEY ("version_id")
					REFERENCES "${this.versionTableName}" ("id")
			)
		`).execute(executionContext);
	}

	protected async _insertRollbackScripts(
		executionContext: FExecutionContext,
		sqlConnection: FSqlConnection,
		version: string,
		scripts: ReadonlyArray<FSqlMigrationSources.Script>
	): Promise<void> {
		for (const script of scripts) {
			await sqlConnection.statement(`
				INSERT INTO "${this.versionTableName}_rollback_script" (
					"version_id",
					"name",
					"kind",
					"file",
					"content"
				)
				VALUES(
					(
						SELECT "id"
						FROM "${this._schema}"."${this.versionTableName}"
						WHERE "version" = $1
					),
					$2,
					$3,
					$4,
					$5
				)
			`).execute(
				executionContext,
				/*1*/version,
				/*2*/script.name,
				/*3*/script.kind,
				/*4*/script.file,
				/*5*/script.content
			);
		}
	}

	protected async _insertVersionLog(
		executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string, logText: string
	): Promise<void> {
		await sqlConnection.statement(
			`INSERT INTO "${this.versionTableName}"("version", "log") VALUES($1, $2)`
		).execute(executionContext, version, logText);
	}

	protected async _isVersionLogExist(executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string): Promise<boolean> {
		const isExistSqlData = await sqlConnection.statement(
			`SELECT 1 FROM "${this._schema}"."${this.versionTableName}" ` +
			`WHERE "version" = $1`
		).executeScalarOrNull(executionContext, version);

		if (isExistSqlData === null) { return false; }
		if (isExistSqlData.asInteger !== 1) { throw new FSqlMigrationManager.MigrationException("Unexpected SQL result"); }

		return true;
	}

	protected async _isVersionTableExist(executionContext: FExecutionContext, sqlConnection: FSqlConnection): Promise<boolean> {
		const isExistSqlData = await sqlConnection.statement(
			`SELECT 1 FROM "pg_catalog"."pg_tables" WHERE "schemaname" != 'pg_catalog' AND "schemaname" != 'information_schema' AND "schemaname" = $1 AND "tablename" = $2`
		).executeScalarOrNull(executionContext, this._schema, this.versionTableName);

		if (isExistSqlData === null) { return false; }
		if (isExistSqlData.asInteger !== 1) { throw new FSqlMigrationManager.MigrationException("Unexpected SQL result"); }

		return true;
	}

	protected async _removeVersionLog(executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string): Promise<void> {
		await sqlConnection.statement(`
			DELETE FROM "${this._schema}"."${this.versionTableName}_rollback_script"
			WHERE "version_id" = (
				SELECT "id"
				FROM "${this._schema}"."${this.versionTableName}"
				WHERE "version" = $1
			)
		`).execute(executionContext, version);

		await sqlConnection.statement(
			`DELETE FROM "${this._schema}"."${this.versionTableName}" ` +
			`WHERE "version" = $1`
		).execute(executionContext, version);
	}

	protected async _getRollbackScripts(executionContext: FExecutionContext, sqlConnection: FSqlConnection, version: string): Promise<Array<FSqlMigrationSources.Script>> {

		const sqlRecords: ReadonlyArray<FSqlResultRecord> = await sqlConnection
			.statement(`
				SELECT "id", "name", "kind", "file", "content"
				FROM "__migration_rollback_script"
				WHERE "version_id" = (SELECT "id" FROM "__migration" WHERE "version" = $1)
			`)
			.executeQuery(executionContext, version);

		const scripts: Array<FSqlMigrationSources.Script> = sqlRecords.map(sqlRecord => {
			const id: number = sqlRecord.get("id").asInteger;
			const name: string = sqlRecord.get("name").asString;
			const file: string = sqlRecord.get("file").asString;
			const content: string = sqlRecord.get("content").asString;
			const kindStr: string = sqlRecord.get("kind").asString;

			let kind: FSqlMigrationSources.Script.Kind;
			switch (kindStr) {
				case FSqlMigrationSources.Script.Kind.JAVASCRIPT:
				case FSqlMigrationSources.Script.Kind.SQL:
				case FSqlMigrationSources.Script.Kind.UNKNOWN:
					kind = kindStr;
					break;
				default:
					throw new FExceptionInvalidOperation(`Cannot read a script (id:${id}) from database due not supported kind '${kindStr}'.`);
			}

			return new FSqlMigrationSources.Script(name, kind, file, content);
		});

		return scripts;
	}

	protected async _verifyVersionTableStructure(executionContext: FExecutionContext, sqlConnection: FSqlConnection): Promise<void> {
		const isExist = await this._isVersionTableExist(executionContext, sqlConnection);
		if (isExist === false) { throw new FSqlMigrationManager.MigrationException(`The database does not have version table: ${this.versionTableName}`); }

		// TODO check columns
		// It is hard to check without schema name
		// SELECT * FROM information_schema.columns WHERE table_schema = '????' AND table_name = '${this.versionTableName}'
	}

	protected async _listVersions(executionContext: FExecutionContext, sqlConnection: FSqlConnection): Promise<Array<string>> {
		// get the version SQL rows as an array
		const sqlRecords: ReadonlyArray<FSqlResultRecord> = await sqlConnection
			.statement(`SELECT "version" FROM "__migration"`)
			.executeQuery(executionContext);

		const versions: Array<string> = sqlRecords.map(sqlRecord => sqlRecord.get("version").asString);

		return versions;
	}
}

export namespace FSqlMigrationManagerPostgres {

	export interface Opts extends FSqlMigrationManager.Opts {
		readonly sqlConnectionFactory: FSqlConnectionFactoryPostgres;
	}
}

