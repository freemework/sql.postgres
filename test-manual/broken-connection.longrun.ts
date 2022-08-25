/*
// Launch:
//   node --require=ts-node/register test/broken-connection.longrun.ts
*/


import {
	FException,
	FExecutionContext,
	FLogger,
	Fsleep, Fusing
} from "@freemework/common";

import { FSqlProviderFactoryPostgres } from "../src";

function getOpts(): FSqlProviderFactoryPostgres.Opts {
	function parseDbServerUrl(url: string): URL {
		try {
			return new URL(url);
		} catch (e) {
			const ex: FException = FException.wrapIfNeeded(e);
			throw new Error(`Wrong TEST_DB_URL = ${url}. ${ex.message}.`);
		}
	}

	if ("TEST_DB_URL" in process.env) {
		const urlStr = process.env.TEST_DB_URL as string;
		switch (urlStr) {
			case "postgres://": {
				const host = "localhost";
				const port = 5432;
				const user = "devuser";
				const postgresUrl = new URL(`postgres://${user}@${host}:${port}/devdb`);
				return { url: postgresUrl };
			}
		}

		const url = parseDbServerUrl(urlStr);
		switch (url.protocol) {
			case "postgres:": return { url };
			default:
				throw new Error(`Not supported DB Server protocol = ${process.env.TEST_DB_URL}`);
		}
	} else {
		throw new Error("TEST_DB_URL environment is not defined. Please set the variable to use these tests.");
	}
}

(async function main() {
	await Fusing(
		FExecutionContext.Empty,
		() => new FSqlProviderFactoryPostgres(getOpts()),

		async (cancellationToken, FSqlProviderFactory) => {
			await FSqlProviderFactory.usingProvider(cancellationToken, async (FSqlProvider) => {
				return (await FSqlProvider.statement("SELECT 1").executeScalar(cancellationToken)).asInteger;
			});

			console.log("First query was completed. Please disconnect and connect your network adapter to force terminate SQL connection. Expectation no any unhandled errors.");
			console.log("Sleeping 30 seconds...");
			await Fsleep(cancellationToken, 30000);

			await FSqlProviderFactory.usingProvider(cancellationToken, async (FSqlProvider) => {
				return (await FSqlProvider.statement("SELECT 1").executeScalar(cancellationToken)).asInteger;
			});
			console.log("Second query was completed.");
		}
	);

})().catch(console.error);
