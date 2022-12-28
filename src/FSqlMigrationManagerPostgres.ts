import {
	FExecutionContext,
	FSqlConnection
} from "@freemework/common";

import { FSqlMigrationManager } from "@freemework/sql.misc.migration";

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

		await sqlProvider.statement(
			`CREATE TABLE "${this.versionTableName}" (` +
			`"version" VARCHAR(64) NOT NULL PRIMARY KEY, ` +
			`"utc_deployed_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT(now() AT TIME ZONE 'utc'), ` +
			`"log" TEXT NOT NULL`
			+ `)`
		).execute(executionContext);
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
		await sqlConnection.statement(
			`DELETE FROM "${this._schema}"."${this.versionTableName}" ` +
			`WHERE "version" = $1`
		).execute(executionContext, version);
	}


	protected async _verifyVersionTableStructure(executionContext: FExecutionContext, sqlConnection: FSqlConnection): Promise<void> {
		const isExist = await this._isVersionTableExist(executionContext, sqlConnection);
		if (isExist === false) { throw new FSqlMigrationManager.MigrationException(`The database does not have version table: ${this.versionTableName}`); }

		// TODO check columns
		// It is hard to check without schema name
		// SELECT * FROM information_schema.columns WHERE table_schema = '????' AND table_name = '${this.versionTableName}'
	}
}

export namespace FSqlMigrationManagerPostgres {

	export interface Opts extends FSqlMigrationManager.Opts {
		readonly sqlConnectionFactory: FSqlConnectionFactoryPostgres;
	}
}
