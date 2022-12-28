import {
	FDecimal,
	FExceptionInvalidOperation,
	FExecutionContext,
	FLogger,
	FSqlException,
	FSqlExceptionConstraint,
	FSqlExceptionSyntax,
	FSqlConnection,
	FSqlResultRecord,
} from "@freemework/common";
import { FDecimalBackendBigNumber } from "@freemework/decimal.bignumberjs";
import { FSqlMigrationSources } from "@freemework/sql.misc.migration";

import * as chai from "chai";
import { PendingSuiteFunction, Suite, SuiteFunction } from "mocha";
import * as path from "path";

import { FSqlMigrationManagerPostgres, FSqlConnectionFactoryPostgres } from "../src";

declare global {
	namespace Chai {
		interface Assert {
			equalBytes(val: Uint8Array, exp: Uint8Array, msg?: string): void;
		}
	}
}

chai.use(require("chai-datetime"));
chai.use(function (c, u) {
	const a = c.assert;
	a.equalBytes = function (actual: Uint8Array, expected: Uint8Array, msg?: string) {
		const message = (msg === null || msg === undefined) ?
			("expected " + actual.toString() + " to equal " + expected.toString())
			: msg;
		assert.equal(actual.length, expected.length, message);
		const len = actual.length;
		for (let index = 0; index < len; ++index) {
			const actualPart = actual[index];
			const expectedPart = expected[index];
			assert.equal(actualPart, expectedPart, message);
		}
	};
});

const { assert } = chai;


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
			const user = "devadmin";
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

