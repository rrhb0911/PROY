import { createClient } from './supabase'
import type {
  TradingCuenta,
  TradingEstrategia,
  TradingBot,
  TradingOperacion,
  TradingAnalisis,
} from './types'

const supabase = createClient()

export async function getCuentas(): Promise<TradingCuenta[]> {
  const { data, error } = await supabase.from('trading_cuentas').select('*').order('nombre')
  if (error) throw error
  return data || []
}

export async function createCuenta(cuenta: Partial<TradingCuenta>): Promise<TradingCuenta> {
  const { data, error } = await supabase.from('trading_cuentas').insert([cuenta]).select().single()
  if (error) throw error
  return data
}

export async function updateCuenta(id: number, updates: Partial<TradingCuenta>): Promise<TradingCuenta> {
  const { data, error } = await supabase.from('trading_cuentas').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getEstrategias(): Promise<TradingEstrategia[]> {
  const { data, error } = await supabase.from('trading_estrategias').select('*').order('nombre')
  if (error) throw error
  return data || []
}

export async function createEstrategia(estrategia: Partial<TradingEstrategia>): Promise<TradingEstrategia> {
  const { data, error } = await supabase.from('trading_estrategias').insert([estrategia]).select().single()
  if (error) throw error
  return data
}

const BOT_SELECT = '*, estrategia:trading_estrategias(nombre), cuenta:trading_cuentas(nombre)'

export async function getBots(): Promise<TradingBot[]> {
  const { data, error } = await supabase.from('trading_bots').select(BOT_SELECT).order('nombre')
  if (error) throw error
  return data || []
}

export async function createBot(bot: Partial<TradingBot>): Promise<TradingBot> {
  const { data, error } = await supabase.from('trading_bots').insert([bot]).select(BOT_SELECT).single()
  if (error) throw error
  return data
}

export async function updateBot(id: number, updates: Partial<TradingBot>): Promise<TradingBot> {
  const { data, error } = await supabase
    .from('trading_bots')
    .update(updates)
    .eq('id', id)
    .select(BOT_SELECT)
    .single()
  if (error) throw error
  return data
}

const OPERACION_SELECT =
  '*, cuenta:trading_cuentas(nombre), estrategia:trading_estrategias(nombre), bot:trading_bots(nombre)'

export async function getOperaciones(periodo?: string): Promise<TradingOperacion[]> {
  let query = supabase.from('trading_operaciones').select(OPERACION_SELECT).order('fecha', { ascending: false })
  if (periodo) query = query.gte('fecha', `${periodo}-01`).lt('fecha', nextMonth(periodo))
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createOperacion(operacion: Partial<TradingOperacion>): Promise<TradingOperacion> {
  const { data, error } = await supabase
    .from('trading_operaciones')
    .insert([operacion])
    .select(OPERACION_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function getAnalisis(): Promise<TradingAnalisis[]> {
  const { data, error } = await supabase.from('trading_analisis').select('*').order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createAnalisis(analisis: Partial<TradingAnalisis>): Promise<TradingAnalisis> {
  const { data, error } = await supabase.from('trading_analisis').insert([analisis]).select().single()
  if (error) throw error
  return data
}

function nextMonth(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number)
  const next = new Date(Date.UTC(year, month, 1))
  return next.toISOString().slice(0, 10)
}
