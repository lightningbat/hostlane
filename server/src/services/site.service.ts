import pool from '../db/pool.js';
import type { Site } from '../types/index.js';
import { siteDir } from '../utils/paths.utils.js';
import { normalizeNameToSubdomain, randomSuffix } from '../utils/subdomain.utils.js'
import { promises as fs } from "fs";
import { removeNginxConfigForSite, scheduleReload } from './nginx.service.js';

export async function createSite(
	userId: number,
	name: string
) {

	const base = normalizeNameToSubdomain(name);

	// First attempt: clean subdomain
	try {
		const { rows } = await pool.query<{ id: string, subdomain: string }>(
			`INSERT INTO sites (user_id, name, subdomain)
			 VALUES ($1, $2, $3)
			 RETURNING id, subdomain`,
			[userId, name, base]
		);

		const [row] = rows
		if (!row) throw new Error()

		return row;
	} catch (err: any) {
		if (err.code !== "23505") throw err; // not unique violation
	}

	// Retry with suffix
	const MAX_ATTEMPTS = 5;

	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const candidate = `${base}-${randomSuffix()}`;

		try {
			const res = await pool.query(
				`INSERT INTO sites (user_id, name, subdomain)
				 VALUES ($1, $2, $3)
				 RETURNING id, subdomain`,
				[userId, name, candidate]
			);

			return res.rows[0];
		} catch (err: any) {
			if (err.code !== "23505") throw err;
		}
	}
	throw new Error("Failed to generate unique subdomain after retries");
}

export async function getSitesByUser(userId: number): Promise<Site[]> {
	const { rows } = await pool.query<Site>(
		`SELECT * FROM sites WHERE user_id = $1 ORDER BY created_at DESC`,
		[userId],
	);
	return rows;
}

// Returns the site only if it belongs to userId (authorization baked in)
export async function getSiteByIdForUser(
	siteId: number,
	userId: number,
): Promise<Site | null> {
	const { rows } = await pool.query<Site>(
		`SELECT * FROM sites WHERE id = $1 AND user_id = $2`,
		[siteId, userId],
	);
	return rows[0] ?? null;
}

export async function deleteSite(siteId: number, userId: number): Promise<boolean> {
	const { rowCount } = await pool.query(
		`DELETE FROM sites WHERE id = $1 AND user_id = $2`,
		[siteId, userId],
	);

	if (!rowCount) return false;

	// Remove filesystem data 
	const dir = siteDir(siteId);

	await fs.rm(dir, { recursive: true, force: true }).catch(err => {
		console.error(`[DeleteSite] Failed to remove dir ${dir}:`, err);
	});

	// Remove nginx config
	await removeNginxConfigForSite(siteId);

	// Trigger reload
	scheduleReload();

	return true;
}

export async function setCustomDomain(
	siteId: number,
	userId: number,
	domain: string,
): Promise<Site | null> {
	const { rows } = await pool.query<Site>(
		`UPDATE sites
        SET custom_domain   = $1,
            domain_verified = FALSE,
            ssl_status      = 'pending'
      WHERE id      = $2
        AND user_id = $3
  RETURNING *`,
		[domain, siteId, userId],
	);
	return rows[0] ?? null;
}

export async function removeCustomDomain(
	siteId: number,
	userId: number,
): Promise<Site | null> {
	const { rows } = await pool.query<Site>(
		`UPDATE sites
        SET custom_domain   = NULL,
            domain_verified = FALSE,
            ssl_status      = 'none'
      WHERE id      = $1
        AND user_id = $2
  RETURNING *`,
		[siteId, userId],
	);
	return rows[0] ?? null;
}
