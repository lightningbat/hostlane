import { useEffect, useState, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '../Sidebar/Sidebar'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './AppLayout.module.scss'

export function AppLayout() {
	const { user, loading } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [sidebarOpen, setSidebarOpen] = useState(false)

	// Close sidebar on route change
	// eslint-disable-next-line react-hooks/set-state-in-effect
	useEffect(() => { setSidebarOpen(false) }, [location.pathname])

	// Close sidebar on Escape
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setSidebarOpen(false)
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [])

	useEffect(() => {
		if (!loading && !user) navigate('/login', { replace: true })
	}, [user, loading, navigate])

	const openSidebar = useCallback(() => setSidebarOpen(true), [])
	const closeSidebar = useCallback(() => setSidebarOpen(false), [])

	if (loading) {
		return (
			<div className={styles['app-layout__loading']}>
				<Spinner size="lg" />
			</div>
		)
	}

	if (!user) return null

	return (
		<div className={styles['app-layout']}>
			<Sidebar open={sidebarOpen} onClose={closeSidebar} />

			<div className={styles['app-layout__main']}>
				{/* Pass onMenuClick down via context would be cleaner at scale,
					but cloning the outlet child with props works for our case.
					Instead we use a context-free pattern: Topbar reads from here
					via the onMenuClick prop passed through each page's Topbar usage.
					We expose it on a data attribute so pages can wire it up. */}
				<div
					className={styles['app-layout__content']}
					data-sidebar-open={sidebarOpen}
				>
					{/* We need pages to forward onMenuClick to Topbar.
					  Simplest approach: put a hidden trigger button here that
					  pages' Topbar menu buttons call via the AppLayout's handler.
					  Actually cleanest: pass via React context. */}
					<AppLayoutContext.Provider value={{ openSidebar }}>
						<Outlet />
					</AppLayoutContext.Provider>
				</div>
			</div>
		</div>
	)
}

// Simple context so any Topbar nested inside can call openSidebar
import { createContext, useContext } from 'react'

interface AppLayoutCtx { openSidebar: () => void }
const AppLayoutContext = createContext<AppLayoutCtx>({ openSidebar: () => { } })
export function useAppLayout() { return useContext(AppLayoutContext) }
