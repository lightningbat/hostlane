import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { generateNginxConfigForSite } from '../services/nginx.service.js';
import {
	createSite,
	getSitesByUser,
	getSiteByIdForUser,
	deleteSite,
	setCustomDomain,
	removeCustomDomain,
} from '../services/site.service.js';
import {
	getDeploymentsBySite,
	rollbackToPrevious,
} from '../services/deployment.service.js';

const router = Router();

// ─── GET /api/sites ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
	const sites = await getSitesByUser(req.userId!);
	res.json({ sites });
});

// ─── POST /api/sites ──────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
	const name = (req.body as { name?: string }).name?.trim();


	if (!name) {
		return res.status(400).json({ error: 'Name is required' });
	}

	try {
		const site = await createSite(req.userId!, name);
		console.log('Database entry succesful')
		await generateNginxConfigForSite({siteId: site.id, subdomain: site.subdomain})
		res.status(201).json({ site });
	} catch (err: any) {
		if (err.code === '23505') {           // unique violation
			return res.status(409).json({ error: 'Failed to generate subdomain' });
		}
		return res.status(500).json({ error: 'An unexpected error occurred' });
	}
});

// ─── GET /api/sites/:id ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
	const site = await getSiteByIdForUser(Number(req.params.id), req.userId!);
	if (!site) return res.status(404).json({ error: 'Site not found' });
	res.json({ site });
});

// ─── DELETE /api/sites/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
	const deleted = await deleteSite(Number(req.params.id), req.userId!);
	if (!deleted) return res.status(404).json({ error: 'Site not found' });
	res.json({ ok: true });
});

// ─── GET /api/sites/:id/deployments ──────────────────────────────────────────
router.get('/:id/deployments', requireAuth, async (req: Request, res: Response) => {
	const site = await getSiteByIdForUser(Number(req.params.id), req.userId!);
	if (!site) return res.status(404).json({ error: 'Site not found' });

	const deployments = await getDeploymentsBySite(site.id);
	res.json({ deployments });
});

// ─── POST /api/sites/:id/rollback ────────────────────────────────────────────
router.post('/:id/rollback', requireAuth, async (req: Request, res: Response) => {
	const deployment = await rollbackToPrevious(Number(req.params.id), req.userId!);
	if (!deployment) {
		return res.status(404).json({ error: 'No previous deployment available to roll back to' });
	}
	res.json({ deployment });
});

// ─── PUT /api/sites/:id/domain ────────────────────────────────────────────────
// router.put('/:id/domain', requireAuth, async (req: Request, res: Response) => {
// 	const { domain } = req.body as { domain?: string };
// 	if (!domain) return res.status(400).json({ error: '"domain" is required' });
//
// 	const site = await setCustomDomain(Number(req.params.id), req.userId!, domain.trim().toLowerCase());
// 	if (!site) return res.status(404).json({ error: 'Site not found' });
//
// 	res.json({
// 		site,
// 		instructions: `Point an A record for "${domain}" to this server's IP address to verify ownership`,
// 	});
// });

// ─── DELETE /api/sites/:id/domain ────────────────────────────────────────────
// router.delete('/:id/domain', requireAuth, async (req: Request, res: Response) => {
// 	const site = await removeCustomDomain(Number(req.params.id), req.userId!);
// 	if (!site) return res.status(404).json({ error: 'Site not found' });
// 	res.json({ site });
// });

export default router;
