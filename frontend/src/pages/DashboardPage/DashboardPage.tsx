import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Rocket, ArrowUpRight, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Badge } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import { EmptyState } from '@/components/ui/EmptyState/EmptyState'
import type { Site, Deployment } from '@/types'
import styles from './DashboardPage.module.scss'

interface SiteWithLatest extends Site {
	latest: Deployment | null
}

export function DashboardPage() {
	const { user } = useAuth()
	const [rows, setRows] = useState<SiteWithLatest[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		api.getSites().then(async ({ sites }) => {
			const enriched = await Promise.all(
				sites.map(async (s) => {
					try {
						const { deployments } = await api.getDeployments(s.id)
						return { ...s, latest: deployments[0] ?? null }
					} catch {
						return { ...s, latest: null }
					}
				}),
			)
			setRows(enriched)
		}).finally(() => setLoading(false))
	}, [])

	const liveSites = rows.filter((r) => r.latest?.status === 'LIVE')

	const hour = new Date().getHours()
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
	const firstName = user?.name?.split(' ')[0] ?? ''

	return (
		<div className={styles['dashboard-page']}>
			<Topbar
				title="Dashboard"
				actions={
					<Link to="/sites/new">
						<Button variant="primary" size="sm">
							<Plus size={14} /> New site
						</Button>
					</Link>
				}
			/>

			<div className={styles['dashboard-page__body']}>
				{/* Greeting */}
				<div className={styles['dashboard-page__greeting']}>
					<h2 className={styles['dashboard-page__greeting-text']}>
						{greeting}, {firstName}
					</h2>
					<p className={styles['dashboard-page__greeting-sub']}>
						{liveSites.length === 0
							? 'Create your first site to get started'
							: `${liveSites.length} site${liveSites.length !== 1 ? 's' : ''} live`}
					</p>
				</div>

				{/* Stats row */}
				<div className={styles['dashboard-page__stats']}>
					<div className={styles['stat-card']}>
						<div className={styles['stat-card__icon']}>
							<Globe size={16} />
						</div>
						<div className={styles['stat-card__body']}>
							<span className={styles['stat-card__value']}>
								{loading ? '—' : rows.length}
							</span>
							<span className={styles['stat-card__label']}>Total sites</span>
						</div>
					</div>

					<div className={styles['stat-card']}>
						<div className={`${styles['stat-card__icon']} ${styles['stat-card__icon--green']}`}>
							<Rocket size={16} />
						</div>
						<div className={styles['stat-card__body']}>
							<span className={styles['stat-card__value']}>
								{loading ? '—' : liveSites.length}
							</span>
							<span className={styles['stat-card__label']}>Live</span>
						</div>
					</div>
				</div>

				{/* Sites table */}
				<div className={styles['dashboard-page__section']}>
					<h3 className={styles['dashboard-page__section-title']}>Sites</h3>

					{loading ? (
						<div className={styles['sites-table']}>
							{[...Array(3)].map((_, i) => (
								<div key={i} className={styles['sites-table__skeleton']} />
							))}
						</div>
					) : rows.length === 0 ? (
						<div className={styles['sites-table']}>
							<EmptyState
								icon={<Globe size={20} />}
								title="No sites yet"
								description="Create a site and deploy your first build to see it here."
								action={
									<Link to="/sites/new">
										<Button variant="primary" size="sm">
											<Plus size={14} /> Create site
										</Button>
									</Link>
								}
							/>
						</div>
					) : (
						<div className={styles['sites-table']}>
							<div className={styles['sites-table__header']}>
								<span>Site</span>
								<span>Status</span>
								<span>Version</span>
								<span>Deployed</span>
								<span />
							</div>

							{rows.map((row) => (
								<Link
									key={row.id}
									to={`/sites/${row.id}`}
									className={styles['sites-table__row']}
								>
									<div className={styles['sites-table__cell-site']}>
										<span className={styles['sites-table__site-name']}>{row.name}</span>
										<span className={styles['sites-table__site-slug']}>{row.subdomain}</span>
									</div>

									<div>
										{row.latest
											? <Badge status={row.latest.status} />
											: <span className={styles['sites-table__no-deploy']}>No deploys</span>}
									</div>

									<div className={styles['sites-table__mono']}>
										{row.latest?.version ?? '—'}
									</div>

									<div className={styles['sites-table__date']}>
										{row.latest
											? new Date(row.latest.created_at).toLocaleDateString()
											: '—'}
									</div>

									<div className={styles['sites-table__arrow']}>
										<ArrowUpRight size={14} />
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
