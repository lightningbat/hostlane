import type { Request, Response } from 'express';
import { Router } from 'express';
import { createAuthToken, revokeToken, findOrCreateUser, validateToken, getUserById } from '../services/auth.service.js';
import { LoginTicket, OAuth2Client, type TokenPayload } from 'google-auth-library';

const router = Router();


const COOKIE_OPTS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'strict' as const,
	maxAge: 30 * 24 * 60 * 60 * 1_000, // 30 days in ms
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
	throw new Error("Missing GOOGLE_CLIENT_ID in environment variables");
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// auth.routes.ts — add this alongside your existing /google/callback route

router.post('/google/token', async (req: Request, res: Response) => {
	const { token } = req.body as { token?: string }
	if (!token) return res.status(400).json({ error: 'token is required' })

	try {
		let ticket: LoginTicket;
		try {
			ticket = await client.verifyIdToken({
				idToken: token,
				audience: GOOGLE_CLIENT_ID
			})
		} catch (err) {
			console.error('Token auth error:', err)
			return res.status(401).json({ error: 'Invalid token' })
		}

		const payload: TokenPayload | undefined = ticket.getPayload();

		if (!payload) {
			return res.status(400).json({ error: 'Invalid token payload' });
		}

		if (!payload.email_verified) {
			return res.status(400).json({ error: 'Unverifeid email' })
		}

		const user_id = await findOrCreateUser(
			payload.sub,
			payload.email,
			payload.name,
			payload.picture,
		)

		const raw = await createAuthToken(user_id)
		res.cookie('auth_token', raw, COOKIE_OPTS)   // same COOKIE_OPTS you already have
		res.json({ ok: true })
	} catch (err) {
		console.error('Server side error:', err)
		return res.status(500).json({ error: 'Server side error' })
	}
})

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
	const raw = req.cookies?.auth_token as string | undefined;
	if (!raw) return res.json({ user: null });

	const userId = await validateToken(raw);
	if (!userId) return res.json({ user: null });
	//
	const user = await getUserById(userId);
	res.json({ user: user ?? null });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
	const raw = req.cookies?.auth_token as string | undefined;
	if (raw) await revokeToken(raw);
	res.clearCookie('auth_token');
	res.json({ ok: true });
});

export default router;