myDescribe(`PostgreSQL Tests (schema:general_test_1_${timestamp})`, function () {
	let sqlConnectionFactory: FSqlConnectionFactoryPostgres;
	let sqlProvider: FSqlConnection | null = null;

	function getFSqlProvider(): FSqlConnection {
		if (!sqlProvider) { throw new Error(); }
		return sqlProvider;
	}


	before(async function () {
		const constructorLogger: FLogger = FLogger.create(`general_test_1_${timestamp}`);

		FDecimal.configure(new FDecimalBackendBigNumber(22, FDecimal.RoundMode.Ceil));

		sqlConnectionFactory = new FSqlConnectionFactoryPostgres({
			url: new URL(TEST_DB_URL!),
			defaultSchema: `general_test_1_${timestamp}`,
			log: constructorLogger
		});
		await sqlConnectionFactory.init(FExecutionContext.Default);
		try {
			const migrationSources: FSqlMigrationSources = await FSqlMigrationSources.loadFromFilesystem(
				FExecutionContext.Default,
				path.normalize(path.join(__dirname, "..", "test.files", "general"))
			);

			const manager = new FSqlMigrationManagerPostgres({
				migrationSources, sqlConnectionFactory
			});

			await manager.install(FExecutionContext.Default);

		} catch (e) {
			await sqlConnectionFactory.dispose();
			throw e;
		}
	});
	after(async function () {
		if (sqlConnectionFactory) {
			await sqlConnectionFactory.dispose();
		}
		(FDecimal as any)._cfg = null
	});

	beforeEach(async function () {
		// runs before each test in this block
		sqlProvider = await sqlConnectionFactory.create(FExecutionContext.Default);
	});
	afterEach(async function () {
		// runs after each test in this block
		if (sqlProvider !== null) {
			await sqlProvider.dispose();
			sqlProvider = null;
		}
	});

	it("executeScalar should raise error with text 'does not support multiset request yet' for MultiSet SQL Response", async function () {
		let expectedError: any;

		try {
			const result = await getFSqlProvider()
				.statement("SELECT * FROM sp_multi_fetch_ints()")
				.executeScalar(FExecutionContext.Default);
		} catch (err) {
			expectedError = err;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.include(expectedError.message, "does not support multiset request yet");
	});
	it("Read TRUE as boolean through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT TRUE AS c0, FALSE AS c1 UNION ALL SELECT FALSE, FALSE")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBoolean, true);
	});
	it("Read True as boolean through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT True AS c0, 0 AS c1 UNION ALL SELECT False, 0")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBoolean, true);
	});
	it("Read True as boolean through executeScalar (Stored Procedure)", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT * FROM sp_contains('one')")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBoolean, true);
	});
	it("Read False as boolean through executeScalar (Stored Procedure)", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT * FROM sp_contains('none')")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBoolean, false);
	});
	it("Read FALSE as boolean through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT FALSE AS c0, TRUE AS c1 UNION ALL SELECT TRUE, TRUE")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBoolean, false);
	});
	it("Read False as boolean through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT False AS c0, 1 AS c1 UNION ALL SELECT True, 1")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBoolean, false);
	});
	it("Read NULL as nullable boolean through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT NULL AS c0, 1 AS c1 UNION ALL SELECT 1, 1")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBooleanNullable, null);
	});
	it("Read financial through executeSingle", async function () {
		const result = await getFSqlProvider()
			.statement('SELECT "varchar","int","decimal" FROM tb_financial WHERE "id" = 1')
			.executeSingle(FExecutionContext.Default);
		assert.equal(result.get("varchar").asString, "42.42");
		assert.equal(result.get("int").asInteger, 42);
		const float = result.get("decimal").asNumber;
		assert.equal(float, 424242424242424242424242.424242424242424242421111);

		assert.equal(result.get("varchar").asDecimal.toString(), "42.42");
		assert.equal(result.get("int").asDecimal.toString(), "42");
		assert.equal(
			result.get("decimal").asDecimal.toString(),
			"424242424242424242424242.4242424242424242424212", // ceil rounding
			"Should ceil 2 precision digits according setting fractionalDigits: 22"
		);
	});
	it("Read true from JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 1")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asString, "test");
	});
	it("Read true from JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 2")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asInteger, 42);
	});
	it("Read true from JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 3")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asBoolean, true);
	});
	it("Read false from JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 4")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asBoolean, false);
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 1")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asObject, "test");
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 2")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asObject, 42);
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 3")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asObject, true);
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 4")
			.executeScalar(FExecutionContext.Default);
		assert.equal(result.asObject, false);
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 5")
			.executeScalar(FExecutionContext.Default);
		assert.deepEqual(result.asObject, [1, 2, 3]);
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 6")
			.executeScalar(FExecutionContext.Default);
		assert.deepEqual(result.asObject, { "a": 42 });
	});
	it("Read JSONB through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT data FROM tb_jsonb_test WHERE id = 7")
			.executeScalar(FExecutionContext.Default);
		assert.deepEqual(result.asObjectNullable, null);
	});


	it("Read \"Hello, world!!!\" as string through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT 'Hello, world!!!' AS c0, 'stub12' AS c1 UNION ALL SELECT 'stub21', 'stub22'")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asString, "Hello, world!!!");
	});
	it("Read NULL as nullable string through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT NULL AS c0, 'stub12' AS c1 UNION ALL SELECT 'stub21', 'stub22'")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asStringNullable, null);
	});

	it("Read 11 as number through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT 11 AS c0, 12 AS c1 UNION SELECT 21, 22")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asNumber, 11);
	});
	it("Read NULL as nullable number through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT NULL AS c0, 12 AS c1 UNION ALL SELECT 21, 22")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asNumberNullable, null);
	});

	it("Read 11.42 as FinancialLike through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT 11.42 AS c0, 12 AS c1 UNION SELECT 21, 22")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		const v = result.asDecimal;
		assert.equal(v.toString(), "11.42");
	});
	it("Read '11.42' as FinancialLike through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT '11.42' AS c0, '12' AS c1 UNION SELECT '21', '22'")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		const v = result.asDecimal;
		assert.equal(v.toString(), "11.42");
	});

	it("Read 2018-05-01T12:01:03.345 as Date through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement(
				"SELECT '2018-05-01 12:01:02.345'::TIMESTAMP AS c0, now() AT TIME ZONE 'utc' AS c1 UNION ALL SELECT now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc'")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equalDate(result.asDate, new Date(2018, 4/*May month = 4*/, 1, 12, 1, 2, 345));
	});
	it("Read NULL as nullable Date through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement(
				"SELECT NULL AS c0, "
				+ " now() AT TIME ZONE 'utc' AS c1 UNION ALL SELECT now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc'")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asDateNullable, null);
	});

	it("Read 0007FFF as Uint8Array through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT '\\0007FFF'::bytea AS c0, '\\000'::bytea AS c1 UNION ALL SELECT '\\000'::bytea, '\\000'::bytea")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equalBytes(result.asBinary, new Uint8Array([0, 55, 70, 70, 70]));
	});
	it("Read NULL as Uint8Array through executeScalar", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT NULL AS c0, '\\000'::bytea AS c1 UNION ALL SELECT '\\000'::bytea, '\\000'::bytea")
			.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
		assert.equal(result.asBinaryNullable, null);
	});

	it("Read booleans through executeQuery", async function () {
		const resultArray = await getFSqlProvider()
			.statement("SELECT True AS c0, False AS c1 UNION ALL SELECT False, False UNION ALL SELECT True, False")
			.executeQuery(FExecutionContext.Default);
		assert.instanceOf(resultArray, Array);
		assert.equal(resultArray.length, 3);
		assert.equal(resultArray[0].get("c0").asBoolean, true);
		assert.equal(resultArray[0].get("c1").asBoolean, false);
		assert.equal(resultArray[1].get("c0").asBoolean, false);
		assert.equal(resultArray[1].get("c1").asBoolean, false);
		assert.equal(resultArray[2].get("c0").asBoolean, true);
		assert.equal(resultArray[2].get("c1").asBoolean, false);
	});
	it("Read strings through executeQuery", async function () {
		const resultArray = await getFSqlProvider()
			.statement("SELECT 'one' AS c0, 'two' AS c1 UNION ALL SELECT 'three'" +
				", 'four' UNION ALL SELECT 'five', 'six'")
			.executeQuery(FExecutionContext.Default);
		assert.instanceOf(resultArray, Array);
		assert.equal(resultArray.length, 3);
		assert.equal(resultArray[0].get("c0").asString, "one");
		assert.equal(resultArray[0].get("c1").asString, "two");
		assert.equal(resultArray[1].get("c0").asString, "three");
		assert.equal(resultArray[1].get("c1").asString, "four");
		assert.equal(resultArray[2].get("c0").asString, "five");
		assert.equal(resultArray[2].get("c1").asString, "six");
	});
	it("Read strings through executeQuery (Stored Proc)", async function () {
		const resultArray = await getFSqlProvider()
			.statement("SELECT * FROM sp_single_fetch()")
			.executeQuery(FExecutionContext.Default);

		assert.instanceOf(resultArray, Array);
		assert.equal(resultArray.length, 3);
		assert.equal(resultArray[0].get("varchar").asString, "one");
		assert.equal(resultArray[1].get("varchar").asString, "two");
		assert.equal(resultArray[2].get("varchar").asString, "three");
	});
	it("executeQuery should raise error with text 'does not support multiset request yet' for MultiSet SQL Response", async function () {
		let expectedError: any;

		try {
			await getFSqlProvider()
				.statement("SELECT * FROM sp_multi_fetch()")
				.executeQuery(FExecutionContext.Default);
		} catch (err) {
			expectedError = err;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.include(expectedError.message, "does not support multiset request yet");
	});
	it("Read empty result through executeQuery (SELECT)", async function () {
		const resultArray = await getFSqlProvider()
			.statement("SELECT * FROM \"tb_1\" WHERE 1=2")
			.executeQuery(FExecutionContext.Default);

		assert.instanceOf(resultArray, Array);
		assert.equal(resultArray.length, 0);
	});
	it("Read empty result through executeQuery (Stored Proc)", async function () {
		const resultArray = await getFSqlProvider()
			.statement("SELECT * FROM sp_empty_fetch()")
			.executeQuery(FExecutionContext.Default);

		assert.instanceOf(resultArray, Array);
		assert.equal(resultArray.length, 0);
	});
	it("Call non-existing stored procedure", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider().statement("SELECT * FROM sp_non_existent()").executeQuery(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlException);
		assert.include(expectedError.message, "sp_non_existent() does not exist");
	});

	it("Should be able to create temporary table", async function () {
		const tempTable = await getFSqlProvider().createTempTable(
			FExecutionContext.Default,
			"tb_1", // Should override(hide) existing table
			"id SERIAL, title VARCHAR(32) NOT NULL, value SMALLINT NOT NULL, PRIMARY KEY (id)"
		);
		try {
			await getFSqlProvider().statement("INSERT INTO tb_1(title, value) VALUES('test title 1', $1)").execute(FExecutionContext.Default, 1);
			await getFSqlProvider().statement("INSERT INTO tb_1(title, value) VALUES('test title 2', $1)").execute(FExecutionContext.Default, 2);

			const resultArray = await getFSqlProvider().statement("SELECT title, value FROM tb_1").executeQuery(FExecutionContext.Default);

			assert.instanceOf(resultArray, Array);
			assert.equal(resultArray.length, 2);
			assert.equal(resultArray[0].get("title").asString, "test title 1");
			assert.equal(resultArray[0].get("value").asNumber, 1);
			assert.equal(resultArray[1].get("title").asString, "test title 2");
			assert.equal(resultArray[1].get("value").asNumber, 2);
		} finally {
			await tempTable.dispose();
		}

		// tslint:disable-next-line:max-line-length
		const resultArrayAfterDestoroyTempTable = await getFSqlProvider().statement("SELECT * FROM tb_1").executeQuery(FExecutionContext.Default);

		assert.instanceOf(resultArrayAfterDestoroyTempTable, Array);
		assert.equal(resultArrayAfterDestoroyTempTable.length, 3);
		assert.equal(resultArrayAfterDestoroyTempTable[0].get("int").asNumber, 1);
		assert.equal(resultArrayAfterDestoroyTempTable[0].get("varchar").asString, "one");
	});

	it("Should be able to pass null into executeScalar args", async function () {
		const result1 = await getFSqlProvider()
			.statement("SELECT 1 WHERE $1::int IS NULL")
			.executeScalar(FExecutionContext.Default, null);
		assert.equal(result1.asInteger, 1);
	});

	it("Should be able to pass null into executeQuery args", async function () {
		const result2 = await getFSqlProvider()
			.statement("SELECT 1 WHERE $1::int IS null;")
			.executeQuery(FExecutionContext.Default, 0);
		assert.equal(result2.length, 0);
	});
	it("Should be able to pass FDecimal into query args", async function () {
		const result1 = await getFSqlProvider()
			.statement("SELECT $1")
			.executeScalar(FExecutionContext.Default, FDecimal.parse("42.123"));
		assert.equal(result1.asString, "42.123");
	});

	it("Read two Result Sets via sp_multi_fetch", async function () {
		const resultSets = await getFSqlProvider()
			.statement("SELECT * FROM sp_multi_fetch()")
			.executeQueryMultiSets(FExecutionContext.Default);
		assert.isArray(resultSets);
		assert.equal(resultSets.length, 2, "The procedure 'sp_multi_fetch' should return two result sets");

		{ // Verify first result set
			const firstResultSet = resultSets[0];
			assert.isArray(firstResultSet);
			assert.equal(firstResultSet.length, 3);
			assert.equal(firstResultSet[0].get("varchar").asString, "one");
			assert.equal(firstResultSet[0].get("int").asInteger, 1);
			assert.equal(firstResultSet[1].get("varchar").asString, "two");
			assert.equal(firstResultSet[1].get("int").asInteger, 2);
			assert.equal(firstResultSet[2].get("varchar").asString, "three");
			assert.equal(firstResultSet[2].get("int").asInteger, 3);
		}

		{ // Verify second result set
			const secondResultSet = resultSets[1];
			assert.isArray(secondResultSet);
			assert.equal(secondResultSet.length, 2);
			assert.equal(secondResultSet[0].get("first_name").asString, "Maxim");
			assert.equal(secondResultSet[0].get("last_name").asString, "Anurin");
			assert.equal(secondResultSet[1].get("first_name").asString, "Serhii");
			assert.equal(secondResultSet[1].get("last_name").asString, "Zghama");
		}
	});
	it("Read result through executeQuery (SELECT) WHERE IN many", async function () {
		const resultArray = await getFSqlProvider()
			.statement("SELECT * FROM \"tb_1\" WHERE int = ANY ($1)")
			.executeQuery(FExecutionContext.Default, [1, 2, 3]);

		assert.instanceOf(resultArray, Array);
		assert.equal(resultArray.length, 3);
	});

	it("Should be able to read TIMESTAMP WITHOUT TIME ZONE", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT ts FROM tb_dates_test WHERE id = 1")
			.executeSingle(FExecutionContext.Default);
		const ts: Date = result.get("ts").asDate;
		assert.equal(ts.getTime(), 1466622000410); // 1466622000410 --> "2016-06-22T19:00:00.410Z"
		assert.equal(ts.toISOString(), "2016-06-22T19:00:00.410Z");
	});
	it("Should be able search between (by AND) TIMESTAMP WITHOUT TIME ZONE", async function () {
		const searchLeftDate: Date = new Date("2016-06-22T19:00:00.409Z");
		const searchRightDate: Date = new Date("2016-06-22T19:00:00.411Z");
		const result = await getFSqlProvider()
			.statement("SELECT ts FROM tb_dates_test WHERE ts > to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE AND ts < to_timestamp($2::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE")
			.executeSingle(FExecutionContext.Default, searchLeftDate.getTime(), searchRightDate.getTime());
		const ts: Date = result.get("ts").asDate;
		assert.equal(ts.getTime(), 1466622000410); // 1466622000410 --> "2016-06-22T19:00:00.410Z"
		assert.equal(ts.toISOString(), "2016-06-22T19:00:00.410Z");
	});
	it("Should be able search between (by AND) via spread operator TIMESTAMP WITHOUT TIME ZONE", async function () {
		const searchLeftDate: Date = new Date("2016-06-22T19:00:00.409Z");
		const searchRightDate: Date = new Date("2016-06-22T19:00:00.411Z");
		const result = await getFSqlProvider()
			.statement("SELECT ts FROM tb_dates_test WHERE ts > to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE AND ts < to_timestamp($2::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE")
			.executeSingle(FExecutionContext.Default, ...[searchLeftDate.getTime(), searchRightDate.getTime()]);
		const ts: Date = result.get("ts").asDate;
		assert.equal(ts.getTime(), 1466622000410); // 1466622000410 --> "2016-06-22T19:00:00.410Z"
		assert.equal(ts.toISOString(), "2016-06-22T19:00:00.410Z");
	});
	it("Should be able search between (by BETWEEN) TIMESTAMP WITHOUT TIME ZONE", async function () {
		const searchLeftDate: Date = new Date("2016-06-22T19:00:00.409Z");
		const searchRightDate: Date = new Date("2016-06-22T19:00:00.411Z");
		const result = await getFSqlProvider()
			.statement("SELECT ts FROM tb_dates_test WHERE ts BETWEEN to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE AND to_timestamp($2::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE")
			.executeSingle(FExecutionContext.Default, searchLeftDate.getTime(), searchRightDate.getTime());
		const ts: Date = result.get("ts").asDate;
		assert.equal(ts.getTime(), 1466622000410); // 1466622000410 --> "2016-06-22T19:00:00.410Z"
		assert.equal(ts.toISOString(), "2016-06-22T19:00:00.410Z");
	});
	it("Should raise exception when read TIMESTAMP WITH TIME ZONE", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT tstz FROM tb_dates_test WHERE id = 1")
			.executeSingle(FExecutionContext.Default);
		let expectedError: any;
		try {
			const stub = result.get("tstz").asDate;
		} catch (e) {
			expectedError = e;
		}
		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FExceptionInvalidOperation);
		assert.include(expectedError.message, "Right now the library supports TIMESTAMP WITHOUT TIME ZONE");
	});
	it("Should be able insert TIMESTAMP WITHOUT TIME ZONE", async function () {
		const testDate = new Date();

		const insertId = await getFSqlProvider()
			.statement("INSERT INTO tb_dates_test(ts) VALUES(to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE) RETURNING id")
			.executeScalar(FExecutionContext.Default, testDate.getTime());

		const result = await getFSqlProvider()
			.statement("SELECT ts FROM tb_dates_test WHERE id = $1")
			.executeSingle(FExecutionContext.Default, insertId.asInteger);

		const ts: Date = result.get("ts").asDate;
		assert.equal(ts.toISOString(), testDate.toISOString());
	});
	it("Should be able to read 2021-03-28T01:02:25.898542Z", async function () {
		const result = await getFSqlProvider()
			.statement("SELECT acivated_at FROM tb_dates_test2 WHERE id = 1")
			.executeSingle(FExecutionContext.Default);
		const ts: Date = result.get("acivated_at").asDate;
		assert.equal(ts.getTime(), 1616893345898); // 1616893345898 --> "2021-03-28T01:02:25.898Z"
		assert.equal(ts.toISOString(), "2021-03-28T01:02:25.898Z");
	});
	it("Should pass date 2016-06-22T19:00:00.409Z in UTC #1", async function () {
		const searchDate1: Date = new Date("2016-06-22T19:00:00.409Z");
		const row: FSqlResultRecord = await getFSqlProvider()
			.statement("SELECT to_timestamp($1::DOUBLE PRECISION / 1000)::TEXT AS acivated_at_text")
			.executeSingle(FExecutionContext.Default, searchDate1.getTime());
		const acivated_at_text: string = row.get("acivated_at_text").asString;
		assert.equal(acivated_at_text, "2016-06-22 19:00:00.409+00");
	});
	it("Should pass date 2016-06-22T19:00:00.409Z in UTC #2", async function () {
		const searchDate1: Date = new Date("2016-06-22T19:00:00.409Z");
		const row: FSqlResultRecord = await getFSqlProvider()
			.statement("SELECT to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE::TEXT AS acivated_at_text")
			.executeSingle(FExecutionContext.Default, searchDate1.getTime());
		const acivated_at_text: string = row.get("acivated_at_text").asString;
		assert.equal(acivated_at_text, "2016-06-22 19:00:00.409");
	});
	it("Should pass date 2021-03-28T01:02:25.898542Z in UTC #1", async function () {
		const searchDate1: Date = new Date("2021-03-28T01:02:25.898Z");
		const row: FSqlResultRecord = await getFSqlProvider()
			.statement("SELECT to_timestamp($1::DOUBLE PRECISION / 1000)::TEXT AS acivated_at_text")
			.executeSingle(FExecutionContext.Default, searchDate1.getTime());
		const acivated_at_text: string = row.get("acivated_at_text").asString;
		assert.equal(acivated_at_text, "2021-03-28 01:02:25.898+00");
	});
	it("Should pass date 2021-03-28T01:02:25.898542Z in UTC #2", async function () {
		const searchDate1: Date = new Date("2021-03-28T01:02:25.898Z");
		const row: FSqlResultRecord = await getFSqlProvider()
			.statement("SELECT to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE::TEXT AS acivated_at_text")
			.executeSingle(FExecutionContext.Default, searchDate1.getTime());
		const acivated_at_text: string = row.get("acivated_at_text").asString;
		assert.equal(acivated_at_text, "2021-03-28 01:02:25.898");
	});
	it("execute should raise FSqlExceptionSyntax for bad sql command", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("WRONG SQL COMMAND")
				.execute(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionSyntax);
		assert.isDefined(expectedError.innerException);
	});
	it("executeQuery should raise FSqlExceptionSyntax for bad sql command", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("WRONG SQL COMMAND")
				.executeQuery(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionSyntax);
		assert.isDefined(expectedError.innerException);
	});
	it("executeQueryMultiSets should raise FSqlExceptionSyntax for bad sql command", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("WRONG SQL COMMAND")
				.executeQueryMultiSets(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionSyntax);
		assert.isDefined(expectedError.innerException);
	});
	it("executeScalar should raise FSqlExceptionSyntax for bad sql command", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("WRONG SQL COMMAND")
				.executeScalar(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionSyntax);
		assert.isDefined(expectedError.innerException);
	});
	it("executeScalarOrNull should raise FSqlExceptionSyntax for bad sql command", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("WRONG SQL COMMAND")
				.executeScalarOrNull(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionSyntax);
		assert.isDefined(expectedError.innerException);
	});
	it("executeSingle should raise FSqlExceptionSyntax for bad sql command", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("WRONG SQL COMMAND")
				.executeSingle(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionSyntax);
		assert.isDefined(expectedError.innerException);
	});

	it("execute should raise FSqlExceptionConstraint for UNIQUE violation", async function () {
		let expectedError: any;
		try {
			await getFSqlProvider()
				.statement("INSERT INTO tb_1 VALUES ('one', 1)")
				.execute(FExecutionContext.Default);
		} catch (e) {
			expectedError = e;
		}

		assert.isDefined(expectedError);
		assert.instanceOf(expectedError, FSqlExceptionConstraint);
		assert.isDefined(expectedError.innerException);
	});
});


