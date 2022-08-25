import {
	FCancellationToken,
	FDisposableBase,
	FExceptionAggregate,
	FExceptionArgument,
	FExceptionCancelled,
	FExceptionInvalidOperation,
	FExecutionContext,
	FExecutionContextCancellation,
	FExecutionContextLogger,
	FInitableBase,
	FLogger,
	FSqlProvider,
	FSqlStatementParam,
	FSqlTemporaryTable,
	FSqlData,
	FDecimal,
	FSqlExceptionConstraint,
	FSqlExceptionPermission,
	FSqlExceptionSyntax,
	FSqlException,
	FException,
	FSqlResultRecord,
	FSqlStatement,
	FSqlExceptionNoSuchRecord,
	FSqlProviderFactory
} from "@freemework/common";

import * as _ from "lodash";
import * as pg from "pg";

/**
 * Package oid contains OID constants as defined by the Postgres server.
 * @description Use a query `SELECT concat(typname, ' = ', oid, ',') FROM pg_type WHERE oid < 10000 ORDER BY oid` to generate this enum.
 * @see https://github.com/postgres/postgres/blob/2e4db241bfd3206bad8286f8ffc2db6bbdaefcdf/src/include/catalog/pg_type.dat
 */
const enum PostgresObjectID {
	bool = 16,
	bytea = 17,
	char = 18,
	name = 19,
	int8 = 20,
	int2 = 21,
	int2vector = 22,
	int4 = 23,
	regproc = 24,
	text = 25,
	oid = 26,
	tid = 27,
	xid = 28,
	cid = 29,
	oidvector = 30,
	pg_ddl_command = 32,
	pg_type = 71,
	pg_attribute = 75,
	pg_proc = 81,
	pg_class = 83,
	json = 114,
	xml = 142,
	_xml = 143,
	pg_node_tree = 194,
	_json = 199,
	smgr = 210,
	index_am_handler = 325,
	point = 600,
	lseg = 601,
	path = 602,
	box = 603,
	polygon = 604,
	line = 628,
	_line = 629,
	cidr = 650,
	_cidr = 651,
	float4 = 700,
	float8 = 701,
	abstime = 702,
	reltime = 703,
	tinterval = 704,
	unknown = 705,
	circle = 718,
	_circle = 719,
	money = 790,
	_money = 791,
	macaddr = 829,
	inet = 869,
	_bool = 1000,
	_bytea = 1001,
	_char = 1002,
	_name = 1003,
	_int2 = 1005,
	_int2vector = 1006,
	_int4 = 1007,
	_regproc = 1008,
	_text = 1009,
	_tid = 1010,
	_xid = 1011,
	_cid = 1012,
	_oidvector = 1013,
	_bpchar = 1014,
	_varchar = 1015,
	_int8 = 1016,
	_point = 1017,
	_lseg = 1018,
	_path = 1019,
	_box = 1020,
	_float4 = 1021,
	_float8 = 1022,
	_abstime = 1023,
	_reltime = 1024,
	_tinterval = 1025,
	_polygon = 1027,
	_oid = 1028,
	aclitem = 1033,
	_aclitem = 1034,
	_macaddr = 1040,
	_inet = 1041,
	bpchar = 1042,
	varchar = 1043,
	date = 1082,
	time = 1083,
	timestamp = 1114,
	_timestamp = 1115,
	_date = 1182,
	_time = 1183,
	timestamptz = 1184,
	_timestamptz = 1185,
	interval = 1186,
	_interval = 1187,
	_numeric = 1231,
	pg_database = 1248,
	_cstring = 1263,
	timetz = 1266,
	_timetz = 1270,
	bit = 1560,
	_bit = 1561,
	varbit = 1562,
	_varbit = 1563,
	numeric = 1700,
	refcursor = 1790,
	_refcursor = 2201,
	regprocedure = 2202,
	regoper = 2203,
	regoperator = 2204,
	regclass = 2205,
	regtype = 2206,
	_regprocedure = 2207,
	_regoper = 2208,
	_regoperator = 2209,
	_regclass = 2210,
	_regtype = 2211,
	record = 2249,
	cstring = 2275,
	any = 2276,
	anyarray = 2277,
	void = 2278,
	trigger = 2279,
	language_handler = 2280,
	internal = 2281,
	opaque = 2282,
	anyelement = 2283,
	_record = 2287,
	anynonarray = 2776,
	pg_authid = 2842,
	pg_auth_members = 2843,
	_txid_snapshot = 2949,
	uuid = 2950,
	_uuid = 2951,
	txid_snapshot = 2970,
	fdw_handler = 3115,
	pg_lsn = 3220,
	_pg_lsn = 3221,
	tsm_handler = 3310,
	anyenum = 3500,
	tsvector = 3614,
	tsquery = 3615,
	gtsvector = 3642,
	_tsvector = 3643,
	_gtsvector = 3644,
	_tsquery = 3645,
	regconfig = 3734,
	_regconfig = 3735,
	regdictionary = 3769,
	_regdictionary = 3770,
	jsonb = 3802,
	_jsonb = 3807,
	anyrange = 3831,
	event_trigger = 3838,
	int4range = 3904,
	_int4range = 3905,
	numrange = 3906,
	_numrange = 3907,
	tsrange = 3908,
	_tsrange = 3909,
	tstzrange = 3910,
	_tstzrange = 3911,
	daterange = 3912,
	_daterange = 3913,
	int8range = 3926,
	_int8range = 3927,
	pg_shseclabel = 4066,
	regnamespace = 4089,
	_regnamespace = 4090,
	regrole = 4096,
	_regrole = 4097
}

