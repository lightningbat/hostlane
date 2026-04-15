import { ChildProcess, spawn } from 'child_process';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import type {
	WorkerJob,
	WorkerMessage,
	WorkerStageUpdate,
	WorkerResult,
	Deployment,
	DeploymentStatus,
} from '../types/index.js';
import {
	updateDeploymentStatus,
	getDeploymentById,
	getUnfinishedDeployments,
	promoteToLive,
} from '../services/deployment.service.js';

import { deployDir } from '../utils/paths.utils.js';
import path from 'path';

const WORKER_BIN = path.join(import.meta.dirname, '..', '..', '..', 'worker', 'bin', 'worker');
const MAX_WORKERS = Number(process.env.MAX_WORKERS || 3);

// ─── SSE event bus ───────────────────────────────────────────────────────────
// Routes emit `deployment:<id>` events that the SSE route subscribes to.

export const deployEvents = new EventEmitter();
deployEvents.setMaxListeners(200);

export interface DeployEvent {
	deployment_id: string;
	status: string;
	message?: string;
}

function emit(deploymentId: string, status: string, message?: string) {
	const event: DeployEvent = {
		deployment_id: deploymentId,
		status
	};

	if (message !== undefined) {
		event.message = message;
	}
	deployEvents.emit(`deployment:${deploymentId}`, event);
}

// ─── Queue & active-job tracking ─────────────────────────────────────────────

const queue: WorkerJob[] = [];

// workerId → the deployment it is currently processing
const activeJobs = new Map<number, { deploymentId: string; process: ChildProcess }>();
let nextWorkerId = 1;

// ─── Public API ───────────────────────────────────────────────────────────────

export function enqueue(job: WorkerJob): void {
	queue.push(job);
	console.log(`[Queue] Enqueued deployment ${job.deployment_id} · queue depth: ${queue.length}`);
	drain();
}

// ─── Internal queue drain ─────────────────────────────────────────────────────

function drain(): void {
	while (activeJobs.size < MAX_WORKERS && queue.length > 0) {
		const job = queue.shift()!;
		console.log("JOB: ", job)
		spawnWorker(job);
	}
}

// ─── Worker spawn ─────────────────────────────────────────────────────────────

function spawnWorker(job: WorkerJob): void {
	const id = nextWorkerId++;

	const child = spawn(WORKER_BIN, [], {
		stdio: ['pipe', 'pipe', 'pipe'],
	});

	activeJobs.set(id, { deploymentId: job.deployment_id, process: child });
	console.log(`[Worker ${id}] Spawned · deployment ${job.deployment_id}`);

	// Send the job as a single JSON line on stdin then close it
	child.stdin.write(JSON.stringify(job) + '\n');
	child.stdin.end();

	// Read newline-delimited JSON from stdout
	let buf = '';
	child.stdout.on('data', (chunk: Buffer) => {
		buf += chunk.toString();
		const lines = buf.split('\n');
		buf = lines.pop() ?? '';          // keep incomplete last line in buffer

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			let msg: WorkerMessage;
			try {
				msg = JSON.parse(trimmed) as WorkerMessage;
			} catch {
				console.warn(`[Worker ${id}] Non-JSON stdout:`, trimmed);
				continue;
			}
			handleMessage(id, msg).catch(console.error);
		}
	});

	child.stderr.on('data', (d: Buffer) =>
		console.error(`[Worker ${id}] stderr:`, d.toString().trim()),
	);

	child.on('exit', (code, signal) => {
		const entry = activeJobs.get(id);
		activeJobs.delete(id);

		if (code === 0) {
			console.log(`[Worker ${id}] Exited cleanly`);
		} else {
			console.error(`[Worker ${id}] Crashed · code=${code} signal=${signal}`);
			if (entry) {
				handleCrash(entry.deploymentId).catch(console.error);
			}
		}

		drain(); // try to start the next job
	});
}

// ─── Handle messages from the Go worker ───────────────────────────────────────

async function handleMessage(workerId: number, msg: WorkerMessage): Promise<void> {
	if (msg.type === 'stage') {
		const m = msg as WorkerStageUpdate;
		await updateDeploymentStatus(m.deployment_id, m.stage);
		emit(m.deployment_id, m.stage);
		console.log(`[Worker ${workerId}] Deployment ${m.deployment_id} → ${m.stage}`);
		return;
	}

	if (msg.type === 'result') {
		const m = msg as WorkerResult;
		console.log("msgg: ", m)
		console.log(`[Worker ${workerId}] Deployment ${m.deployment_id} → ${m.result_ok ? 'Successed': 'Failed'}`);

		console.log("ENTER result block");
		if (m.result_ok) {
			console.log("onSuccess")
			await onSuccess(m.deployment_id);
		} else {
			console.log("onFailure")
			await onFailure(m.deployment_id, m.error ?? 'Worker reported failure', m.failed_stage);
		}
	}
}

