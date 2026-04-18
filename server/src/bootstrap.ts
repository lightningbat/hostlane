import { promises as fs } from "fs";
import path from "path";

const ROOT = process.env.ROOT_STORAGE || '/var/lib/hostlane';

export async function bootstrap() {
	console.log("[Bootstrap] Starting...");

	// Copy default-page if missing
	const defaultSrc = path.join(import.meta.dirname, '..', '..', 'default-page');
	const defaultDest = path.join(ROOT, "default-page");
	
	try {
		await fs.access(defaultDest);
	} catch {
		console.log("[Bootstrap] Installing default-page...");
		await fs.cp(defaultSrc, defaultDest, { recursive: true });
	}

	// Ensure config dir
	const configDir = path.join(ROOT, "config");
	await fs.mkdir(configDir, { recursive: true });

	// Copy catch-all nginx config if missing
	const confSrc = path.join(import.meta.dirname, '..', '..', '00-global-redirect.conf');
	const confDest = path.join(configDir, "00-global-redirect.conf");

	try {
		await fs.access(confDest);
	} catch {
		console.log("[Bootstrap] Installing 00-global-redirect.conf...");
		await fs.copyFile(confSrc, confDest);
	}

	console.log("[Bootstrap] Done");
}