pg.types.setTypeParser(PostgresObjectID.timestamp as any, function (stringValue) {
	return stringValue;
});


export class FSqlProviderFactoryPostgres extends FInitableBase implements FSqlProviderFactory {
	private readonly _url: URL;
	private readonly _pool: pg.Pool;
	private readonly _defaultSchema: string;

	// This implemenation wrap package https://www.npmjs.com/package/pg
	public constructor(opts: FSqlProviderFactoryPostgres.Opts) {
		super();

		const constructorLogger: FLogger = opts.constructorLogger !== undefined ? opts.constructorLogger : FLogger.None;

		switch (opts.url.protocol) {
			case "postgres:":
			case "postgres+ssl:":
				this._url = opts.url;
				break;
			default:
				throw new FExceptionArgument("Expected URL schema 'postgres:' or 'postgres+ssl:'.", "opts.url");
		}

		constructorLogger.trace("PostgresProviderPoolFactory constructed");

		const poolConfig: pg.PoolConfig = { host: this._url.hostname };

		if (!_.isEmpty(this._url.port)) { poolConfig.port = Number.parseInt(this._url.port); }
		if (!_.isEmpty(this._url.username)) { poolConfig.user = this._url.username; }
		if (!_.isEmpty(this._url.password)) { poolConfig.password = this._url.password; }

		// DB name
		let pathname = this._url.pathname;
		while (pathname.length > 0 && pathname[0] === "/") { pathname = pathname.substring(1); }
		poolConfig.database = pathname;

		// Timeouts
		poolConfig.connectionTimeoutMillis = (opts.connectionTimeoutMillis !== undefined) ? opts.connectionTimeoutMillis : 5000;
		poolConfig.idleTimeoutMillis = (opts.idleTimeoutMillis !== undefined) ? opts.idleTimeoutMillis : 30000;

		// Keep-alive
		poolConfig.keepAlive = (opts.keepAlive !== undefined) ? opts.keepAlive : true;
		poolConfig.keepAliveInitialDelayMillis = (opts.keepAliveInitialDelayMillis !== undefined) ? opts.keepAliveInitialDelayMillis : 5000;

		// App name
		if (!_.isEmpty(opts.applicationName)) {
			poolConfig.application_name = opts.applicationName;
		} else {
			const appNameFromUrl: string | null = this._url.searchParams.get("app");
			if (appNameFromUrl !== null && !_.isEmpty(appNameFromUrl)) {
				poolConfig.application_name = appNameFromUrl;
			}
		}

		const schemaFromUrl: string | null = this._url.searchParams.get("schema");
		this._defaultSchema = opts.defaultSchema !== undefined ?
			opts.defaultSchema :
			schemaFromUrl !== null ? schemaFromUrl : "public";

		// SSL
		if (this._url.protocol === "postgres+ssl:") {
			poolConfig.ssl = {};
			if (opts.ssl !== undefined) {
				if (opts.ssl !== undefined) {
					if (opts.ssl === "prefer") {
						poolConfig.ssl.rejectUnauthorized = false;
						constructorLogger.debug("Using partial secured connection without checking identity (SSL-prefer, no certificate validation).");
					} else {
						poolConfig.ssl.rejectUnauthorized = true;
						constructorLogger.debug("Using full secured connection (with certificate validation).");
						if (opts.ssl.caCert !== undefined) {
							poolConfig.ssl.ca = opts.ssl.caCert;
							constructorLogger.debug("CA certificate was provided.");
						}
						if (opts.ssl.clientCert !== undefined) {
							poolConfig.ssl.cert = opts.ssl.clientCert.cert;
							poolConfig.ssl.key = opts.ssl.clientCert.key;
							constructorLogger.debug("Client certificate was provided.");
						}
					}
				}
			} else {
				poolConfig.ssl.rejectUnauthorized = false;
				constructorLogger.debug("Using partial secured connection without checking identity (SSL-prefer, no certificate validation).");
			}
		} else {
			constructorLogger.debug("Using insecured connection (non-SSL).");
		}

		this._pool = new pg.Pool(poolConfig);
		this._pool.on("error", (e: Error, connection: pg.PoolClient) => {
			/*
				https://node-postgres.com/api/pool
				When a client is sitting idly in the pool it can still emit errors
				because it is connected to a live backend. If the backend goes down
				or a network partition is encountered all the idle, connected clients
				in your application will emit an error through the pool's error event emitter.
				The error listener is passed the error as the first argument and the client
				upon which the error occurred as the 2nd argument. The client will be
				automatically terminated and removed from the pool, it is only passed to the
				error handler in case you want to inspect it.
			 */
			const ex: FException = FException.wrapIfNeeded(e);
			constructorLogger.debug(ex.message);
			constructorLogger.trace(ex.message, ex);
		});
	}

