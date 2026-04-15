import { InputHTMLAttributes, forwardRef } from 'react'
import styles from './Input.module.scss'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={styles['input-field']}>
        {label && (
          <label className={styles['input-field__label']} htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            styles['input-field__input'],
            error ? styles['input-field__input--error'] : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {hint && !error && (
          <p className={styles['input-field__hint']}>{hint}</p>
        )}
        {error && (
          <p className={styles['input-field__error']}>{error}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
