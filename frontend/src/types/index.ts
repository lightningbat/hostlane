export interface User {
  id: number
  email: string
  name: string
  avatar_url: string | null
}

export interface Site {
  id: number
  user_id: number
  subdomain: string
  name: string
  custom_domain: string | null
  domain_verified: boolean
  ssl_status: 'none' | 'pending' | 'active' | 'failed'
  created_at: string
}

export type DeploymentStatus =
  | 'UPLOADED'
  | 'EXTRACTING'
  | 'VALIDATING'
  | 'READY'
  | 'LIVE'
  | 'FAILED'
  | 'ARCHIVED'

export interface Deployment {
  id: number
  site_id: number
  version: string
  status: DeploymentStatus
  zip_path: string
  deploy_dir: string | null
  error_msg: string | null
  created_at: string
  updated_at: string
}

export interface DeployStatusEvent {
  deployment_id: number
  status: DeploymentStatus
  message?: string
}
