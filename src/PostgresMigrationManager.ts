import {
	FExecutionContext,
	FSqlProvider
} from "@freemework/common";

import { FMigrationManager } from "@freemework/sql.misc.migration";

import { PostgresProviderFactory } from "./PostgresProviderFactory";

export class PostgresMigrationManager extends FMigrationManager {
	private readonly _schema: string;

	public constructor(opts: PostgresMigrationManager.Opts) {
		super(opts);
		this._schema = opts.sqlProviderFactory.defaultSchema;
	}

	public async getCurrentVersion(executionContext: FExecutionContext): Promise<string | null> {
		return await this.sqlProviderFactory.usingProvider(executionContext, async (FSqlProvider: FSqlProvider) => {

			const isExist = await this._isVersionTableExist(executionContext, FSqlProvider);
			if (isExist === false) { return null; }

			await this._verifyVersionTableStructure(executionContext, FSqlProvider);

			const versionData = await FSqlProvider.statement(
				`SELECT "version" FROM "${this.versionTableName}" ORDER BY "version" DESC LIMIT 1`
			).executeScalarOrNull(executionContext);

			if (versionData === null) {
				return null;
			}

			return versionData.asString;
		});
	}

	protected async _createVersionTable(executionContext: FExecutionContext, sqlProvider: FSqlProvider): Promise<void> {
		await sqlProvider.statement(`CREATE SCHEMA IF NOT EXISTS "${this._schema}"`).execute(executionContext);

		const tables = await sqlProvider.statement(
			`SELECT "tablename" FROM "pg_catalog"."pg_tables" WHERE "schemaname" != 'pg_catalog' AND "schemaname" != 'information_schema' AND "schemaname" = $1 AND "tablename" != 'emptytestflag'`
		).executeQuery(executionContext, this._schema);
		if (tables.length > 0) {
			const tablesString = tables.slice(0, 5).map(sqlData => sqlData.get(0).asString).join(", ") + "..";
			throw new FMigrationManager.MigrationException(`Your database has tables: ${tablesString}. Create Version Table allowed only for an empty database. Please create Version Table yourself.`);
		}

		const views = await sqlProvider.statement(
			`SELECT "viewname" FROM "pg_catalog"."pg_views" WHERE "schemaname" != 'pg_catalog' AND "schemaname" != 'information_schema' AND "schemaname" = $1`
		).executeQuery(executionContext, this._schema);
		if (views.length > 0) {
			const viewsString = views.slice(0, 5).map(sqlData => sqlData.get(0).asString).join(", ") + "..";
			throw new FMigrationManager.MigrationException(`Your database has views: ${viewsString}. Create Version Table allowed only for an empty database. Please create Version Table yourself.`);
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
		executionContext: FExecutionContext, FSqlProvider: FSqlProvider, version: string, logText: string
	): Promise<void> {
		await FSqlProvider.statement(
			`INSERT INTO "${this.versionTableName}"("version", "log") VALUES($1, $2)`
		).execute(executionContext, version, logText);
	}

	protected async _isVersionLogExist(executionContext: FExecutionContext, FSqlProvider: FSqlProvider, version: string): Promise<boolean> {
		const isExistSqlData = await FSqlProvider.statement(
			`SELECT 1 FROM "${this._schema}"."${this.versionTableName}" ` +
			`WHERE "version" = $1`
		).executeScalarOrNull(executionContext, version);

		if (isExistSqlData === null) { return false; }
		if (isExistSqlData.asInteger !== 1) { throw new FMigrationManager.MigrationException("Unexpected SQL result"); }

		return true;
	}

	protected async _isVersionTableExist(executionContext: FExecutionContext, FSqlProvider: FSqlProvider): Promise<boolean> {
		const isExistSqlData = await FSqlProvider.statement(
			`SELECT 1 FROM "pg_catalog"."pg_tables" WHERE "schemaname" != 'pg_catalog' AND "schemaname" != 'information_schema' AND "schemaname" = $1 AND "tablename" = $2`
		).executeScalarOrNull(executionContext, this._schema, this.versionTableName);

		if (isExistSqlData === null) { return false; }
		if (isExistSqlData.asInteger !== 1) { throw new FMigrationManager.MigrationException("Unexpected SQL result"); }

		return true;
	}

	protected async _removeVersionLog(executionContext: FExecutionContext, FSqlProvider: FSqlProvider, version: string): Promise<void> {
		await FSqlProvider.statement(
			`DELETE FROM "${this._schema}"."${this.versionTableName}" ` +
			`WHERE "version" = $1`
		).execute(executionContext, version);
	}


	protected async _verifyVersionTableStructure(executionContext: FExecutionContext, FSqlProvider: FSqlProvider): Promise<void> {
		const isExist = await this._isVersionTableExist(executionContext, FSqlProvider);
		if (isExist === false) { throw new FMigrationManager.MigrationException(`The database does not have version table: ${this.versionTableName}`); }

		// TODO check columns
		// It is hard to check without schema name
		// SELECT * FROM information_schema.columns WHERE table_schema = '????' AND table_name = '${this.versionTableName}'
	}
}

export namespace PostgresMigrationManager {

	export interface Opts extends FMigrationManager.Opts {
		readonly sqlProviderFactory: PostgresProviderFactory;
	}
}
