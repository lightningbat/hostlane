import { ReactNode } from 'react'
import styles from './Card.module.scss'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, className = '', onClick, hoverable }: Props) {
  const classes = [
    styles.card,
    hoverable ? styles['card--hoverable'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return onClick ? (
    <button className={classes} onClick={onClick}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  )
}