	public get defaultSchema(): string { return this._defaultSchema; }

	public async create(executionContext: FExecutionContext): Promise<FSqlProvider> {
		this.verifyInitializedAndNotDisposed();

		const cancellationToken: FCancellationToken = FExecutionContextCancellation.of(executionContext).cancellationToken;
		const logger: FLogger = FExecutionContextLogger.of(executionContext).logger;

		const pgClient = await this._pool.connect();
		try {
			cancellationToken.throwIfCancellationRequested();

			if (this._defaultSchema !== null) {
				await pgClient.query(`SET search_path TO ${this._defaultSchema}`);
			}

			await pgClient.query("SET TIME ZONE '00:00'");

			const FSqlProvider: FSqlProvider = new FSqlProviderPostgres(
				pgClient,
				async () => {
					// dispose callback
					pgClient.release();
				},
				logger
			);

			return FSqlProvider;
		} catch (e) {
			pgClient.release();
			throw e;
		}
	}

	public usingProvider<T>(
		executionContext: FExecutionContext,
		worker: (sqlProvder: FSqlProvider) => T | Promise<T>
	): Promise<T> {
		const executionPromise: Promise<T> = (async () => {
			const FSqlProvider: FSqlProvider = await this.create(executionContext);
			try {
				return await worker(FSqlProvider);
			} finally {
				await FSqlProvider.dispose();
			}
		})();

		return executionPromise;
	}

	public usingProviderWithTransaction<T>(
		executionContext: FExecutionContext, worker: (sqlProvder: FSqlProvider) => T | Promise<T>
	): Promise<T> {
		return this.usingProvider(executionContext, async (FSqlProvider: FSqlProvider) => {
			const uncancellableExecutionConxtext: FExecutionContext = new FExecutionContextCancellation(
				executionContext,
				FCancellationToken.None
			);

			await FSqlProvider.statement("BEGIN TRANSACTION").execute(executionContext);
			try {
				let result: T;
				const workerResult = worker(FSqlProvider);
				if (workerResult instanceof Promise) {
					result = await workerResult;
				} else {
					result = workerResult;
				}
				// We have not to cancel this operation, so pass uncancellableExecutionConxtext
				await FSqlProvider.statement("COMMIT TRANSACTION").execute(uncancellableExecutionConxtext);
				return result;
			} catch (e) {
				try {
					// We have not to cancel this operation, so pass uncancellableExecutionConxtext
					await FSqlProvider.statement("ROLLBACK TRANSACTION").execute(uncancellableExecutionConxtext);
				} catch (e2) {
					throw new FExceptionAggregate([
						FException.wrapIfNeeded(e),
						FException.wrapIfNeeded(e2)
					]);
				}
				throw e;
			}
		});
	}


	protected onInit(): void {
		const logger: FLogger = FExecutionContextLogger.of(this.initExecutionContext).logger;
		if (logger.isTraceEnabled) {
			logger.trace(`Initializing instance of ${this.constructor.name} ...`);
		}
	}

	protected async onDispose(): Promise<void> {
		const logger: FLogger = FExecutionContextLogger.of(this.initExecutionContext).logger;
		if (logger.isTraceEnabled) {
			logger.trace(`Disposing instance of ${this.constructor.name} ...`);
		}
		// Dispose never raise error
		try {
			await this._pool.end();
		} catch (e) {
			const ex: FException = FException.wrapIfNeeded(e);
			if (logger.isWarnEnabled) {
				logger.warn("Module 'pg' ends pool with error. " + ex.message);
			} else {
				console.error("Module 'pg' ends pool with error", e);
			}
			logger.debug("Module 'pg' ends pool with error", ex);
		}
	}
}

export namespace FSqlProviderFactoryPostgres {
	export interface Opts {
		readonly url: URL;
		/**
		 * Default schema. The value overrides an URL param "schema".
		 * @description Each pgClient will execute SQL statement: `SET search_path TO ${defaultSchema}` before wrapping in `FSqlProviderPostgres`
		 * @default "public"
		 */
		readonly defaultSchema?: string;
		/**
		 * Application name. Used by Postres in monitoring stuff.
		 * The value ovverides an URL param "app"
		 */
		readonly applicationName?: string;
		readonly constructorLogger?: FLogger;
		/**
		 * @default 5000
		 */
		readonly connectionTimeoutMillis?: number;
		/**
		 * @default 30000
		 */
		readonly idleTimeoutMillis?: number;

