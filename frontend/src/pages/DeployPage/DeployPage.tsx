import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Button } from '@/components/ui/Button/Button'
import { DropZone } from '@/components/deploy/DropZone/DropZone'
import { DeployProgress } from '@/components/deploy/DeployProgress/DeployProgress'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './DeployPage.module.scss'

type Phase = 'idle' | 'uploading' | 'processing' | 'done'

export function DeployPage() {
	const { siteId } = useParams<{ siteId: string }>()
	const toast = useToast()

	const [file, setFile] = useState<File | null>(null)
	const [phase, setPhase] = useState<Phase>('idle')
	const [uploadPct, setUploadPct] = useState(0)
	const [deploymentId, setDeploymentId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const id = Number(siteId)

	const handleFile = useCallback((f: File) => {
		setFile(f)
		setError(null)
	}, [])

	const handleDeploy = async () => {
		if (!file || !id) return
		setError(null)
		setPhase('uploading')
		setUploadPct(0)

		try {
			const result = await api.deploy(id, file, (pct) => setUploadPct(pct))
			setDeploymentId(result.deployment_id)
			setPhase('processing')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Upload failed')
			setPhase('idle')
		}
	}

	const handleDeployDone = (success: boolean) => {
		setPhase('done')
		if (success) {
			toast.success('Deployment live!')
		} else {
			toast.error('Deployment failed')
		}
	}

	const handleDeployAnother = () => {
		setFile(null)
		setPhase('idle')
		setDeploymentId(null)
		setUploadPct(0)
		setError(null)
	}

	return (
		<div className={styles['deploy-page']}>
			<Topbar title="Deploy" />

			<div className={styles['deploy-page__body']}>
				<Link to={`/sites/${id}`} className={styles['deploy-page__back']}>
					<ArrowLeft size={14} /> Back to site
				</Link>

				<div className={styles['deploy-page__layout']}>
					{/* Left: upload panel */}
					<div className={styles['deploy-page__upload-panel']}>
						<div className={styles['deploy-page__panel-header']}>
							<h2 className={styles['deploy-page__panel-title']}>Upload build</h2>
							<p className={styles['deploy-page__panel-sub']}>
								Zip your build output and drop it below. Must contain an{' '}
								<code className={styles['deploy-page__code']}>index.html</code> at the root.
							</p>
						</div>

						<DropZone
							onFile={handleFile}
							disabled={phase === 'uploading' || phase === 'processing'}
						/>

						{error && (
							<p className={styles['deploy-page__error']}>{error}</p>
						)}

						{phase === 'uploading' && (
							<div className={styles['deploy-page__upload-progress']}>
								<div className={styles['deploy-page__progress-bar']}>
									<div
										className={styles['deploy-page__progress-fill']}
										style={{ width: `${uploadPct}%` }}
									/>
								</div>
								<span className={styles['deploy-page__progress-label']}>
									Uploading… {uploadPct}%
								</span>
							</div>
						)}

						{phase === 'idle' && (
							<Button
								variant="primary"
								onClick={handleDeploy}
								disabled={!file}
								className={styles['deploy-page__submit']}
							>
								Deploy
							</Button>
						)}

						{phase === 'done' && (
							<div className={styles['deploy-page__done-actions']}>
								<Link to={`/sites/${id}`}>
									<Button variant="secondary">View site</Button>
								</Link>
								<Button variant="ghost" onClick={handleDeployAnother}>
									Deploy another version
								</Button>
							</div>
						)}
					</div>

					{/* Right: progress panel */}
					<div className={styles['deploy-page__progress-panel']}>
						<div className={styles['deploy-page__panel-header']}>
							<h2 className={styles['deploy-page__panel-title']}>Deployment log</h2>
							<p className={styles['deploy-page__panel-sub']}>
								Live status updates.
							</p>
						</div>

						{deploymentId ? (
							<DeployProgress
								deploymentId={deploymentId}
								onDone={handleDeployDone}
							/>
						) : (
							<div className={styles['deploy-page__log-placeholder']}>
								<p className={styles['deploy-page__log-placeholder-text']}>
									Deploy log will appear here once you upload a build.
								</p>
							</div>
						)}

						{phase === 'done' && deploymentId && (
							<div className={styles['deploy-page__live-banner']}>
								<CheckCircle size={16} />
								Site is live
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
