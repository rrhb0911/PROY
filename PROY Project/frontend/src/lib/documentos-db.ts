import { createClient } from './supabase'
import type { Documento } from './types'

const supabase = createClient()

export async function getDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase.from('documentos').select('*').order('nombre')
  if (error) throw error
  return data || []
}

export async function createDocumento(documento: Partial<Documento>): Promise<Documento> {
  const { data, error } = await supabase.from('documentos').insert([documento]).select().single()
  if (error) throw error
  return data
}

export async function updateDocumento(id: number, updates: Partial<Documento>): Promise<Documento> {
  const { data, error } = await supabase.from('documentos').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
