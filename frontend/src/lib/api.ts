import type { Site, Deployment, User } from '@/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', ...init?.headers },
		...init,
	})
	if (res.status === 401) {
		window.location.href = '/login'
		throw new Error('Unauthorized')
	}
	const data = await res.json()
	if (!res.ok) throw new Error(data.error || 'Request failed')
	return data
}

export const api = {
	// Auth
	me: () =>
		request<{ user: User | null }>('/auth/me'),
	logout: () =>
		fetch('/auth/logout', { method: 'POST', credentials: 'include' }),

	// Sites
	getSites: () =>
		request<{ sites: Site[] }>('/api/sites'),
	getSite: (id: number) =>
		request<{ site: Site }>(`/api/sites/${id}`),
	createSite: (name: string) =>
		request<{ site: Site }>('/api/sites', {
			method: 'POST',
			body: JSON.stringify({ name }),
		}),
	deleteSite: (id: number) =>
		request<{ ok: boolean }>(`/api/sites/${id}`, { method: 'DELETE' }),
	setDomain: (siteId: number, domain: string) =>
		request<{ site: Site; instructions: string }>(`/api/sites/${siteId}/domain`, {
			method: 'PUT',
			body: JSON.stringify({ domain }),
		}),
	removeDomain: (siteId: number) =>
		request<{ site: Site }>(`/api/sites/${siteId}/domain`, { method: 'DELETE' }),

	// Deployments
	getDeployments: (siteId: number) =>
		request<{ deployments: Deployment[] }>(`/api/sites/${siteId}/deployments`),
	rollback: (siteId: number) =>
		request<{ deployment: Deployment }>(`/api/sites/${siteId}/rollback`, { method: 'POST' }),

	// Deploy — multipart upload with XHR for progress
	deploy: (
		siteId: number,
		file: File,
		onProgress?: (pct: number) => void,
	) =>
		new Promise<{ deployment_id: string; sse_url: string }>(
			(resolve, reject) => {
				const xhr = new XMLHttpRequest()
				const form = new FormData()
				form.append('build', file)

				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable && onProgress)
						onProgress(Math.round((e.loaded / e.total) * 100))
				}
				xhr.onload = () => {
					const data = JSON.parse(xhr.responseText)
					if (xhr.status >= 400) {
						reject(new Error(data.error));
					} else {
						resolve(data);
					}
				}
				xhr.onerror = () => reject(new Error('Upload failed'))
				xhr.open('POST', `/api/deploy/${siteId}`)
				xhr.withCredentials = true
				xhr.send(form)
			},
		),
}
