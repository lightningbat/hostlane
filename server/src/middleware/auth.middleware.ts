import type { Request, Response, NextFunction } from 'express';
import { validateToken, getUserById } from '../services/auth.service.js';

export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const raw = req.cookies?.auth_token as string | undefined;

	if (!raw) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}

	const userId = await validateToken(raw);
	if (!userId) {
		res.clearCookie('auth_token');
		res.status(401).json({ error: 'Session expired or invalid' });
		return;
	}

	const user = await getUserById(userId);
	if (!user) {
		res.status(401).json({ error: 'User not found' });
		return;
	}

	req.userId = userId;
	req.user = user;
	next();
}
