import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
	Upload,
	Globe,
	RotateCcw,
	ShieldCheck,
	ArrowRight,
	Zap,
	Lock,
	ExternalLink,
} from 'lucide-react'
import { Icon } from '@iconify/react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './LoginPage.module.scss'

const GITHUB_URL = 'https://github.com/lightningbat'
const REPO_URL = 'https://github.com/lightningbat/hostlane'

export function LoginPage() {
	const { user, loading, refresh } = useAuth()
	const toast = useToast()
	const navigate = useNavigate()

	useEffect(() => {
		if (!loading && user) navigate('/dashboard', { replace: true })
	}, [user, loading, navigate])

	async function handleOnSuccess(credentialResponse: CredentialResponse) {
		try {
			const res = await fetch('/auth/google/token', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: credentialResponse.credential }),
			})
			if (!res.ok) {
				const { error } = await res.json()
				toast.error(error)
			}
			refresh()
		} catch (err) {
			console.error('Login failed:', err)
			toast.error("An unexpected error occurred")
		}
	}

	return (
		<div className={styles.landing}>

			{/* ── Navbar ─────────────────────────────────────────── */} <nav className={styles['landing__nav']}>
				<div className={styles['landing__nav-inner']}>
					<div className={styles['landing__nav-brand']}>
						<span className={styles['landing__logo-mark']}>H</span>
						<span className={styles['landing__logo-text']}>Hostlane</span>
					</div>

					<div className={styles['landing__nav-links']}>
						<a href="#features" className={styles['landing__nav-link']}>Features</a>
						<a href="#how" className={styles['landing__nav-link']}>How it works</a>
						<a
							href={REPO_URL}
							target="_blank"
							rel="noopener noreferrer"
							className={styles['landing__nav-link']}
						>
							Open source
						</a>
					</div>

					{/* <div className={styles['landing__nav-actions']}> */}
					{/* </div> */}
				</div>
			</nav>

			{/* ── Hero ───────────────────────────────────────────── */}
			<section className={styles['landing__hero']}>
				{/* Open source badge */}
				<a
					href={REPO_URL}
					target="_blank"
					rel="noopener noreferrer"
					className={styles['landing__badge']}
				>
					<Icon icon="simple-icons:github" width={24} height={24} />
					{/* <Github size={12} /> */}
					Open source on GitHub
					<ArrowRight size={12} />
				</a>

				<h1 className={styles['landing__hero-headline']}>
					Deploy static sites.<br />
					<span className={styles['landing__hero-accent']}>No servers. No config.</span>
				</h1>

				<p className={styles['landing__hero-sub']}>
					Hostlane turns a zip file into a live URL in seconds. Drop your build,
					watch it go live, roll back instantly if anything breaks.
				</p>

				{/* Auth buttons */}
				<div className={styles['landing__auth']}>
					<GoogleLogin
						onSuccess={handleOnSuccess}
						onError={() => {
							console.log('Login Failed')
							toast.error("Login Failed")
						}}
						useOneTap
					/>

					{/* Future providers — disabled with tooltip */}
					{/* <div className={styles['landing__auth-future']}> */}
					{/* 	<button className={styles['landing__auth-provider']} disabled title="Coming soon"> */}
					{/* 		<GithubProviderIcon /> */}
					{/* 		GitHub */}
					{/* 		<span className={styles['landing__auth-soon']}>Soon</span> */}
					{/* 	</button> */}
					{/* 	<button className={styles['landing__auth-provider']} disabled title="Coming soon"> */}
					{/* 		<GitlabIcon /> */}
					{/* 		GitLab */}
					{/* 		<span className={styles['landing__auth-soon']}>Soon</span> */}
					{/* 	</button> */}
					{/* </div> */}

					<p className={styles['landing__auth-terms']}>
						Free to use &middot; No credit card required
					</p>
				</div>
			</section>

			{/* ── Terminal preview ───────────────────────────────── */}
			{/* <section className={styles['landing__terminal-wrap']}> */}
			{/* 	<div className={styles['landing__terminal']}> */}
			{/* 		<div className={styles['landing__terminal-bar']}> */}
			{/* 			<span className={styles['landing__terminal-dot']} /> */}
			{/* 			<span className={styles['landing__terminal-dot']} /> */}
			{/* 			<span className={styles['landing__terminal-dot']} /> */}
			{/* 			<span className={styles['landing__terminal-title']}>deploy log</span> */}
			{/* 		</div> */}
			{/* 		<div className={styles['landing__terminal-body']}> */}
			{/* 			<TerminalLine dim>hostlane deploy ./dist.zip</TerminalLine> */}
			{/* 			<TerminalLine prefix="›" color="blue">Upload received &nbsp;&nbsp;&nbsp; 1.2 MB</TerminalLine> */}
			{/* 			<TerminalLine prefix="›" color="blue">Extracting files &nbsp;&nbsp; 847 ms</TerminalLine> */}
			{/* 			<TerminalLine prefix="›" color="blue">Validating build &nbsp;&nbsp; index.html ✓</TerminalLine> */}
			{/* 			<TerminalLine prefix="✓" color="green">Live &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; https://acme.hostlane.app</TerminalLine> */}
			{/* 		</div> */}
			{/* 	</div> */}
			{/* </section> */}

			{/* ── Features ───────────────────────────────────────── */}
			<section className={styles['landing__features']} id="features">
				<div className={styles['landing__section-label']}>Features</div>
				<h2 className={styles['landing__section-title']}>
					Everything you need to ship
				</h2>
				<p className={styles['landing__section-sub']}>
					Built for developers who want deployment to be the boring part.
				</p>

				<div className={styles['landing__feature-grid']}>
					{FEATURES.map((f) => (
						<div key={f.title} className={styles['landing__feature-card']}>
							<div className={styles['landing__feature-icon']}>
								<f.icon size={16} />
							</div>
							<h3 className={styles['landing__feature-title']}>{f.title}</h3>
							<p className={styles['landing__feature-desc']}>{f.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* ── How it works ───────────────────────────────────── */}
			<section className={styles['landing__how']} id="how">
				<div className={styles['landing__section-label']}>How it works</div>
				<h2 className={styles['landing__section-title']}>
					Three steps to live
				</h2>

				<div className={styles['landing__steps']}>
					{STEPS.map((step, i) => (
						<div key={step.title} className={styles['landing__step']}>
							<div className={styles['landing__step-num']}>{i + 1}</div>
							<div className={styles['landing__step-body']}>
								<h3 className={styles['landing__step-title']}>{step.title}</h3>
								<p className={styles['landing__step-desc']}>{step.desc}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ── Open source strip ──────────────────────────────── */}
			<section className={styles['landing__oss']}>
				<div className={styles['landing__oss-inner']}>
					<div className={styles['landing__oss-icon']}>
						{/* <Github size={24} /> */}
						<Icon icon="simple-icons:github" width={24} height={24} />
					</div>
					<div className={styles['landing__oss-copy']}>
						<h3 className={styles['landing__oss-title']}>Fully open source</h3>
						<p className={styles['landing__oss-desc']}>
							Hostlane is a portfolio project built in public. Read the code, open issues,
							or fork it for your own infrastructure.
						</p>
					</div>
					<a
						href={REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						className={styles['landing__oss-btn']}
					>
						View on GitHub <ExternalLink size={13} />
					</a>
				</div>
			</section>

			{/* ── Footer ─────────────────────────────────────────── */}
			<footer className={styles['landing__footer']}>
				<div className={styles['landing__footer-inner']}>
					<div className={styles['landing__footer-brand']}>
						<span className={styles['landing__logo-mark']}>H</span>
						<span className={styles['landing__logo-text']}>Hostlane</span>
					</div>

					<p className={styles['landing__footer-credit']}>
						Built by{' '}
						<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
							@lightningbat
						</a>
						{' '}· Portfolio project
					</p>

					<div className={styles['landing__footer-links']}>
						<a
							href={GITHUB_URL}
							target="_blank"
							rel="noopener noreferrer"
							className={styles['landing__footer-icon']}
							aria-label="GitHub"
						>
							<Icon icon="simple-icons:github" width={24} height={24} />
						</a>
					</div>
				</div>
			</footer>

		</div>
	)
}
	// ─── Small sub-components ─────────────────────────────────────

	function TerminalLine({
		children,
		prefix,
		color,
		dim,
	}: {
		children: React.ReactNode
		prefix?: string
		color?: 'blue' | 'green'
		dim?: boolean
	}) {
		return (
			<div className={[
				styles['term-line'],
				dim ? styles['term-line--dim'] : '',
				color ? styles[`term-line--${color}`] : '',
			].filter(Boolean).join(' ')}>
				{prefix && <span className={styles['term-line__prefix']}>{prefix}</span>}
				<span>{children}</span>
			</div>
		)
	}


	function GithubProviderIcon() {
		return (
			<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
				<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
			</svg>
		)
	}

	function GitlabIcon() {
		return (
			<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
				<path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
			</svg>
		)
	}

	// ─── Data ─────────────────────────────────────────────────────

	const FEATURES = [
		{
			icon: Upload,
			title: 'Deploy in seconds',
			desc: 'Upload a ZIP and your site is live instantly. No setup, no config.',
		},
		{
			icon: Zap,
			title: 'Zero-downtime deploys',
			desc: 'Updates go live instantly without breaking your site.',
		},
		{
			icon: RotateCcw,
			title: 'Instant rollback',
			desc: 'Revert to any previous version with one click.',
		},
		{
			icon: Globe,
			title: 'Custom domains',
			desc: 'Use your own domain with automatic HTTPS. (UPCOMING)',
		},
		{
			icon: ShieldCheck,
			title: 'Built-in security',
			desc: 'Uploads are validated and protected by default.',
		},
		{
			icon: Lock,
			title: 'Fully private',
			desc: 'Your files stay on your server. No external services involved.',
		},
	]

	const STEPS = [
		{
			title: 'Create a site',
			desc: 'Give your site a name and a slug. That\'s your URL identifier — you\'re done in under ten seconds.',
		},
		{
			title: 'Upload your build',
			desc: 'Drag and drop your zip file. Hostlane extracts it, validates it, and makes it live — atomically.',
		},
		{
			title: 'Ship and iterate',
			desc: 'Deploy new versions any time. Roll back instantly if something breaks. Your history is always there.',
		},
	]
