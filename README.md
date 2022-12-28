# Freemework's PostgreSQL Facade
[![npm version badge](https://img.shields.io/npm/v/@freemework/sql.postgres.svg)](https://www.npmjs.com/package/@freemework/sql.postgres)
[![downloads badge](https://img.shields.io/npm/dm/@freemework/sql.postgres.svg)](https://www.npmjs.org/package/@freemework/sql.postgres)
[![commit activity badge](https://img.shields.io/github/commit-activity/m/freemework/sql.postgres)](https://github.com/freemework/sql.postgres/pulse)
[![last commit badge](https://img.shields.io/github/last-commit/freemework/sql.postgres)](https://github.com/freemework/sql.postgres/graphs/commit-activity)

## Version table
```sql
CREATE TABLE "__dbVersion" (
	"version" VARCHAR(64) NOT NULL PRIMARY KEY,
	"utc_deployed_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
	"log" TEXT NOT NULL
)
```
NOTE: Name of table may be overridden via migration's opts

## Connection URL

### Format

```
postgres://[${user}[:${password}]]@${host}[:${port}]/${databaseName}[?app=${applicationName}&schema=${defaultSchema}]
postgres+ssl://[${user}[:${password}]]@${host}[:${port}]/${databaseName}[?app=${applicationName}&schema=${defaultSchema}]
```
TBD: Example URL for unix socket

### Examples

#### Localhost

```
postgres://localhost:5432/postgres
```

#### Remote PostgreSQL server `my_pg_host` with SSL prefer mode (no certificate validation, just for encryption)

```
postgres+ssl://my_pg_host:5432/postgres
```

Note: For full SSL mode you need to pass `opts.ssl` programmatically. Passing certificates via URL does not supported.

## Development Notes

### Postgres inside Docker

#### Start

```bash
docker kill pgdevdb; docker rm pgdevdb; docker run --name pgdevdb --rm --publish 5432:5432 --detach zxteamorg/devel.postgres-13:20210703
```

#### Start + run tests

```bash
docker kill pgdevdb; docker rm pgdevdb; docker run --name pgdevdb --rm --publish 5432:5432 --detach zxteamorg/devel.postgres-13:20210703; sleep 3; npm run test:only
```
