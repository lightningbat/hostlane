import styles from './Spinner.module.scss'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size = 'md' }: Props) {
  return (
    <span
      className={`${styles.spinner} ${styles[`spinner--${size}`]}`}
      role="status"
      aria-label="Loading"
    />
  )
}