		/**
		 * @default true
		 */
		keepAlive?: boolean;

		/**
		 * @default 5000
		 */
		keepAliveInitialDelayMillis?: number;

		readonly ssl?: "prefer" | {
			readonly caCert?: Buffer;
			readonly clientCert?: {
				readonly cert: Buffer;
				readonly key: Buffer;
			}
		};
	}
}

class FSqlProviderPostgres extends FDisposableBase implements FSqlProvider {
	public readonly pgClient: pg.PoolClient;
	public readonly log: FLogger;
	private readonly _disposer: () => Promise<void>;
	public constructor(pgClient: pg.PoolClient, disposer: () => Promise<void>, log: FLogger) {
		super();
		this.pgClient = pgClient;
		this._disposer = disposer;
		this.log = log;
		this.log.trace("FSqlProviderPostgres constructed");
	}

	public statement(sql: string): FSqlStatementPostgres {
		super.verifyNotDisposed();
		if (!sql) { throw new FExceptionArgument("sql"); }
		if (this.log.isTraceEnabled) {
			this.log.trace("FSqlProviderPostgres Statement: " + sql);
		}
		return new FSqlStatementPostgres(this, sql);
	}

	public async createTempTable(
		executionContext: FExecutionContext, tableName: string, columnsDefinitions: string
	): Promise<FSqlTemporaryTable> {
		const tempTable = new FSqlTemporaryTablePostgres(this, executionContext, tableName, columnsDefinitions);
		await tempTable.init(executionContext);
		return tempTable;
	}

	protected async onDispose(): Promise<void> {
		this.log.trace("FSqlProviderPostgres disposing...");
		await this._disposer();
		this.log.trace("FSqlProviderPostgres disposed");
	}
}

class FSqlStatementPostgres implements FSqlStatement {
	private readonly _sqlText: string;
	private readonly _owner: FSqlProviderPostgres;

	public constructor(owner: FSqlProviderPostgres, sql: string) {
		this._owner = owner;
		this._sqlText = sql;
	}

	public async execute(executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>): Promise<void> {
		await helpers.executeRunQuery(
			executionContext,
			this._owner.pgClient,
			this._sqlText,
			helpers.statementArgumentsAdapter(values)
		);
	}

	public async executeQuery(
		executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>
	): Promise<Array<FSqlResultRecord>> {
		const underlyingResult = await helpers.executeRunQuery(
			executionContext,
			this._owner.pgClient,
			this._sqlText,
			helpers.statementArgumentsAdapter(values)
		);

		const underlyingResultRows = underlyingResult.rows;
		const underlyingResultFields = underlyingResult.fields;

		if (underlyingResultFields[0].dataTypeID === PostgresObjectID.refcursor) {
			throw new FExceptionInvalidOperation("executeQuery: does not support multiset request yet");
		}

		if (underlyingResultRows.length > 0 && !(underlyingResultFields[0].dataTypeID === PostgresObjectID.void)) {
			return underlyingResultRows.map(row => new FSqlResultRecordPostgres(row, underlyingResultFields));
		} else {
			return [];
		}
	}

	// tslint:disable-next-line:max-line-length
	public async executeQueryMultiSets(
		executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>
	): Promise<Array<Array<FSqlResultRecord>>> {
		const cancellationToken: FCancellationToken = FExecutionContextCancellation.of(executionContext).cancellationToken;
		// Executing: BEGIN
		await helpers.executeRunQuery(executionContext, this._owner.pgClient, "BEGIN TRANSACTION", []);
		try {
			cancellationToken.throwIfCancellationRequested();

			const resultFetchs = await helpers.executeRunQuery(
				executionContext,
				this._owner.pgClient,
				this._sqlText,
				helpers.statementArgumentsAdapter(values)
			);
			cancellationToken.throwIfCancellationRequested();

			// Verify that this is a multi-request
			if (resultFetchs.fields[0].dataTypeID !== PostgresObjectID.refcursor) {
				// This is not a multi request. Raise exception.
				const trimmedSqlText: string = helpers.trimSqlTextForException(this._sqlText);
				throw new FExceptionInvalidOperation(`executeQueryMultiSets: cannot execute this script: ${trimmedSqlText}`);
			}

			const resultFetchsValue = helpers.parsingValue(resultFetchs);
			const friendlyResult: Array<Array<FSqlResultRecord>> = [];
			for (let i = 0; i < resultFetchsValue.length; i++) {
				const fetch = resultFetchsValue[i];

				const queryFetchs = await helpers.executeRunQuery(executionContext, this._owner.pgClient, `FETCH ALL IN "${fetch}";`, []);
				cancellationToken.throwIfCancellationRequested();

				friendlyResult.push(queryFetchs.rows.map(row => new FSqlResultRecordPostgres(row, queryFetchs.fields)));
			}

			// Executing: COMMIT
			await helpers.executeRunQuery(executionContext, this._owner.pgClient, "COMMIT", []);

			return friendlyResult;
		} catch (e) {
			// Executing: ROLLBACK
			await helpers.executeRunQuery(executionContext, this._owner.pgClient, "ROLLBACK", []);
			throw e;
		}
	}

