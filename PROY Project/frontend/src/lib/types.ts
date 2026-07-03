export interface Project {
  id: number
  name: string
  description: string | null
  category_id: number | null
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  progress: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  client_name: string | null
  budget: number | null
  start_date: string | null
  target_date: string | null
  url_repo: string | null
  url_deploy: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCategory {
  id: number
  name: string
  color: string
  icon: string | null
}

export interface ProjectTask {
  id: number
  project_id: number
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  due_date: string | null
  created_at: string
  completed_at: string | null
}
