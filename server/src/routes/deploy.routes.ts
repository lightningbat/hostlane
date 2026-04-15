import type { Request, Response } from 'express';
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { UploadedFile } from 'express-fileupload';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getSiteByIdForUser } from '../services/site.service.js';
import {
	createDeployment,
	updateDeploymentStatus,
} from '../services/deployment.service.js';
import { uploadPath, deployDir } from '../utils/paths.utils.js';
import { enqueue, deployEvents, type DeployEvent } from '../workers/worker-manager.js';

const router = Router();

const MAX_ZIP_BYTES = Number(process.env.MAX_ZIP_BYTES ?? 20 * 1024 * 1024); // 20 MB

// ─── POST /api/deploy/:siteId ─────────────────────────────────────────────────
// Accepts a multipart upload with field name "build" (zip file).

router.post("/:siteId", requireAuth, async (req: Request, res: Response) => {
	const siteId = Number(req.params.siteId);

	//  Ownership check
	const site = await getSiteByIdForUser(siteId, req.userId!);
	if (!site) return res.status(404).json({ error: "Site not found" });

	//  File validation
	if (!req.files || Array.isArray(req.files.build)) {
		return res.status(400).json({ error: "Invalid upload — expected single file 'build'" });
	}

	const file = req.files.build as UploadedFile;

	if (!file.name.endsWith(".zip")) {
		return res.status(400).json({ error: "Only .zip files are accepted" });
	}

	if (file.size > MAX_ZIP_BYTES) {
		return res.status(400).json({
			error: `File too large — max ${MAX_ZIP_BYTES / 1024 / 1024} MB`,
		});
	}

	// Generate deployment id early, to skip waiting for db generate id
	const deploymentId = crypto.randomUUID();

	// Final paths
	const upload_path = uploadPath(siteId, deploymentId);

	try {
		// Ensure directory exists
		await fs.mkdir(path.dirname(upload_path), { recursive: true });
		// Write upload
		await file.mv(upload_path);

		await createDeployment(deploymentId, siteId, upload_path);

		try {
			enqueue({
				deployment_id: deploymentId,
				site_id: siteId,
				zip_path: upload_path,
				target_dir: deployDir(siteId, deploymentId),
			});
		} catch (err) {
			await updateDeploymentStatus(deploymentId, 'FAILED', {error_msg: 'Failed to enqueue work'});
			throw err;
		}

		return res.status(202).json({
			sse_url: `/api/deploy/${deploymentId}/status`,
		});
	} catch (err) {
		// cleanup partial or final file if exists
		await fs.unlink(upload_path).catch(() => {});
		console.error(err)
		return res.status(400).json({error: 'Deloyment Failed'})
	}
});


// ─── GET /api/deploy/:deploymentId/status  (SSE) ─────────────────────────────
// Streams deployment status events until LIVE or FAILED.
// Heartbeat every 20 s keeps proxies/load-balancers from dropping the connection.

router.get('/:deploymentId/status', requireAuth, (req: Request, res: Response) => {
	const deploymentId = Number(req.params.deploymentId);

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
	res.flushHeaders();

	const send = (event: DeployEvent) => {
		res.write(`data: ${JSON.stringify(event)}\n\n`);
	};

	const listener = (event: DeployEvent) => {
		send(event);
		if (event.status === 'LIVE' || event.status === 'FAILED') {
			cleanup();
			res.end();
		}
	};

	const eventKey = `deployment:${deploymentId}`;
	deployEvents.on(eventKey, listener);

	const heartbeat = setInterval(() => res.write(': ping\n\n'), 20_000);

	function cleanup() {
		deployEvents.off(eventKey, listener);
		clearInterval(heartbeat);
	}

	req.on('close', cleanup);
});

export default router;
