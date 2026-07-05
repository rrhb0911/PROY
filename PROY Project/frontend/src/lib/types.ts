export interface Project {
  id: number
  name: string
  slug: string | null
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
  category?: ProjectCategory | null
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

export interface FinanzasIngreso {
  id: number
  fuente: string
  monto: number
  periodo: string
  quincena: 1 | 2 | null
  notas: string | null
  created_at: string
}

export interface FinanzasCategoriaGasto {
  id: number
  nombre: string
  color: string
}

export interface FinanzasGastoVariable {
  id: number
  categoria_id: number
  concepto: string
  monto: number
  periodo: string
  quincena: 1 | 2 | null
  pagado: boolean
  notas: string | null
  created_at: string
  categoria?: FinanzasCategoriaGasto | null
}

export interface FinanzasGastoFijo {
  id: number
  nombre: string
  monto: number
  tipo: 'cuota' | 'indefinido'
  cuotas_totales: number | null
  cuotas_pagadas: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface FinanzasPagoFijo {
  id: number
  gasto_fijo_id: number
  periodo: string
  quincena: 1 | 2 | null
  monto: number
  pagado: boolean
  created_at: string
  gasto_fijo?: { nombre: string } | null
}

export interface FinanzasDeuda {
  id: number
  persona: string
  concepto: string
  monto_original: number | null
  saldo_actual: number
  pago_mensual: number | null
  activa: boolean
  created_at: string
  updated_at: string
}

export type Mercado = 'forex' | 'crypto'

export interface TradingCuenta {
  id: number
  nombre: string
  mercado: Mercado
  broker: string | null
  balance_actual: number
  moneda: string
  activa: boolean
  created_at: string
  updated_at: string
}

export interface TradingEstrategia {
  id: number
  nombre: string
  descripcion: string | null
  activa: boolean
  created_at: string
}

export interface TradingBot {
  id: number
  nombre: string
  estrategia_id: number | null
  cuenta_id: number
  activo: boolean
  created_at: string
  updated_at: string
  estrategia?: { nombre: string } | null
  cuenta?: { nombre: string } | null
}

export interface TradingOperacion {
  id: number
  cuenta_id: number
  mercado: Mercado
  estrategia_id: number | null
  bot_id: number | null
  par: string
  tipo: 'compra' | 'venta'
  resultado: number
  fecha: string
  notas: string | null
  created_at: string
  cuenta?: { nombre: string } | null
  estrategia?: { nombre: string } | null
  bot?: { nombre: string } | null
}

export interface TradingAnalisis {
  id: number
  mercado: Mercado | null
  titulo: string
  contenido: string | null
  fecha: string
  created_at: string
}

export interface CiclismoMesociclo {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string | null
  enfoque: string | null
  metrica_objetivo: string | null
  created_at: string
}

export interface CiclismoSemana {
  id: number
  semana_inicio: string
  mesociclo_id: number | null
  ctl: number | null
  atl: number | null
  tsb: number | null
  tte_min: number | null
  ftp: number | null
  eftp: number | null
  frc: number | null
  peso: number | null
  kj: number | null
  horas: number | null
  notas: string | null
  created_at: string
  mesociclo?: { nombre: string } | null
}

export interface CiclismoEntreno {
  id: number
  fecha: string
  tipo: string | null
  duracion_min: number | null
  tss: number | null
  intensity_factor: number | null
  potencia_promedio: number | null
  hr_promedio: number | null
  kj: number | null
  rpe: number | null
  notas: string | null
  created_at: string
}

export type CategoriaDocumento =
  | 'identificacion'
  | 'vehicular'
  | 'financiero'
  | 'contractual'
  | 'garantia'
  | 'salud'
  | 'vivienda'

export interface Documento {
  id: number
  categoria: CategoriaDocumento
  nombre: string
  numero_referencia: string | null
  emisor: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  dias_alerta: number
  ubicacion_fisica: string | null
  link_digital: string | null
  notas: string | null
  created_at: string
  updated_at: string
}
