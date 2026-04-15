import { promises as fs } from "fs";
import { exec } from "child_process";
import { siteDir, nginxDir, defaultSite } from "../utils/paths.utils.js";
import path from "path";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN
// const template_path = '../templates/nginx/site.conf.template'
const template_path = path.join(import.meta.dirname, '..', 'templates', 'nginx', 'site.conf.template')

const template = await fs.readFile(template_path, 'utf8')

let reloadScheduled = false;
let reloadInProgress = false;

export function scheduleReload(delay = 500) {
	if (reloadScheduled) return;

	reloadScheduled = true;

	setTimeout(() => {
		reloadScheduled = false;
		runReload();
	}, delay);
}

function runReload() {
	if (reloadInProgress) {
		// queue another reload after current one
		reloadScheduled = true;
		return;
	}

	reloadInProgress = true;

	console.log("[Nginx] Reload started");

	exec("sudo /usr/local/bin/hostlane-nginx-reload.sh", (err, _, stderr) => {
		reloadInProgress = false;

		if (err) {
			console.error("[Nginx] Reload failed:", err.message);
			return;
		}

		if (stderr) {
			console.warn("[Nginx] stderr:", stderr);
		}

		console.log("[Nginx] Reload successful");

		// If something was scheduled during reload → run again
		if (reloadScheduled) {
			reloadScheduled = false;
			runReload();
		}
	});
}

export async function removeNginxConfigForSite(siteId: number) {
	const filePath = path.join(nginxDir, `${siteId}.conf`);

	await fs.unlink(filePath).catch(err => {
		if (err.code !== "ENOENT") throw err;
	});

	scheduleReload()
}

function buildServerName(subdomain: string): string {
	return `${subdomain}.${ROOT_DOMAIN}`;
}

function buildConfig(params: {
	serverName: string;
	rootPath: string;
}): string {
	const { serverName, rootPath } = params;

	return template
		.replace("${serverName}", serverName)
		.replace("${rootPath}", rootPath)
		.trim();
}

export async function generateNginxConfigForSite(opts: {
	siteId: number;
	subdomain: string;
}): Promise<void> {
	console.log("got req for ", opts)
	const { siteId, subdomain } = opts;

	const serverName = buildServerName(subdomain);
	console.log('1')

	const site_storage_dir = siteDir(siteId)
	console.log('2')
	const site_symlink = path.join(site_storage_dir, 'current')
	console.log('3')

	// Creaetes storage dir for the site
	// e.g. /basePath/sites/{site_id}
	try {
		await fs.mkdir(site_storage_dir, {recursive: true})
		console.log("storage dir created", site_storage_dir)
	} catch (err) {
		console.error(err)
	}
	// symlink site page to defaultSite
	await fs.symlink(defaultSite, site_symlink)
	console.log("linked to defaultSite")

	const config = buildConfig({ serverName, rootPath: site_symlink });

	const filePath = path.join(nginxDir, `${siteId}.conf`);
	const tmpPath = filePath + ".tmp";


	try {
		await fs.writeFile(tmpPath, config, "utf-8");
		await fs.rename(tmpPath, filePath);
	} catch (err) {
		console.error(err)
	}

	scheduleReload()
}
