import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import styles from './Toast.module.scss'

type ToastKind = 'success' | 'error'

interface ToastItem {
	id: number
	kind: ToastKind
	message: string
}

interface ToastCtx {
	success: (msg: string) => void
	error: (msg: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)
let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([])

	const dismiss = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	const add = useCallback((kind: ToastKind, message: string) => {
		const id = ++counter
		setToasts((prev) => [...prev, { id, kind, message }])
		setTimeout(() => dismiss(id), 4000)
	}, [dismiss])

	return (
		<Ctx.Provider value={{ success: (m) => add('success', m), error: (m) => add('error', m) }}>
			{children}
			<div className={styles['toast-stack']} aria-live="polite">
				{toasts.map((t) => (
					<div key={t.id} className={`${styles.toast} ${styles[`toast--${t.kind}`]}`}>
						<span className={styles['toast__icon']}>
							{t.kind === 'success'
								? <CheckCircle size={14} />
								: <XCircle size={14} />}
						</span>
						<span className={styles['toast__message']}>{t.message}</span>
						<button className={styles['toast__close']} onClick={() => dismiss(t.id)} aria-label="Dismiss">
							<X size={12} />
						</button>
					</div>
				))}
			</div>
		</Ctx.Provider>
	)
}

export function useToast() {
	const ctx = useContext(Ctx)
	if (!ctx) throw new Error('useToast must be used within ToastProvider')
	return ctx
}
