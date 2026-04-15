import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Rocket, RotateCcw, Globe, Trash2, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { Spinner } from '@/components/ui/Spinner/Spinner'
// import { Input } from '@/components/ui/Input/Input'
import { useToast } from '@/components/ui/Toast/Toast'
import type { Site, Deployment } from '@/types'
import styles from './SiteDetailPage.module.scss'

export function SiteDetailPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const toast = useToast()
	const siteId = Number(id)

	const [site, setSite] = useState<Site | null>(null)
	const [deployments, setDeployments] = useState<Deployment[]>([])
	const [loading, setLoading] = useState(true)
	const [rollingBack, setRollingBack] = useState(false)
	const [deleting, setDeleting] = useState(false)

	// Domain form
	const [domain, setDomain] = useState('')
	// const [savingDomain, setSavingDomain] = useState(false)

	useEffect(() => {
		Promise.all([
			api.getSite(siteId),
			api.getDeployments(siteId),
		]).then(([{ site }, { deployments }]) => {
			setSite(site)
			setDomain(site.custom_domain ?? '')
			setDeployments(deployments)
		}).catch(() => toast.error('Failed to load site'))
			.finally(() => setLoading(false))
	}, [siteId])

	const handleRollback = async () => {
		if (!confirm('Roll back to the previous deployment?')) return
		setRollingBack(true)
		try {
			await api.rollback(siteId)
			const { deployments } = await api.getDeployments(siteId)
			setDeployments(deployments)
			toast.success('Rolled back successfully')
		} catch {
			toast.error('No previous deployment to roll back to')
		} finally {
			setRollingBack(false)
		}
	}

	const handleDelete = async () => {
		if (!confirm(`Delete "${site?.name}"? This cannot be undone.`)) return
		setDeleting(true)
		try {
			await api.deleteSite(siteId)
			toast.success('Site deleted')
			navigate('/sites')
		} catch {
			toast.error('Failed to delete site')
			setDeleting(false)
		}
	}

	// const handleSaveDomain = async (e: React.FormEvent) => {
	// 	e.preventDefault()
	// 	setSavingDomain(true)
	// 	try {
	// 		if (domain.trim()) {
	// 			const { site: updated } = await api.setDomain(siteId, domain.trim())
	// 			setSite(updated)
	// 			toast.success('Custom domain saved')
	// 		} else {
	// 			const { site: updated } = await api.removeDomain(siteId)
	// 			setSite(updated)
	// 			setDomain('')
	// 			toast.success('Custom domain removed')
	// 		}
	// 	} catch {
	// 		toast.error('Failed to update domain')
	// 	} finally {
	// 		setSavingDomain(false)
	// 	}
	// }

	if (loading) {
		return (
			<div className={styles['site-detail-page']}>
				<Topbar title="Site" />
				<div className={styles['site-detail-page__loading']}>
					<Spinner size="md" />
				</div>
			</div>
		)
	}

	if (!site) {
		return (
			<div className={styles['site-detail-page']}>
				<Topbar title="Site not found" />
				<div className={styles['site-detail-page__body']}>
					<p className={styles['site-detail-page__not-found']}>
						This site does not exist or you don't have access.
					</p>
					<Link to="/sites">
						<Button variant="secondary">Back to sites</Button>
					</Link>
				</div>
			</div>
		)
	}

	const liveDeploy = deployments.find((d) => d.status === 'LIVE')
	const archivedDeploys = deployments.filter((d) => d.status === 'ARCHIVED')

	return (
		<div className={styles['site-detail-page']}>
			<Topbar
				title={site.name}
				actions={
					<Link to={`/sites/${siteId}/deploy`}>
						<Button variant="primary" size="sm">
							<Rocket size={14} /> Deploy new version
						</Button>
					</Link>
				}
			/>

			<div className={styles['site-detail-page__body']}>
				<Link to="/sites" className={styles['site-detail-page__back']}>
					<ArrowLeft size={14} /> All sites
				</Link>

				<div className={styles['site-detail-page__grid']}>
					{/* ── Left column ── */}
					<div className={styles['site-detail-page__left']}>

						{/* Overview card */}
						<div className={styles['detail-card']}>
							<div className={styles['detail-card__header']}>
								<h3 className={styles['detail-card__title']}>Overview</h3>
							</div>
							<div className={styles['detail-card__body']}>
								<div className={styles['detail-row']}>
									<span className={styles['detail-row__label']}>Name</span>
									<span className={styles['detail-row__value']}>{site.name}</span>
								</div>
								<div className={styles['detail-row']}>
									<span className={styles['detail-row__label']}>Subdomain</span>
									<code className={styles['detail-row__mono']}>{site.subdomain}</code>
								</div>
								<div className={styles['detail-row']}>
									<span className={styles['detail-row__label']}>Status</span>
									{liveDeploy
										? <Badge status="LIVE" />
										: <span className={styles['detail-row__dim']}>Not deployed</span>}
								</div>
								<div className={styles['detail-row']}>
									<span className={styles['detail-row__label']}>Live deploy</span>
									<code className={styles['detail-row__mono']}>
										{liveDeploy?.version ?? '—'}
									</code>
								</div>
								<div className={styles['detail-row']}>
									<span className={styles['detail-row__label']}>Created</span>
									<span className={styles['detail-row__value']}>
										{new Date(site.created_at).toLocaleDateString()}
									</span>
								</div>
							</div>

							{liveDeploy && (
								<div className={styles['detail-card__footer']}>
									<a
										href={`https://${site.subdomain}.hostlane.krynix.xyz`}
										target="_blank"
										rel="noopener noreferrer"
										className={styles['detail-card__link']}
									>
										<ExternalLink size={13} />
										Open live site
									</a>
								</div>
							)}
						</div>

						{/* Custom domain card */}
						{/* <div className={styles['detail-card']}> */}
						{/* 	<div className={styles['detail-card__header']}> */}
						{/* 		<h3 className={styles['detail-card__title']}>Custom domain</h3> */}
						{/* 	</div> */}
						{/* 	<form onSubmit={handleSaveDomain} className={styles['detail-card__body']}> */}
						{/* 		<Input */}
						{/* 			label="Domain" */}
						{/* 			placeholder="example.com" */}
						{/* 			value={domain} */}
						{/* 			onChange={(e) => setDomain(e.target.value)} */}
						{/* 			hint={ */}
						{/* 				site.custom_domain */}
						{/* 					? site.domain_verified */}
						{/* 						? `✓ Verified · SSL: ${site.ssl_status}` */}
						{/* 						: `Point an A record for ${site.custom_domain} to this server's IP` */}
						{/* 					: 'Leave empty to remove the custom domain' */}
						{/* 			} */}
						{/* 		/> */}
						{/* 		<div className={styles['detail-card__actions']}> */}
						{/* 			<Button */}
						{/* 				variant="secondary" */}
						{/* 				size="sm" */}
						{/* 				type="submit" */}
						{/* 				loading={savingDomain} */}
						{/* 			> */}
						{/* 				<Globe size={13} /> */}
						{/* 				{domain ? 'Save domain' : 'Remove domain'} */}
						{/* 			</Button> */}
						{/* 		</div> */}
						{/* 	</form> */}
						{/* </div> */}

						{/* Danger zone */}
						<div className={`${styles['detail-card']} ${styles['detail-card--danger']}`}>
							<div className={styles['detail-card__header']}>
								<h3 className={styles['detail-card__title']}>Danger zone</h3>
							</div>
							<div className={styles['detail-card__body']}>
								<div className={styles['danger-row']}>
									<div>
										<p className={styles['danger-row__label']}>Delete site</p>
										<p className={styles['danger-row__desc']}>
											Permanently deletes all deployments. This cannot be undone.
										</p>
									</div>
									<Button
										variant="danger"
										size="sm"
										onClick={handleDelete}
										loading={deleting}
									>
										<Trash2 size={13} /> Delete
									</Button>
								</div>
							</div>
						</div>
					</div>

					{/* ── Right column: deployments ── */}
					<div className={styles['site-detail-page__right']}>
						<div className={styles['detail-card']}>
							<div className={styles['detail-card__header']}>
								<h3 className={styles['detail-card__title']}>Deployments</h3>
								{archivedDeploys.length > 0 && (
									<Button
										variant="ghost"
										size="sm"
										onClick={handleRollback}
										loading={rollingBack}
									>
										<RotateCcw size={13} /> Rollback
									</Button>
								)}
							</div>

							{deployments.length === 0 ? (
								<div className={styles['deploy-empty']}>
									<p className={styles['deploy-empty__text']}>No deployments yet.</p>
									<Link to={`/sites/${siteId}/deploy`}>
										<Button variant="primary" size="sm">
											<Rocket size={14} /> Deploy now
										</Button>
									</Link>
								</div>
							) : (
								<div className={styles['deploy-list']}>
									{deployments.map((dep) => (
										<div key={dep.id} className={styles['deploy-item']}>
											<div className={styles['deploy-item__left']}>
												<Badge status={dep.status} />
												<code className={styles['deploy-item__version']}>{dep.version}</code>
											</div>
											<div className={styles['deploy-item__right']}>
												<span className={styles['deploy-item__date']}>
													{new Date(dep.created_at).toLocaleDateString()}
												</span>
												<span className={styles['deploy-item__time']}>
													{new Date(dep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