	public async executeScalar(executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>): Promise<FSqlData> {
		const underlyingResult = await helpers.executeRunQuery(
			executionContext,
			this._owner.pgClient,
			this._sqlText,
			helpers.statementArgumentsAdapter(values)
		);


		const underlyingRows = underlyingResult.rows;
		if (underlyingRows.length === 0) {
			const trimmedSqlText: string = helpers.trimSqlTextForException(this._sqlText);
			throw new FSqlExceptionNoSuchRecord(`executeScalar: No record for query ${trimmedSqlText}`);
		}

		const underlyingFields = underlyingResult.fields;

		if (underlyingFields.length === 0) {
			throw new FExceptionInvalidOperation("executeScalar: SQL query returns no result");
		}

		if (underlyingFields[0].dataTypeID === PostgresObjectID.refcursor) {
			throw new FExceptionInvalidOperation("executeScalar: does not support multiset request yet");
		}

		const underlyingFirstRow = underlyingRows[0];
		const value = underlyingFirstRow[Object.keys(underlyingFirstRow)[0]];
		const fi = underlyingFields[0];
		if (value !== undefined || fi !== undefined) {
			return new FSqlDataPostgres(value, fi);
		} else {
			throw new FSqlException(`executeScalar: Bad argument ${value} and ${fi}`);
		}
	}

	public async executeScalarOrNull(executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>): Promise<FSqlData | null> {
		const underlyingResult = await helpers.executeRunQuery(
			executionContext,
			this._owner.pgClient,
			this._sqlText,
			helpers.statementArgumentsAdapter(values)
		);

		const underlyingRows = underlyingResult.rows;
		const underlyingFields = underlyingResult.fields;
		if (underlyingRows.length > 0) {
			if (underlyingFields[0].dataTypeID === PostgresObjectID.refcursor) {
				throw new FExceptionInvalidOperation("executeScalarOrNull: does not support multiset request yet");
			}

			const underlyingFirstRow = underlyingRows[0];
			const value = underlyingFirstRow[Object.keys(underlyingFirstRow)[0]];
			const fi = underlyingFields[0];
			if (value !== undefined || fi !== undefined) {
				return new FSqlDataPostgres(value, fi);
			} else {
				throw new FSqlException(`executeScalarOrNull: Bad argument ${value} and ${fi}`);
			}
		} else {
			return null;
		}
	}

	public async executeSingle(executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>): Promise<FSqlResultRecord> {
		const underlyingResult = await helpers.executeRunQuery(
			executionContext,
			this._owner.pgClient,
			this._sqlText,
			helpers.statementArgumentsAdapter(values)
		);

		const underlyingResultRows = underlyingResult.rows;
		const underlyingResultFields = underlyingResult.fields;

		if (underlyingResultFields.length === 0) {
			throw new FExceptionInvalidOperation("executeSingle: SQL query returns no result");
		}

		if (underlyingResultFields[0].dataTypeID === PostgresObjectID.refcursor) {
			throw new FExceptionInvalidOperation("executeSingle: does not support multi request");
		}

		if (underlyingResultRows.length === 0) {
			const trimmedSqlText: string = helpers.trimSqlTextForException(this._sqlText);
			throw new FSqlExceptionNoSuchRecord(`executeSingle: No record for query ${trimmedSqlText}`);
		} else if (underlyingResultRows.length === 1 && !(underlyingResultFields[0].dataTypeID === PostgresObjectID.void)) {
			return new FSqlResultRecordPostgres(underlyingResultRows[0], underlyingResultFields);
		} else {
			throw new FExceptionInvalidOperation(`executeSingle: SQL query returns non-single result`);
		}
	}

	public async executeSingleOrNull(
		executionContext: FExecutionContext, ...values: Array<FSqlStatementParam>
	): Promise<FSqlResultRecord | null> {
		const underlyingResult = await helpers.executeRunQuery(
			executionContext,
			this._owner.pgClient,
			this._sqlText,
			helpers.statementArgumentsAdapter(values)
		);

		const underlyingResultRows = underlyingResult.rows;
		const underlyingResultFields = underlyingResult.fields;

		if (underlyingResultFields.length === 0) {
			throw new FExceptionInvalidOperation("executeSingleOrNull: SQL query returns no result");
		}

		if (underlyingResultFields[0].dataTypeID === PostgresObjectID.refcursor) {
			throw new FExceptionInvalidOperation("executeSingleOrNull: does not support multi request");
		}

		if (underlyingResultRows.length === 0) {
			return null;
		} else if (underlyingResultRows.length === 1 && !(underlyingResultFields[0].dataTypeID === PostgresObjectID.void)) {
			return new FSqlResultRecordPostgres(underlyingResultRows[0], underlyingResultFields);
		} else {
			throw new FExceptionInvalidOperation("executeSingleOrNull: SQL query returns non-single result");
		}
	}
}

