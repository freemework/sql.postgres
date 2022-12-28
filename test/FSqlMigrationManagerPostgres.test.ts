import { FDecimal, FExecutionContext, FLogger } from "@freemework/common";
import { FDecimalBackendBigNumber } from "@freemework/decimal.bignumberjs";
import { FSqlMigrationSources } from "@freemework/sql.misc.migration";

import { assert } from "chai";
import { PendingSuiteFunction, Suite, SuiteFunction } from "mocha";
import * as path from "path";

import { } from "../src";
import { FSqlConnectionFactoryPostgres } from "../src/FSqlConnectionFactoryPostgres";
import { FSqlMigrationManagerPostgres } from "../src/FSqlMigrationManagerPostgres";

const { myDescribe, TEST_DB_URL } = (function (): {
	myDescribe: PendingSuiteFunction | SuiteFunction;
	TEST_DB_URL: string | null
} {
	let { TEST_DB_URL: testDbUrl } = process.env;

	if (!testDbUrl) {
		console.warn(`The tests ${__filename} are skipped due TEST_DB_URL is not set`);
		return { myDescribe: describe.skip, TEST_DB_URL: null };
	}

	switch (testDbUrl) {
		case "postgres://": {
			const host = "localhost";
			const port = 5432;
			const user = "postgres";
			testDbUrl = `postgres://${user}@${host}:${port}/devdb`;
			return Object.freeze({ myDescribe: describe, TEST_DB_URL: testDbUrl });
		}
	}

	let url: URL;
	try { url = new URL(testDbUrl); } catch (e) {
		console.warn(`The tests ${__filename} are skipped due TEST_DB_URL has wrong value. Expected URL like postgres://testuser:testpwd@127.0.0.1:5432/db`);
		return Object.freeze({ myDescribe: describe.skip, TEST_DB_URL: testDbUrl });
	}

	switch (url.protocol) {
		case "postgres:":
		case "postgres+ssl:":
			return Object.freeze({ myDescribe: describe, TEST_DB_URL: testDbUrl });
		default: {
			console.warn(`The tests ${__filename} are skipped due TEST_DB_URL has wrong value. Unsupported protocol: ${url.protocol}`);
			return Object.freeze({ myDescribe: describe.skip, TEST_DB_URL: testDbUrl });
		}
	}
})();

const timestamp = Date.now();

myDescribe(`FSqlMigrationManagerPostgres (schema:migration_${timestamp})`, function (this: Suite) {

	before(() => {
		FDecimal.configure(new FDecimalBackendBigNumber(12, FDecimal.RoundMode.Trunc));
	});
	after(() => {
		(FDecimal as any)._cfg = null
	});


	it("Migrate to latest version (omit targetVersion)", async () => {
		const constructorLogger = FLogger.create(this.title);

		const sqlConnectionFactory = new FSqlConnectionFactoryPostgres({
			url: new URL(TEST_DB_URL!), defaultSchema: `migration_${timestamp}`, log: constructorLogger
		});
		await sqlConnectionFactory.init(FExecutionContext.Default);
		try {
			const migrationSources: FSqlMigrationSources = await FSqlMigrationSources.loadFromFilesystem(
				FExecutionContext.Default,
				path.normalize(path.join(__dirname, "..", "test.files", "MigrationManager_1"))
			);

			const manager = new FSqlMigrationManagerPostgres({
				migrationSources, sqlConnectionFactory
			});

			await manager.install(FExecutionContext.Default);

		} finally {
			await sqlConnectionFactory.dispose();
		}
	});
});
