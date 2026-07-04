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