namespace FSqlResultRecordPostgres {
	export type NameMap = {
		[name: string]: pg.FieldDef;
	};
}
class FSqlResultRecordPostgres implements FSqlResultRecord {
	private readonly _fieldsData: any;
	private readonly _fieldsInfo: Array<pg.FieldDef>;
	private _nameMap?: FSqlResultRecordPostgres.NameMap;

	public constructor(fieldsData: any, fieldsInfo: Array<pg.FieldDef>) {
		if (Object.keys(fieldsData).length !== fieldsInfo.length) {
			throw new Error("Internal error. Fields count is not equal to data columns.");
		}
		this._fieldsData = fieldsData;
		this._fieldsInfo = fieldsInfo;
	}

	public get(name: string): FSqlData;
	public get(index: number): FSqlData;
	public get(nameOrIndex: string | number): FSqlData {
		if (typeof nameOrIndex === "string") {
			return this.getByName(nameOrIndex);
		} else {
			return this.getByIndex(nameOrIndex);
		}
	}

	private get nameMap(): FSqlResultRecordPostgres.NameMap {
		if (this._nameMap === undefined) {
			const nameMap: FSqlResultRecordPostgres.NameMap = {};
			const total = this._fieldsInfo.length;
			for (let index = 0; index < total; ++index) {
				const fi: pg.FieldDef = this._fieldsInfo[index];
				if (fi.name in nameMap) { throw new Error("Cannot access FSqlResultRecord by name due result set has name duplicates"); }
				nameMap[fi.name] = fi;
			}
			this._nameMap = nameMap;
		}
		return this._nameMap;
	}

	private getByIndex(index: number): FSqlData {
		const fi: pg.FieldDef = this._fieldsInfo[index];
		if (fi === undefined) {
			throw new FExceptionArgument(`PostgresSqlResultRecord does not have field with index '${index}'`, "index");
		}
		const value: any = this._fieldsData[fi.name];
		return new FSqlDataPostgres(value, fi);
	}
	private getByName(name: string): FSqlData {
		const fi = this.nameMap[name];
		if (fi === undefined) {
			throw new FExceptionArgument(`PostgresSqlResultRecord does not have field with name '${name}'`, "name");
		}
		const value: any = this._fieldsData[fi.name];
		return new FSqlDataPostgres(value, fi);
	}
}

class FSqlTemporaryTablePostgres extends FInitableBase implements FSqlTemporaryTable {

	private readonly _owner: FSqlProviderPostgres;
	private readonly _executionContext: FExecutionContext;
	private readonly _tableName: string;
	private readonly _columnsDefinitions: string;

	public constructor(owner: FSqlProviderPostgres, executionContext: FExecutionContext, tableName: string, columnsDefinitions: string) {
		super();
		this._owner = owner;
		this._executionContext = executionContext;
		this._tableName = tableName;
		this._columnsDefinitions = columnsDefinitions;
	}

	public bulkInsert(executionContext: FExecutionContext, bulkValues: Array<Array<FSqlStatementParam>>): Promise<void> {
		return this._owner.statement(`INSERT INTO \`${this._tableName}\``).execute(executionContext, bulkValues as any);
	}
	public clear(executionContext: FExecutionContext): Promise<void> {
		return this._owner.statement(`DELETE FROM \`${this._tableName}\``).execute(executionContext);
	}
	public insert(executionContext: FExecutionContext, values: Array<FSqlStatementParam>): Promise<void> {
		return this._owner.statement(`INSERT INTO \`${this._tableName}\``).execute(executionContext, ...values);
	}

	protected async onInit(): Promise<void> {
		await this._owner.statement(`CREATE TEMPORARY TABLE ${this._tableName} (${this._columnsDefinitions})`).execute(this._executionContext);
	}
	protected async onDispose(): Promise<void> {
		try {
			await this._owner.statement(`DROP TABLE ${this._tableName}`).execute(this._executionContext);
		} catch (e) {
			// dispose never raise error
			if (e instanceof FExceptionCancelled) {
				return; // skip error message if task was cancelled
			}
			// Dispose never raise errors
			console.error(e); // we cannot do anymore here, just log
		}
	}
}

class FSqlDataPostgres implements FSqlData {
	private readonly _postgresValue: any;
	private readonly _fi: pg.FieldDef;

