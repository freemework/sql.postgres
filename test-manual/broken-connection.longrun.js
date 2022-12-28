"use strict";
/*
// Launch:
//   node --require=ts-node/register test/broken-connection.longrun.ts
*/
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@freemework/common");
const src_1 = require("../src");
function getOpts() {
    function parseDbServerUrl(url) {
        try {
            return new URL(url);
        }
        catch (e) {
            const ex = common_1.FException.wrapIfNeeded(e);
            throw new Error(`Wrong TEST_DB_URL = ${url}. ${ex.message}.`);
        }
    }
    if ("TEST_DB_URL" in process.env) {
        const urlStr = process.env.TEST_DB_URL;
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
    }
    else {
        throw new Error("TEST_DB_URL environment is not defined. Please set the variable to use these tests.");
    }
}
(async function main() {
    await (0, common_1.Fusing)(common_1.FExecutionContext.Empty, () => new src_1.FSqlConnectionFactoryPostgres(getOpts()), async (cancellationToken, FSqlProviderFactory) => {
        await FSqlProviderFactory.usingProvider(cancellationToken, async (FSqlProvider) => {
            return (await FSqlProvider.statement("SELECT 1").executeScalar(cancellationToken)).asInteger;
        });
        console.log("First query was completed. Please disconnect and connect your network adapter to force terminate SQL connection. Expectation no any unhandled errors.");
        console.log("Sleeping 30 seconds...");
        await (0, common_1.Fsleep)(cancellationToken, 30000);
        await FSqlProviderFactory.usingProvider(cancellationToken, async (FSqlProvider) => {
            return (await FSqlProvider.statement("SELECT 1").executeScalar(cancellationToken)).asInteger;
        });
        console.log("Second query was completed.");
    });
})().catch(console.error);
//# sourceMappingURL=broken-connection.longrun.js.map