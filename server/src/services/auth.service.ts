import crypto from 'crypto';
import pool from '../db/pool.js';
import type { User } from '../types/index.js';

// ─── In-memory token cache ───────────────────────────────────────────────────
// Avoids a DB round-trip on every authenticated request.
// Key:   SHA-256 hex of the raw token
// Value: { userId, expiresAt }
// Entries are auto-evicted after CACHE_TTL_MS regardless of token expiry.

// interface CacheEntry { userId: number; expiresAt: Date }

// const tokenCache = new Map<string, CacheEntry>();
// const CACHE_TTL_MS = 5 * 60 * 1_000;   // 5 min
const TOKEN_EXPIRY_DAYS = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function hashToken(raw: string): string {
	return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRawToken(): string {
	return crypto.randomBytes(32).toString('hex'); // 256-bit
}

// ─── Token operations ────────────────────────────────────────────────────────

export async function createAuthToken(userId: number): Promise<string> {
	const raw = generateRawToken();
	const hash = hashToken(raw);
	const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 86_400_000);

	await pool.query(
		`INSERT INTO auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
		[userId, hash, expiresAt],
	);

	return raw; // only time the raw token exists in memory – send immediately as cookie
}

export async function validateToken(raw: string): Promise<number | null> {
	const hash = hashToken(raw);

	// 1. Cache hit
	// const cached = tokenCache.get(hash);
	// if (cached) {
	// 	if (cached.expiresAt > new Date()) return cached.userId;
	// 	tokenCache.delete(hash); // stale
	// }

	// 2. DB lookup
	const { rows } = await pool.query<{ user_id: number; expires_at: Date }>(
		`SELECT user_id, expires_at
		 FROM auth_tokens
		 WHERE token_hash = $1
		 AND revoked    = FALSE
		 AND expires_at > NOW()`,
		[hash],
	);

	const [row] = rows;
	if (!row) return null;

	const { user_id, expires_at } = row;

	// Populate cache; schedule eviction
	// tokenCache.set(hash, { userId: user_id, expiresAt: expires_at });
	// setTimeout(() => tokenCache.delete(hash), CACHE_TTL_MS);

	return user_id;
}

export async function revokeToken(raw: string): Promise<void> {
	const hash = hashToken(raw);
	// tokenCache.delete(hash);
	await pool.query(
		`UPDATE auth_tokens SET revoked = TRUE WHERE token_hash = $1`,
		[hash],
	);
}

// ─── User operations ─────────────────────────────────────────────────────────

export async function findOrCreateUser(
	googleId: string,
	email: string | undefined,
	name: string | undefined,
	avatarUrl: string | undefined,
): Promise<number> {
	const insert = await pool.query<{ id: number }>(
		`INSERT INTO users (google_id, email, name, avatar_url)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (google_id)
		DO UPDATE SET
			name = EXCLUDED.name,
			avatar_url = EXCLUDED.avatar_url
		RETURNING id;`,
		[googleId, email, name, avatarUrl],
	);

	const [row] = insert.rows;

	if (!row) {
		throw new Error(
			`findOrCreateUser failed: UPSERT returned no rows (googleId=${googleId})`
		);
	}

	return row.id;
}

export async function getUserById(id: number): Promise<User | null> {
	const { rows } = await pool.query<User>(
		`SELECT * FROM users WHERE id = $1`,
		[id],
	);
	return rows[0] ?? null;
}