myDescribe(`PostgreSQL Tests via usingProvider (schema:general_test_2_${timestamp})`, function () {
	let sqlConnectionFactory: FSqlConnectionFactoryPostgres;

	before(async function () {
		const constructorLogger = FLogger.create(`general_test_2_${timestamp}`);

		FDecimal.configure(new FDecimalBackendBigNumber(12, FDecimal.RoundMode.Trunc));

		sqlConnectionFactory = new FSqlConnectionFactoryPostgres({
			url: new URL(TEST_DB_URL!), defaultSchema: `general_test_2_${timestamp}`, log: constructorLogger
		});
		await sqlConnectionFactory.init(FExecutionContext.Default);
		try {
			const migrationSources: FSqlMigrationSources = await FSqlMigrationSources.loadFromFilesystem(
				FExecutionContext.Default,
				path.normalize(path.join(__dirname, "..", "test.files", "general"))
			);

			const manager = new FSqlMigrationManagerPostgres({
				migrationSources, sqlConnectionFactory
			});

			await manager.install(FExecutionContext.Default);

		} catch (e) {
			await sqlConnectionFactory.dispose();
			throw e;
		}
	});
	after(async function () {
		if (sqlConnectionFactory) {
			await sqlConnectionFactory.dispose();
		}
		(FDecimal as any)._cfg = null
	});


	it("Read TRUE as boolean through executeScalar", function () {
		return sqlConnectionFactory.usingProvider(FExecutionContext.Default, async (sqlConnection) => {
			const result = await sqlConnection
				.statement("SELECT TRUE AS c0, FALSE AS c1 UNION ALL SELECT FALSE, FALSE")
				.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
			assert.equal(result.asBoolean, true);
		});
	});
});