	public get asBoolean(): boolean {
		if (typeof this._postgresValue === "boolean") {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asBoolean"));
		}
	}
	public get asNullableBoolean(): boolean | null {
		if (this._postgresValue === null) {
			return null;
		} else if (typeof this._postgresValue === "boolean") {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableBoolean"));
		}
	}
	public get asString(): string {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asString"));
		} else if (_.isString(this._postgresValue)) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asString"));
		}
	}
	public get asNullableString(): string | null {
		if (this._postgresValue === null) {
			return null;
		} else if (_.isString(this._postgresValue)) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableString"));
		}
	}
	public get asInteger(): number {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asInteger"));
		} else if (_.isNumber(this._postgresValue) && Number.isInteger(this._postgresValue)) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asInteger"));
		}
	}
	public get asNullableInteger(): number | null {
		if (this._postgresValue === null) {
			return null;
		} else if (_.isNumber(this._postgresValue) && Number.isInteger(this._postgresValue)) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableInteger"));
		}
	}
	public get asNumber(): number {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNumber"));
		} else if (_.isNumber(this._postgresValue)) {
			return this._postgresValue;
		} else if (this._fi.dataTypeID === PostgresObjectID.numeric && _.isString(this._postgresValue)) {
			return Number.parseFloat(this._postgresValue);
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNumber"));
		}
	}
	public get asNullableNumber(): number | null {
		if (this._postgresValue === null) {
			return null;
		} else if (_.isNumber(this._postgresValue)) {
			return this._postgresValue;
		} else if (this._fi.dataTypeID === PostgresObjectID.numeric && _.isString(this._postgresValue)) {
			return Number.parseFloat(this._postgresValue);
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableNumber"));
		}
	}
	public get asDecimal(): FDecimal {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asDecimal"));
		} else if (_.isNumber(this._postgresValue)) {
			return FDecimal.fromFloat(this._postgresValue);
		} else if (_.isString(this._postgresValue)) {
			return FDecimal.parse(this._postgresValue);
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asDecimal"));
		}
	}
	public get asNullableDecimal(): FDecimal | null {
		if (this._postgresValue === null) {
			return null;
		} else if (_.isNumber(this._postgresValue)) {
			return FDecimal.fromFloat(this._postgresValue);
		} else if (_.isString(this._postgresValue)) {
			return FDecimal.parse(this._postgresValue);
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableDecimal"));
		}
	}
	public get asDate(): Date {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asDate"));
			// } else if (this._fi.dataTypeID === PostgresObjectID.timestamp && this._postgresValue instanceof Date) {
			// 	// `pg` library make Date with local zone shift, so we need to make oposite changes to retrieve correct date from UTC timestamp
			// 	return new Date(this._postgresValue.getTime() - this._postgresValue.getTimezoneOffset() * 60000);
		} else if (this._fi.dataTypeID === PostgresObjectID.timestamp && typeof this._postgresValue === "string") {
			// `pg` library make Date with local zone shift, so we need to make oposite changes to retrieve correct date from UTC timestamp
			return new Date(`${this._postgresValue}+0000`);
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage(
				"asDate",
				`Right now the library supports TIMESTAMP WITHOUT TIME ZONE OID=${PostgresObjectID.timestamp} only. Got OID=${this._fi.dataTypeID}.`
			));
		}
	}
	public get asNullableDate(): Date | null {
		if (this._postgresValue === null) {
			return null;
			// } else if (this._fi.dataTypeID === PostgresObjectID.timestamp && this._postgresValue instanceof Date) {
			// 	// `pg` library make Date with local zone shift, so we need to make oposite changes to retrieve correct date from UTC timestamp
			// 	return new Date(this._postgresValue.getTime() - this._postgresValue.getTimezoneOffset() * 60000);
		} else if (this._fi.dataTypeID === PostgresObjectID.timestamp && typeof this._postgresValue === "string") {
			// `pg` library make Date with local zone shift, so we need to make oposite changes to retrieve correct date from UTC timestamp
			return new Date(`${this._postgresValue}+0000`);
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage(
				"asNullableDate",
				`Right now the library supports TIMESTAMP WITHOUT TIME ZONE OID=${PostgresObjectID.timestamp} only. Got OID=${this._fi.dataTypeID}.`
			));
		}
	}
	public get asBinary(): Uint8Array {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asBinary"));
		} else if (this._postgresValue instanceof Uint8Array) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asBinary"));
		}
	}
	public get asNullableBinary(): Uint8Array | null {
		if (this._postgresValue === null) {
			return null;
		} else if (this._postgresValue instanceof Uint8Array) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableBinary"));
		}
	}
	public get asObject(): any {
		if (this._postgresValue === null) {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asObject"));
		} else if (this._fi.dataTypeID === PostgresObjectID.jsonb) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage(
				"asObject",
				`Right now the library supports Binary JSON (OID=${PostgresObjectID.jsonb}) only.`
			));
		}
	}
	public get asNullableObject(): any | null {
		if (this._postgresValue === null) {
			return null;
		} else if (this._fi.dataTypeID === PostgresObjectID.jsonb) {
			return this._postgresValue;
		} else {
			throw new FExceptionInvalidOperation(this.formatWrongDataTypeMessage("asNullableObject"));
		}
	}

	public constructor(postgresValue: any, fi: pg.FieldDef) {
		if (postgresValue === undefined) {
			throw new FExceptionArgument("postgresValue");
		}
		this._postgresValue = postgresValue;
		this._fi = fi;
	}

	private formatWrongDataTypeMessage(caller: keyof FSqlData, subMessage?: string): string {
		let valueConstructorName: string;
		if (this._postgresValue !== null && this._postgresValue !== undefined) {
			valueConstructorName = this._postgresValue.constructor.name;
		} else {
			valueConstructorName = `${this._postgresValue}`;
		}
		const message = `Invalid conversion for caller '${caller}' on a field '${this._fi.name}' with dataTypeID: '${this._fi.dataTypeID}'. PostgresValue instance of constructor '${valueConstructorName}'`;

		if (subMessage !== undefined) {
			return `${message} ${subMessage}`;
		}

		return message;
	}
}

