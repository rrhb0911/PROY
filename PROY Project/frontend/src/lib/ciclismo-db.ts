import { createClient } from './supabase'
import type { CiclismoMesociclo, CiclismoSemana, CiclismoEntreno } from './types'

const supabase = createClient()

export async function getMesociclos(): Promise<CiclismoMesociclo[]> {
  const { data, error } = await supabase
    .from('ciclismo_mesociclos')
    .select('*')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createMesociclo(mesociclo: Partial<CiclismoMesociclo>): Promise<CiclismoMesociclo> {
  const { data, error } = await supabase.from('ciclismo_mesociclos').insert([mesociclo]).select().single()
  if (error) throw error
  return data
}

const SEMANA_SELECT = '*, mesociclo:ciclismo_mesociclos(nombre)'

export async function getSemanas(): Promise<CiclismoSemana[]> {
  const { data, error } = await supabase
    .from('ciclismo_semanas')
    .select(SEMANA_SELECT)
    .order('semana_inicio', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createSemana(semana: Partial<CiclismoSemana>): Promise<CiclismoSemana> {
  const { data, error } = await supabase.from('ciclismo_semanas').insert([semana]).select(SEMANA_SELECT).single()
  if (error) throw error
  return data
}

export async function getEntrenos(): Promise<CiclismoEntreno[]> {
  const { data, error } = await supabase
    .from('ciclismo_entrenos')
    .select('*')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createEntreno(entreno: Partial<CiclismoEntreno>): Promise<CiclismoEntreno> {
  const { data, error } = await supabase.from('ciclismo_entrenos').insert([entreno]).select().single()
  if (error) throw error
  return data
}