myDescribe(`PostgreSQL Tests via usingProviderWithTransaction (schema:general_test_3_${timestamp})`, function () {
	let sqlConnectionFactory: FSqlConnectionFactoryPostgres;

	before(async function () {
		const constructorLogger = FLogger.create(`general_test_3_${timestamp}`);

		FDecimal.configure(new FDecimalBackendBigNumber(12, FDecimal.RoundMode.Trunc));

		sqlConnectionFactory = new FSqlConnectionFactoryPostgres({
			url: new URL(TEST_DB_URL!), defaultSchema: `general_test_3_${timestamp}`, log: constructorLogger
		});
		await sqlConnectionFactory.init(FExecutionContext.Default);
		try {
			const migrationSources: FSqlMigrationSources = await FSqlMigrationSources.loadFromFilesystem(
				FExecutionContext.Default,
				path.normalize(path.join(__dirname, "..", "test.files", "general"))
			);

			const manager = new FSqlMigrationManagerPostgres({
				migrationSources, sqlConnectionFactory
			});

			await manager.install(FExecutionContext.Default);

		} catch (e) {
			await sqlConnectionFactory.dispose();
			throw e;
		}
	});
	after(async function () {
		if (sqlConnectionFactory) {
			await sqlConnectionFactory.dispose();
		}
		(FDecimal as any)._cfg = null
	});

	it("Read TRUE as boolean through executeScalar", function () {
		return sqlConnectionFactory.usingProviderWithTransaction(FExecutionContext.Default, async (FSqlConnection) => {
			const result = await FSqlConnection
				.statement("SELECT TRUE AS c0, FALSE AS c1 UNION ALL SELECT FALSE, FALSE")
				.executeScalar(FExecutionContext.Default); // executeScalar() should return first row + first column
			assert.equal(result.asBoolean, true);
		});
	});
});