namespace helpers {
	export function openDatabase(url: URL): Promise<pg.Client> {
		return new Promise((resolve, reject) => {
			const client: pg.Client = new pg.Client({
				host: url.hostname,
				port: url.port !== undefined ? Number.parseInt(url.port) : 5432,
				user: url.username,
				password: url.password,
				database: url.pathname.substr(1) // skip first symbol '/'
			});
			client.connect(err => {
				if (err) {
					return reject(err);
				}
				return resolve(client);
			});
		});
	}
	export function closeDatabase(db: pg.Client): Promise<void> {
		return new Promise((resolve, reject) => {
			db.end((error) => {
				if (error) { return reject(error); }
				return resolve();
			});
		});
	}
	export async function executeRunQuery(
		executionContext: FExecutionContext, db: pg.PoolClient, sqlText: string, values: Array<FSqlStatementParam>
	): Promise<pg.QueryResult> {
		try {
			return await new Promise<pg.QueryResult>((resolve, reject) => {
				db.query(sqlText, values,
					(err: any, underlyingResult: pg.QueryResult) => {
						if (err) {
							return reject(err);
						}
						return resolve(underlyingResult);
					});
			});
		} catch (reason: any) {
			const err = FException.wrapIfNeeded(reason);

			const trimmedSqlText: string = trimSqlTextForException(sqlText);

			if ("code" in reason) {
				const code = reason.code;
				// https://www.postgresql.org/docs/12/errcodes-appendix.html
				switch (code) {
					case "21000":
					case "23000":
					case "23001":
					case "23502":
					case "23503":
					case "23505":
					case "23514":
					case "23P01":
					case "27000":
					case "40002":
					case "42000":
					case "44000":
						throw new FSqlExceptionConstraint(
							`SQL Constraint restriction happened. Query: ${trimmedSqlText}. Reason Message: ${err.message}. See innerError for details.`,
							_.isString(reason.constraint) ? reason.constraint : "???",
							err
						);
					case "42501":
						throw new FSqlExceptionPermission(`Insufficient permission to execute a query. Query: ${trimmedSqlText}. Reason Message: ${err.message}. See innerError for details.`, err);
					case "42000":
					case "42601":
						throw new FSqlExceptionSyntax(`Looks like wrong SQL syntax detected. Query: ${trimmedSqlText}. Reason Message: ${err.message}. See innerError for details.`, err);
				}
			}
			throw new FSqlException(`Unexpected error occurs while executing a query. Query: ${trimmedSqlText}. Reason Message: ${err.message}. See innerError for details.`, err);
		}
	}
	export function statementArgumentsAdapter(args: Array<FSqlStatementParam>): Array<any> {
		return args.map(value => {
			if (typeof value === "object") {
				if (value !== null) {
					if (FDecimal.isDecimal(value)) {
						return value.toString(); // FDecimal should be converted to string
					} else if (value instanceof Date) {
						throw new FExceptionInvalidOperation("You trying to pass date object as statement parameter. Right now this is not supported (long story)... As workaround you have to pass date object as unix milliseconds by calling .getTime() and use 'to_timestamp($1::DOUBLE PRECISION / 1000)::TIMESTAMP WITHOUT TIME ZONE' to decode unix milliseconds to Postgres timestamp.");
						// // `pg` library make Date with local zone shift, so we need to make oposite changes to save correct date as UTC timestamp
						// THIS IS WORK INCORRECT FOR DATE (in time switch period): 2021-03-28T01:24:59.741Z
						// return new Date(value.getTime() + value.getTimezoneOffset() * 60000);
					}
				}
			}
			return value;
		});
	}
	export function parsingValue(res: pg.QueryResult): Array<any> {
		const rows = res.rows;
		return rows.map((row) => row[Object.keys(row)[0]]);
	}
	export function trimSqlTextForException(sqlText: string): string {
		const trimmedSqlText: string = sqlText.length > 996
			? sqlText.substring(0, 996) + " ..."
			: sqlText;
		return trimmedSqlText;
	}
}
