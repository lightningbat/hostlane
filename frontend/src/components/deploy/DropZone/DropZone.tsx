import { useCallback, useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, FileArchive, X } from 'lucide-react'
import styles from './DropZone.module.scss'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

export function DropZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile]         = useState<File | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  const accept = useCallback((f: File) => {
    setError(null)
    if (!f.name.endsWith('.zip') && f.type !== 'application/zip') {
      setError('Only .zip files are accepted')
      return
    }
    if (f.size > MAX_BYTES) {
      setError('File must be under 20 MB')
      return
    }
    setFile(f)
    onFile(f)
  }, [onFile])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }, [accept])

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) accept(f)
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      className={[
        styles['drop-zone'],
        dragging ? styles['drop-zone--dragging'] : '',
        disabled ? styles['drop-zone--disabled'] : '',
        error   ? styles['drop-zone--error']    : '',
      ].filter(Boolean).join(' ')}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onClick={() => !disabled && !file && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && !file && inputRef.current?.click()}
      aria-label="Upload zip file"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className={styles['drop-zone__input']}
        onChange={onChange}
        disabled={disabled}
      />

      {file ? (
        <div className={styles['drop-zone__file']}>
          <FileArchive size={24} className={styles['drop-zone__file-icon']} />
          <div className={styles['drop-zone__file-info']}>
            <span className={styles['drop-zone__file-name']}>{file.name}</span>
            <span className={styles['drop-zone__file-size']}>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button className={styles['drop-zone__clear']} onClick={clear} aria-label="Remove file">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className={styles['drop-zone__prompt']}>
          <Upload size={20} className={styles['drop-zone__prompt-icon']} />
          <p className={styles['drop-zone__prompt-title']}>
            {dragging ? 'Release to upload' : 'Drop your build zip here'}
          </p>
          <p className={styles['drop-zone__prompt-hint']}>
            or click to browse &middot; max 20 MB
          </p>
        </div>
      )}

      {error && <p className={styles['drop-zone__error-msg']}>{error}</p>}
    </div>
  )
}
