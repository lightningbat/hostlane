import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './NewSitePage.module.scss'

export function NewSitePage() {
	const navigate = useNavigate()
	const toast = useToast()

	const [name, setName] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [serverError, setServerError] = useState('')

	const handleNameChange = (v: string) => {
		setName(v)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setServerError('')
		setSubmitting(true)

		try {
			const { site } = await api.createSite(name.trim())
			toast.success(`"${name}" created`)
			// After creation go straight to deploy page
			navigate(`/sites/${site.id}/deploy`)
		} catch (err) {
			setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className={styles['new-site-page']}>
			<Topbar title="New site" />

			<div className={styles['new-site-page__body']}>
				<Link to="/sites" className={styles['new-site-page__back']}>
					<ArrowLeft size={14} /> Back to sites
				</Link>

				<div className={styles['new-site-page__card']}>
					<div className={styles['new-site-page__card-header']}>
						<h2 className={styles['new-site-page__card-title']}>Create a site</h2>
						<p className={styles['new-site-page__card-sub']}>
							After creating your site you'll be taken straight to the deploy page.
						</p>
					</div>

					<form onSubmit={handleSubmit} className={styles['new-site-page__form']}>
						<Input
							label="Site name"
							placeholder="My Portfolio"
							value={name}
							onChange={(e) => handleNameChange(e.target.value)}
							required
							autoFocus
						/>

						{serverError && (
							<p className={styles['new-site-page__server-error']}>{serverError}</p>
						)}

						<div className={styles['new-site-page__actions']}>
							<Link to="/sites">
								<Button variant="ghost" type="button">Cancel</Button>
							</Link>
							<Button
								variant="primary"
								type="submit"
								loading={submitting}
								disabled={!name.trim()}
							>
								Create &amp; go to deploy
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
