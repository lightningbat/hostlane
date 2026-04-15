import { useEffect, useState } from 'react'
import type { DeploymentStatus } from '@/types'

export interface DeployState {
  status: DeploymentStatus | null
  message: string | undefined
  done: boolean
}

export function useDeployStatus(deploymentId: number | null): DeployState {
  const [state, setState] = useState<DeployState>({
    status: null,
    message: undefined,
    done: false,
  })

  useEffect(() => {
    if (!deploymentId) return

    const es = new EventSource(`/api/deploy/${deploymentId}/status`, {
      withCredentials: true,
    })

    es.onmessage = (e) => {
      const event = JSON.parse(e.data) as { status: DeploymentStatus; message?: string }
      const done = event.status === 'LIVE' || event.status === 'FAILED'
      setState({ status: event.status, message: event.message, done })
      if (done) es.close()
    }

    es.onerror = () => {
      es.close()
      setState((s) => ({ ...s, done: true }))
    }

    return () => es.close()
  }, [deploymentId])

  return state
}
