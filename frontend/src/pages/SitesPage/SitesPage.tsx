import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Plus, Trash2, ExternalLink, ArrowUpRight } from 'lucide-react'
import { api } from '@/lib/api'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Button } from '@/components/ui/Button/Button'
import { EmptyState } from '@/components/ui/EmptyState/EmptyState'
import { useToast } from '@/components/ui/Toast/Toast'
import type { Site } from '@/types'
import styles from './SitesPage.module.scss'

export function SitesPage() {
	const toast = useToast()

	const [sites, setSites] = useState<Site[]>([])
	const [loading, setLoading] = useState(true)
	const [deleting, setDeleting] = useState<number | null>(null)

	useEffect(() => {
		api.getSites()
			.then(({ sites }) => setSites(sites))
			.catch(() => toast.error('Failed to load sites'))
			.finally(() => setLoading(false))
	}, [])

	const handleDelete = async (site: Site, e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (!confirm(`Delete "${site.name}"? All deployments will be removed.`)) return
		setDeleting(site.id)
		try {
			await api.deleteSite(site.id)
			setSites((prev) => prev.filter((s) => s.id !== site.id))
			toast.success(`"${site.name}" deleted`)
		} catch {
			toast.error('Failed to delete site')
		} finally {
			setDeleting(null)
		}
	}

	return (
		<div className={styles['sites-page']}>
			<Topbar
				title="Sites"
				actions={
					<Link to="/sites/new">
						<Button variant="primary" size="sm">
							<Plus size={14} /> New site
						</Button>
					</Link>
				}
			/>

			<div className={styles['sites-page__body']}>
				{loading ? (
					<div className={styles['sites-page__grid']}>
						{[...Array(4)].map((_, i) => (
							<div key={i} className={styles['site-card-skeleton']} />
						))}
					</div>
				) : sites.length === 0 ? (
					<div className={styles['sites-page__empty']}>
						<EmptyState
							icon={<Globe size={20} />}
							title="No sites yet"
							description="Create a site first, then upload your build zip to deploy it."
							action={
								<Link to="/sites/new">
									<Button variant="primary" size="sm">
										<Plus size={14} /> Create your first site
									</Button>
								</Link>
							}
						/>
					</div>
				) : (
					<div className={styles['sites-page__grid']}>
						{sites.map((site) => (
							<Link
								key={site.id}
								to={`/sites/${site.id}`}
								className={styles['site-card']}
							>
								<div className={styles['site-card__header']}>
									<div className={styles['site-card__icon']}>
										<Globe size={14} />
									</div>
									<div className={styles['site-card__actions']}>
										<a
											href={`http://${site.custom_domain || `[your-ip]/${site.subdomain}`}`}
											target="_blank"
											rel="noopener noreferrer"
											className={styles['site-card__action-btn']}
											onClick={(e) => e.stopPropagation()}
											title="Open site"
										>
											<ExternalLink size={13} />
										</a>
										<button
											className={`${styles['site-card__action-btn']} ${styles['site-card__action-btn--danger']}`}
											onClick={(e) => handleDelete(site, e)}
											disabled={deleting === site.id}
											title="Delete site"
										>
											<Trash2 size={13} />
										</button>
									</div>
								</div>

								<div className={styles['site-card__body']}>
									<h3 className={styles['site-card__name']}>{site.name}</h3>
									<span className={styles['site-card__slug']}>{site.subdomain}</span>

									{site.custom_domain && (
										<span className={styles['site-card__domain']}>
											{site.domain_verified ? '✓ ' : '⏳ '}
											{site.custom_domain}
										</span>
									)}
								</div>

								<div className={styles['site-card__footer']}>
									<span className={styles['site-card__date']}>
										Created {new Date(site.created_at).toLocaleDateString()}
									</span>
									<span className={styles['site-card__arrow']}>
										<ArrowUpRight size={13} />
									</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
