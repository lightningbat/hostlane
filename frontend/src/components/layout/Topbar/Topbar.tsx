import { ReactNode } from 'react'
import { Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAppLayout } from '@/components/layout/AppLayout/AppLayout'
import styles from './Topbar.module.scss'

interface Props {
	title: string
	actions?: ReactNode
}

export function Topbar({ title, actions }: Props) {
	const { theme, toggle } = useTheme()
	const { openSidebar } = useAppLayout()

	return (
		<header className={styles.topbar}>
			<div className={styles['topbar__left']}>
				<button
					className={styles['topbar__menu-btn']}
					onClick={openSidebar}
					aria-label="Open menu"
				>
					<Menu size={18} />
				</button>

				<h1 className={styles['topbar__title']}>{title}</h1>
			</div>

			<div className={styles['topbar__right']}>
				{actions}

				<button
					className={styles['topbar__theme-toggle']}
					onClick={toggle}
					title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
					aria-label="Toggle theme"
				>
					{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
				</button>
			</div>
		</header>
	)
}
