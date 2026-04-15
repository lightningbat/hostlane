import { Client, Pool, type PoolClient } from 'pg';
import fs from 'fs/promises';
import path from 'path';

const DB_NAME = process.env.DB_NAME || 'hostlane'

await ensureDatabase()

const pool = new Pool({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || 5432),
	database: DB_NAME,
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
	max: 20,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 3_000,
});

pool.on('error', (err) => {
	console.error('[DB] Unexpected pool error:', err.message);
});

await runSchema()

// Convenience wrapper for transactions
export async function withTransaction<T>(
	fn: (client: PoolClient) => Promise<T>
): Promise<T> {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const result = await fn(client);
		await client.query('COMMIT');
		return result;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

async function ensureDatabase() {
	const client = new Client({
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT || 5432),
		user: process.env.DB_USER || 'postgres',
		password: process.env.DB_PASSWORD || '',
		database: 'postgres',
	});
	await client.connect();

	const res = await client.query(
		`SELECT 1 FROM pg_database WHERE datname = $1`,
		[DB_NAME]
	);

	if (res.rowCount === 0) {
		await client.query(`CREATE DATABASE ${DB_NAME}`);
		console.log(`[Boot] Created database: ${DB_NAME}`);
	}
	await client.end();
}

async function runSchema() {
	const client = await pool.connect();

	try {
		const schema_file_path = path.join(import.meta.dirname, '..', '..', 'schema.sql')
		const sql = await fs.readFile(schema_file_path, 'utf-8');

		await client.query('BEGIN');
		await client.query(sql);
		await client.query('COMMIT');

		console.log('[Boot] Schema applied');
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

export default pool;
