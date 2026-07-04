import { createClient } from './supabase'
import type {
  FinanzasIngreso,
  FinanzasCategoriaGasto,
  FinanzasGastoVariable,
  FinanzasGastoFijo,
  FinanzasPagoFijo,
  FinanzasDeuda,
} from './types'

const supabase = createClient()

export async function getIngresos(): Promise<FinanzasIngreso[]> {
  const { data, error } = await supabase
    .from('finanzas_ingresos')
    .select('*')
    .order('periodo', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createIngreso(ingreso: Partial<FinanzasIngreso>): Promise<FinanzasIngreso> {
  const { data, error } = await supabase
    .from('finanzas_ingresos')
    .insert([ingreso])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCategoriasGasto(): Promise<FinanzasCategoriaGasto[]> {
  const { data, error } = await supabase
    .from('finanzas_categorias_gasto')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data || []
}

const GASTO_VARIABLE_SELECT = '*, categoria:finanzas_categorias_gasto(id,nombre,color)'

export async function getGastosVariables(periodo?: string): Promise<FinanzasGastoVariable[]> {
  let query = supabase
    .from('finanzas_gastos_variables')
    .select(GASTO_VARIABLE_SELECT)
    .order('periodo', { ascending: false })
  if (periodo) query = query.eq('periodo', periodo)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createGastoVariable(
  gasto: Partial<FinanzasGastoVariable>
): Promise<FinanzasGastoVariable> {
  const { data, error } = await supabase
    .from('finanzas_gastos_variables')
    .insert([gasto])
    .select(GASTO_VARIABLE_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateGastoVariable(
  id: number,
  updates: Partial<FinanzasGastoVariable>
): Promise<FinanzasGastoVariable> {
  const { data, error } = await supabase
    .from('finanzas_gastos_variables')
    .update(updates)
    .eq('id', id)
    .select(GASTO_VARIABLE_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function getGastosFijos(): Promise<FinanzasGastoFijo[]> {
  const { data, error } = await supabase
    .from('finanzas_gastos_fijos')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function createGastoFijo(gasto: Partial<FinanzasGastoFijo>): Promise<FinanzasGastoFijo> {
  const { data, error } = await supabase
    .from('finanzas_gastos_fijos')
    .insert([gasto])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGastoFijo(
  id: number,
  updates: Partial<FinanzasGastoFijo>
): Promise<FinanzasGastoFijo> {
  const { data, error } = await supabase
    .from('finanzas_gastos_fijos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

const PAGO_FIJO_SELECT = '*, gasto_fijo:finanzas_gastos_fijos(nombre)'

export async function getPagosFijos(periodo: string): Promise<FinanzasPagoFijo[]> {
  const { data, error } = await supabase
    .from('finanzas_pagos_fijos')
    .select(PAGO_FIJO_SELECT)
    .eq('periodo', periodo)
  if (error) throw error
  return data || []
}

export async function updatePagoFijo(
  id: number,
  updates: Partial<FinanzasPagoFijo>
): Promise<FinanzasPagoFijo> {
  const { data, error } = await supabase
    .from('finanzas_pagos_fijos')
    .update(updates)
    .eq('id', id)
    .select(PAGO_FIJO_SELECT)
    .single()
  if (error) throw error
  return data
}

// Crea una fila de pago pendiente para cada gasto fijo activo en este periodo.
// Usa upsert con ignoreDuplicates apoyado en el unique (gasto_fijo_id, periodo)
// para ser seguro ante llamadas repetidas/concurrentes (ej. Strict Mode de
// React re-ejecutando el efecto) — nunca pisa una fila que ya exista.
export async function ensurePagosFijos(periodo: string): Promise<void> {
  const fijos = await getGastosFijos()
  const activos = fijos.filter((f) => f.activo)
  if (activos.length === 0) return

  const { error } = await supabase.from('finanzas_pagos_fijos').upsert(
    activos.map((f) => ({
      gasto_fijo_id: f.id,
      periodo,
      quincena: null,
      monto: f.monto,
      pagado: false,
    })),
    { onConflict: 'gasto_fijo_id,periodo', ignoreDuplicates: true }
  )
  if (error) throw error
}

export async function getDeudas(): Promise<FinanzasDeuda[]> {
  const { data, error } = await supabase
    .from('finanzas_deudas')
    .select('*')
    .order('persona')
  if (error) throw error
  return data || []
}

export async function createDeuda(deuda: Partial<FinanzasDeuda>): Promise<FinanzasDeuda> {
  const { data, error } = await supabase
    .from('finanzas_deudas')
    .insert([deuda])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDeuda(id: number, updates: Partial<FinanzasDeuda>): Promise<FinanzasDeuda> {
  const { data, error } = await supabase
    .from('finanzas_deudas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
