import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthCtx {
	user: User | null
	loading: boolean
	refresh: () => Promise<void>
	logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)

	const refresh = async () => {
		try {
			const d = await api.me()
			setUser(d.user)
		} catch {
			setUser(null)
		}
	}

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		refresh().finally(() => setLoading(false))
	}, [])

	const logout = async () => {
		await api.logout()
		setUser(null)
		window.location.href = '/login'
	}

	return (
		<Ctx.Provider value={{ user, loading, refresh, logout }}>
			{children}
		</Ctx.Provider>
	)
}

export function useAuth() {
	const ctx = useContext(Ctx)
	if (!ctx) throw new Error('useAuth must be used within AuthProvider')
	return ctx
}
