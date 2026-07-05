import { createClient } from './supabase'
import type { EstudioRecurso, EstudioMeta } from './types'

const supabase = createClient()

export async function getRecursos(): Promise<EstudioRecurso[]> {
  const { data, error } = await supabase.from('estudios_recursos').select('*').order('titulo')
  if (error) throw error
  return data || []
}

export async function createRecurso(recurso: Partial<EstudioRecurso>): Promise<EstudioRecurso> {
  const { data, error } = await supabase.from('estudios_recursos').insert([recurso]).select().single()
  if (error) throw error
  return data
}

export async function updateRecurso(id: number, updates: Partial<EstudioRecurso>): Promise<EstudioRecurso> {
  const { data, error } = await supabase.from('estudios_recursos').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getMetas(): Promise<EstudioMeta[]> {
  const { data, error } = await supabase.from('estudios_metas').select('*').order('trimestre')
  if (error) throw error
  return data || []
}

export async function createMeta(meta: Partial<EstudioMeta>): Promise<EstudioMeta> {
  const { data, error } = await supabase.from('estudios_metas').insert([meta]).select().single()
  if (error) throw error
  return data
}

export async function updateMeta(id: number, updates: Partial<EstudioMeta>): Promise<EstudioMeta> {
  const { data, error } = await supabase.from('estudios_metas').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
