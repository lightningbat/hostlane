import { NavLink } from 'react-router-dom'
import { Globe, LayoutDashboard, LogOut, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import styles from './Sidebar.module.scss'

const NAV = [
	{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
	{ to: '/sites', icon: Globe, label: 'Sites' },
]

interface Props {
	open?: boolean
	onClose?: () => void
}

export function Sidebar({ open = false, onClose }: Props) {
	const { user, logout } = useAuth()

	return (
		<>
			{/* Backdrop — mobile only */}
			{open && (
				<div className={styles['sidebar__backdrop']} onClick={onClose} aria-hidden />
			)}

			<aside className={`${styles.sidebar} ${open ? styles['sidebar--open'] : ''}`}>
				{/* Logo */}
				<div className={styles['sidebar__logo']}>
					<span className={styles['sidebar__logo-mark']}>H</span>
					<span className={styles['sidebar__logo-text']}>Hostlane</span>

					{/* Close button — mobile only */}
					<button
						className={styles['sidebar__close']}
						onClick={onClose}
						aria-label="Close menu"
					>
						<X size={16} />
					</button>
				</div>

				{/* Nav */}
				<nav className={styles['sidebar__nav']}>
					{NAV.map(({ to, icon: Icon, label }) => (
						<NavLink
							key={to}
							to={to}
							onClick={onClose}
							className={({ isActive }) =>
								`${styles['sidebar__nav-item']} ${isActive ? styles['sidebar__nav-item--active'] : ''}`
							}
						>
							<Icon size={15} />
							{label}
						</NavLink>
					))}
				</nav>

				{/* Footer */}
				<div className={styles['sidebar__footer']}>
					<div className={styles['sidebar__user']}>
						{user?.avatar_url
							? <img src={user.avatar_url} alt="" className={styles['sidebar__avatar']} />
							: <span className={styles['sidebar__avatar-fallback']}>{user?.name?.[0]}</span>
						}
						<div className={styles['sidebar__user-info']}>
							<span className={styles['sidebar__user-name']}>{user?.name}</span>
							<span className={styles['sidebar__user-email']}>{user?.email}</span>
						</div>
					</div>

					<button className={styles['sidebar__logout']} onClick={logout} title="Sign out">
						<LogOut size={14} />
					</button>
				</div>
			</aside>
		</>
	)
}
