import fs from 'fs/promises';
import pool, { withTransaction } from '../db/pool.js';
import type { Deployment, DeploymentStatus } from '../types/index.js';
import { deployDir, liveLink } from '../utils/paths.utils.js'
import type { UUID } from 'crypto';

const MAX_ARCHIVED = 3; // keep last N archived versions per site

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getDeploymentById(id: string): Promise<Deployment | null> {
	const { rows } = await pool.query<Deployment>(
		`SELECT * FROM deployments WHERE id = $1`,
		[id],
	);
	return rows[0] ?? null;
}

export async function getDeploymentsBySite(siteId: number): Promise<Deployment[]> {
	const { rows } = await pool.query<Deployment>(
		`SELECT * FROM deployments
		 WHERE site_id = $1
		 ORDER BY created_at DESC`,
		[siteId],
	);
	return rows;
}

export async function getUnfinishedDeployments(): Promise<Deployment[]> {
	const { rows } = await pool.query<Deployment>(
		`SELECT * FROM deployments
		 WHERE status IN ('UPLOADED','EXTRACTING','VALIDATING','READY')
		 ORDER BY created_at ASC`,
	);
	return rows;
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function createDeployment(
	deployment_id: string,
	siteId: number,
	zipPath: string,
): Promise<void> {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		// lock per site (only for version calculation)
		await client.query(
			"SELECT pg_advisory_xact_lock($1)",
			[siteId]
		);

		// Get next version
		const { rows } = await client.query(
			`SELECT COALESCE(MAX(version), 0) + 1 AS next_version
			 FROM deployments
			 WHERE site_id = $1`,
			[siteId]
		);

		const version = rows[0].next_version;

		await client.query(
			`INSERT INTO deployments (id, site_id, version, zip_path)
			 VALUES ($1, $2, $3, $4)`,
			[deployment_id, siteId, version, zipPath]
		);
		await client.query("COMMIT");
		
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export async function updateDeploymentStatus(
	deploymentId: string,
	status: DeploymentStatus,
	extra: { deploy_dir?: string; error_msg?: string } = {},
): Promise<void> {
	// Build SET clause dynamically to avoid overwriting unrelated fields with NULL
	const sets: string[] = ['status = $2'];
	const vals: unknown[] = [deploymentId, status];

	if (extra.deploy_dir !== undefined) {
		sets.push(`deploy_dir = $${vals.length + 1}`);
		vals.push(extra.deploy_dir);
	}
	if (extra.error_msg !== undefined) {
		sets.push(`error_msg = $${vals.length + 1}`);
		vals.push(extra.error_msg);
	}

	await pool.query(
		`UPDATE deployments SET ${sets.join(', ')} WHERE id = $1`,
		vals,
	);
}

// ─── Atomic live promotion ───────────────────────────────────────────────────
// Uses a tmp symlink + rename so nginx never sees a broken link.

export async function promoteToLive(deployment: Deployment): Promise<void> {
	const dir = deployment.deploy_dir ?? deployDir(deployment.site_id, deployment.id);
	const live = liveLink(deployment.site_id);
	const tmpLink = `${live}.tmp_${Date.now()}`;

	// Atomic swap: symlink to tmp path, then rename over the real one
	await fs.symlink(dir, tmpLink);
	await fs.rename(tmpLink, live);

	await withTransaction(async (client) => {
		// Mark this deployment LIVE
		await client.query(
			`UPDATE deployments SET status = 'LIVE', deploy_dir = $2 WHERE id = $1`,
			[deployment.id, dir],
		);
		// Archive any previously live deployments for this site
		await client.query(
			`UPDATE deployments
			 SET status = 'ARCHIVED'
			 WHERE site_id = $1
			 AND id      != $2
			 AND status  = 'LIVE'`,
			[deployment.site_id, deployment.id],
		);
	});

	// Best-effort prune old archived versions (non-blocking)
	pruneOldVersions(deployment.site_id).catch(console.error);
}

async function pruneOldVersions(siteId: number): Promise<void> {
	const { rows } = await pool.query<Deployment>(
		`SELECT * FROM deployments
      WHERE site_id = $1
        AND status  = 'ARCHIVED'
      ORDER BY created_at DESC
      OFFSET $2`,
		[siteId, MAX_ARCHIVED],
	);

	for (const dep of rows) {
		if (dep.deploy_dir) {
			await fs.rm(dep.deploy_dir, { recursive: true, force: true }).catch(() => { });
		}
		await pool.query(`DELETE FROM deployments WHERE id = $1`, [dep.id]);
	}
}

// ─── Rollback ────────────────────────────────────────────────────────────────

export async function rollbackToPrevious(
	siteId: number,
	userId: number,
): Promise<Deployment | null> {
	// Verify site ownership
	const { rows: siteRows } = await pool.query(
		`SELECT id FROM sites WHERE id = $1 AND user_id = $2`,
		[siteId, userId],
	);
	if (siteRows.length === 0) return null;

	const { rows } = await pool.query<Deployment>(
		`SELECT * FROM deployments
      WHERE site_id = $1
        AND status  = 'ARCHIVED'
      ORDER BY created_at DESC
      LIMIT 1`,
		[siteId],
	);

	const target = rows[0];
	if (!target || !target.deploy_dir) return null;

	await promoteToLive(target);
	return target;
}
