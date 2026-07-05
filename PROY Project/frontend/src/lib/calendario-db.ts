import { createClient } from './supabase'
import type { CalendarioEvento } from './types'

const supabase = createClient()

export async function getEventos(): Promise<CalendarioEvento[]> {
  const { data, error } = await supabase
    .from('calendario_eventos')
    .select('*')
    .order('fecha', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createEvento(evento: Partial<CalendarioEvento>): Promise<CalendarioEvento> {
  const { data, error } = await supabase.from('calendario_eventos').insert([evento]).select().single()
  if (error) throw error
  return data
}
