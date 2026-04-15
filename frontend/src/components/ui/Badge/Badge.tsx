import type { DeploymentStatus } from '@/types'
import styles from './Badge.module.scss'

interface Props {
  status: DeploymentStatus
}

const CONFIG: Record<DeploymentStatus, { label: string; mod: string }> = {
  UPLOADED:   { label: 'Uploading',   mod: 'uploading'   },
  EXTRACTING: { label: 'Extracting',  mod: 'extracting'  },
  VALIDATING: { label: 'Validating',  mod: 'validating'  },
  READY:      { label: 'Ready',       mod: 'ready'       },
  LIVE:       { label: 'Live',        mod: 'live'        },
  FAILED:     { label: 'Failed',      mod: 'failed'      },
  ARCHIVED:   { label: 'Archived',    mod: 'archived'    },
}

export function Badge({ status }: Props) {
  const { label, mod } = CONFIG[status]
  return (
    <span className={`${styles.badge} ${styles[`badge--${mod}`]}`}>
      <span className={styles['badge__dot']} />
      {label}
    </span>
  )
}