async function onSuccess(deploymentId: string): Promise<void> {
	const dep = await getDeploymentById(deploymentId);
	if (!dep) return;

	// Worker has already extracted; fill in deploy_dir so promoteToLive knows where to point
	await updateDeploymentStatus(deploymentId, 'READY', {
		deploy_dir: deployDir(dep.site_id, dep.id),
	});

	await promoteToLive({ ...dep, status: 'READY', deploy_dir: deployDir(dep.site_id, dep.id) });

	emit(deploymentId, 'LIVE');
}

async function onFailure(
	deploymentId: string,
	errorMsg: string,
	failedStage?: string,
): Promise<void> {
	await updateDeploymentStatus(deploymentId, 'FAILED', { error_msg: errorMsg });
	emit(deploymentId, 'FAILED', errorMsg);
	console.error(`[Deploy ${deploymentId}] FAILED at ${failedStage ?? 'unknown stage'}: ${errorMsg}`);
}

// ─── Single-worker crash recovery (Node is still alive) ───────────────────────

async function handleCrash(deploymentId: string): Promise<void> {
	console.log(`[Crash Recovery] Deployment ${deploymentId}`);

	const dep = await getDeploymentById(deploymentId);
	if (!dep) return;

	switch (dep.status as DeploymentStatus) {
		case 'EXTRACTING': {
			// Partial extraction — delete folder, reset to UPLOADED, retry
			const dir = deployDir(dep.site_id, dep.id);
			await fs.rm(dir, { recursive: true, force: true }).catch(() => { });
			await updateDeploymentStatus(deploymentId, 'UPLOADED');
			emit(deploymentId, 'UPLOADED', 'Worker crashed during extraction — retrying');
			enqueue(makeJob(dep));
			break;
		}

		case 'VALIDATING': {
			// Files are intact, just re-run from beginning (worker is stateless)
			await updateDeploymentStatus(deploymentId, 'UPLOADED');
			emit(deploymentId, 'UPLOADED', 'Worker crashed during validation — retrying');
			enqueue(makeJob(dep));
			break;
		}

		case 'UPLOADED':
		case 'READY': {
			// Safe to retry directly
			enqueue(makeJob(dep));
			break;
		}

		default:
			// LIVE / FAILED / ARCHIVED — nothing to do
			break;
	}
}

// ─── Boot-time recovery (full server restart) ─────────────────────────────────

export async function recoverOnBoot(): Promise<void> {
	console.log('[Boot Recovery] Scanning for unfinished deployments…');

	const unfinished = await getUnfinishedDeployments();

	if (unfinished.length === 0) {
		console.log('[Boot Recovery] Nothing to recover.');
		return;
	}

	console.log(`[Boot Recovery] Found ${unfinished.length} unfinished deployments`);

	for (const dep of unfinished) {
		await recoverDeployment(dep);
	}
}

async function recoverDeployment(dep: Deployment): Promise<void> {
	const dir = deployDir(dep.site_id, dep.id);

	switch (dep.status as DeploymentStatus) {
		case 'UPLOADED': {
			console.log(`  · ${dep.id} UPLOADED → requeue`);
			enqueue(makeJob(dep));
			break;
		}

		case 'EXTRACTING': {
			const exists = await fs.access(dir).then(() => true).catch(() => false);
			if (exists) {
				console.log(`  · ${dep.id} EXTRACTING (partial folder) → clean up → requeue`);
				await fs.rm(dir, { recursive: true, force: true });
			} else {
				console.log(`  · ${dep.id} EXTRACTING (no folder) → requeue`);
			}
			await updateDeploymentStatus(dep.id, 'UPLOADED');
			enqueue(makeJob(dep));
			break;
		}

		case 'VALIDATING': {
			console.log(`  · ${dep.id} VALIDATING → requeue`);
			await updateDeploymentStatus(dep.id, 'UPLOADED');
			enqueue(makeJob(dep));
			break;
		}

		case 'READY': {
			// Extraction & validation done — just need the symlink switch
			const exists = await fs.access(dir).then(() => true).catch(() => false);
			if (exists) {
				console.log(`  · ${dep.id} READY → promoting to LIVE`);
				await promoteToLive({ ...dep, deploy_dir: dir });
			} else {
				console.log(`  · ${dep.id} READY but deploy dir missing → FAILED`);
				await updateDeploymentStatus(dep.id, 'FAILED', {
					error_msg: 'Deploy directory missing after server restart',
				});
			}
			break;
		}
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJob(dep: Deployment): WorkerJob {
	return {
		deployment_id: dep.id,
		site_id: dep.site_id,
		zip_path: dep.zip_path,
		target_dir: deployDir(dep.site_id, dep.id),
	};
}
