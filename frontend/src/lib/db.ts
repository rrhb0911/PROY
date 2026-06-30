import { createClient } from './supabase'
import type { Project, ProjectTask, ProjectCategory } from './types'

const supabase = createClient()

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getProject(id: number): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createProject(project: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id: number, updates: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id: number): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getTasks(projectId: number): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createTask(task: Partial<ProjectTask>): Promise<ProjectTask> {
  const { data, error } = await supabase
    .from('project_tasks')
    .insert([task])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id: number, updates: Partial<ProjectTask>): Promise<void> {
  const { error } = await supabase
    .from('project_tasks')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function getCategories(): Promise<ProjectCategory[]> {
  const { data, error } = await supabase
    .from('project_categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function getStats() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('status, progress')
  if (error) throw error

  const total = projects.length
  const active = projects.filter(p => p.status === 'active').length
  const paused = projects.filter(p => p.status === 'paused').length
  const completed = projects.filter(p => p.status === 'completed').length
  const avgProgress = total > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / total)
    : 0

  return { total, active, paused, completed, avgProgress }
}
