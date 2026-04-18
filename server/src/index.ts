import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import fileUpload from 'express-fileupload';

import authRoutes from './routes/auth.routes.js';
import sitesRoutes from './routes/sites.routes.js';
import deployRoutes from './routes/deploy.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { recoverOnBoot } from './workers/worker-manager.js';
import { bootstrap } from './bootstrap.js';
import pool from './db/pool.js';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// ─── Security & logging ───────────────────────────────────────────────────────
// app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── File uploads ─────────────────────────────────────────────────────────────
app.use(fileUpload({
	limits: { fileSize: 25 * 1024 * 1024 }, // hard cap — route re-checks with env value
	useTempFiles: false,
	abortOnLimit: true,
	responseOnLimit: JSON.stringify({ error: 'File too large' }),
}));


// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/deploy', deployRoutes);

// Health check (used by Docker / load balancer)
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));


// Serve the static files from the frontend build folder
const frontendPath = path.join(import.meta.dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

app.get(/.*/, (_, res) => res.sendFile(path.join(frontendPath, 'index.html') ));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot(): Promise<void> {
	// // Initialize required base assets
	await bootstrap()
	// Verify DB connectivity before accepting traffic
	await pool.query('SELECT 1');
	console.log('[Boot] Database connected');

	// Recover any deployments left in-flight from the previous run
	await recoverOnBoot();

	app.listen(PORT, () => {
		console.log(`[Boot] Hostlane server listening on port ${PORT}`);
		console.log(`[Boot] Environment: ${process.env.NODE_ENV ?? 'development'}`);
	});
}

boot().catch((err) => {
	console.error('[Boot] Fatal:', err);
	process.exit(1);
});
