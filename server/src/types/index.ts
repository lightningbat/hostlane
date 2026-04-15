// ─── Domain models ───────────────────────────────────────────────────────────

export interface User {
	id: number;
	google_id: string;
	email: string;
	name: string;
	avatar_url: string | null;
	created_at: Date;
}

export interface AuthToken {
	id: number;
	user_id: number;
	token_hash: string;
	expires_at: Date;
	revoked: boolean;
	created_at: Date;
}

export interface Site {
	id: number;
	user_id: number;
	slug: string;
	name: string;
	created_at: Date;
}

export type DeploymentStatus =
	| 'UPLOADED'
	| 'EXTRACTING'
	| 'VALIDATING'
	| 'READY'
	| 'LIVE'
	| 'FAILED'
	| 'ARCHIVED';

export interface Deployment {
	id: string;
	site_id: number;
	version: string;
	status: DeploymentStatus;
	zip_path: string;
	deploy_dir: string | null;
	error_msg: string | null;
	created_at: Date;
}

// ─── Worker IPC ──────────────────────────────────────────────────────────────

export interface WorkerJob {
	deployment_id: string;
	site_id: number;
	zip_path: string;
	target_dir: string;
}

// Messages the Go worker sends back over stdout (one JSON line each)
export type WorkerMessage = WorkerStageUpdate | WorkerResult;

export interface WorkerStageUpdate {
	type: 'stage';
	deployment_id: string;
	stage: 'EXTRACTING' | 'VALIDATING';
}

export interface WorkerResult {
	type: 'result';
	deployment_id: string;
	result_ok: boolean;
	error?: string;
	failed_stage?: string;
}

// ─── Express augmentation ────────────────────────────────────────────────────

declare global {
	namespace Express {
		interface Request {
			userId?: number;
			user?: User;
		}
	}
}
