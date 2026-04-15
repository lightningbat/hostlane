import { ReactNode } from 'react'
import styles from './EmptyState.module.scss'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className={styles['empty-state']}>
      <div className={styles['empty-state__icon']}>{icon}</div>
      <h3 className={styles['empty-state__title']}>{title}</h3>
      <p className={styles['empty-state__description']}>{description}</p>
      {action && <div className={styles['empty-state__action']}>{action}</div>}
    </div>
  )
}
