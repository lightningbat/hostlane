import { Check, X, Loader } from 'lucide-react'
import { useDeployStatus } from '@/hooks/useDeployStatus'
import type { DeploymentStatus } from '@/types'
import styles from './DeployProgress.module.scss'

interface Props {
	deploymentId: string
	onDone?: (success: boolean) => void
}

const STEPS: { status: DeploymentStatus; label: string; detail: string }[] = [
	{ status: 'UPLOADED', label: 'Upload received', detail: 'Zip stored on server' },
	{ status: 'EXTRACTING', label: 'Extracting files', detail: 'Unpacking archive contents' },
	{ status: 'VALIDATING', label: 'Validating build', detail: 'Checking index.html & files' },
	{ status: 'LIVE', label: 'Deployment live', detail: '' },
]

const ORDER: Partial<Record<DeploymentStatus, number>> = {
	UPLOADED: 0, EXTRACTING: 1, VALIDATING: 2, READY: 3, LIVE: 4,
}

export function DeployProgress({ deploymentId, onDone }: Props) {
	const { status, message, done } = useDeployStatus(deploymentId)
	const currentOrder = status ? (ORDER[status] ?? -1) : -1

	if (done && onDone) {
		setTimeout(() => onDone(status === 'LIVE'), 1500)
	}

	return (
		<div className={styles['deploy-progress']}>
			<div className={styles['deploy-progress__header']}>
				<span className={styles['deploy-progress__id']}>
					Deploy #{deploymentId}
				</span>
				{status && (
					<span className={[
						styles['deploy-progress__status'],
						status === 'LIVE' ? styles['deploy-progress__status--live'] : '',
						status === 'FAILED' ? styles['deploy-progress__status--failed'] : '',
					].filter(Boolean).join(' ')}>
						{status}
					</span>
				)}
			</div>

			<div className={styles['deploy-progress__steps']}>
				{STEPS.map((step, i) => {
					const stepOrder = ORDER[step.status] ?? i
					const isComplete = currentOrder > stepOrder
					const isActive = currentOrder === stepOrder && status !== 'FAILED'
					const isFailed = status === 'FAILED' && stepOrder === currentOrder

					return (
						<div
							key={step.status}
							className={[
								styles['deploy-progress__step'],
								isComplete ? styles['deploy-progress__step--complete'] : '',
								isActive ? styles['deploy-progress__step--active'] : '',
								isFailed ? styles['deploy-progress__step--failed'] : '',
							].filter(Boolean).join(' ')}
						>
							<div className={styles['deploy-progress__step-icon']}>
								{isFailed ? <X size={11} /> :
									isComplete ? <Check size={11} /> :
										isActive ? <Loader size={11} className={styles['deploy-progress__spinning']} /> :
											<span className={styles['deploy-progress__step-dot']} />}
							</div>

							<div className={styles['deploy-progress__step-body']}>
								<span className={styles['deploy-progress__step-label']}>{step.label}</span>
								<span className={styles['deploy-progress__step-detail']}>{step.detail}</span>
							</div>
						</div>
					)
				})}
			</div>

			{status === 'FAILED' && message && (
				<div className={styles['deploy-progress__error']}>
					<span className={styles['deploy-progress__error-label']}>Error</span>
					<code className={styles['deploy-progress__error-msg']}>{message}</code>
				</div>
			)}
		</div>
	)
}
