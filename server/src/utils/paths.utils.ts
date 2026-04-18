import path from 'path';

const ROOT_STORAGE = process.env.ROOT_STORAGE || '/var/lib/hostlane';

export function siteDir(siteId: number): string {
	return path.join(ROOT_STORAGE, 'sites', `site_${siteId}`);
}

export function uploadPath(siteId: number, deploymentId: string): string {
	return path.join(siteDir(siteId), 'uploads', `deploy_${deploymentId}.zip`);
}

export function deployDir(siteId: number, deploymentId: string): string {
	return path.join(siteDir(siteId), 'deployments', `deploy_${deploymentId}`);
}

export function liveLink(siteId: number): string {
	return path.join(siteDir(siteId), 'current');
}

// Storage path for storing generated site's nginx config
export const nginxDir = path.join(ROOT_STORAGE, 'config')

export const defaultSite = path.join(ROOT_STORAGE, 'default-page')
