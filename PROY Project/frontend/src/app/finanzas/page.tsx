'use client'

import { useState, useEffect } from 'react'
import {
  getIngresos,
  createIngreso,
  getCategoriasGasto,
  getGastosVariables,
  createGastoVariable,
  updateGastoVariable,
  getGastosFijos,
  createGastoFijo,
  updateGastoFijo,
  getPagosFijos,
  updatePagoFijo,
  ensurePagosFijos,
  getDeudas,
  createDeuda,
  updateDeuda,
} from '@/lib/finanzas-db'
import type {
  FinanzasIngreso,
  FinanzasCategoriaGasto,
  FinanzasGastoVariable,
  FinanzasGastoFijo,
  FinanzasPagoFijo,
  FinanzasDeuda,
} from '@/lib/types'

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'gastos', label: 'Pagos' },
  { id: 'fijos', label: 'Gastos Fijos' },
  { id: 'deudas', label: 'Deudas' },
  { id: 'ingresos', label: 'Ingresos' },
] as const

type TabId = (typeof TABS)[number]['id']

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function FinanzasPage() {
  const [tab, setTab] = useState<TabId>('resumen')
  const [mes, setMes] = useState(currentMonth())

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Ingresos, gastos, gastos fijos y deudas</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'resumen' || tab === 'gastos') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      )}

      {tab === 'resumen' && <ResumenTab mes={mes} />}
      {tab === 'gastos' && <PagosTab mes={mes} />}
      {tab === 'fijos' && <GastosFijosTab />}
      {tab === 'deudas' && <DeudasTab />}
      {tab === 'ingresos' && <IngresosTab />}
    </div>
  )
}

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function ResumenTab({ mes }: { mes: string }) {
  const [ingresos, setIngresos] = useState<FinanzasIngreso[]>([])
  const [gastosVariables, setGastosVariables] = useState<FinanzasGastoVariable[]>([])
  const [gastosFijos, setGastosFijos] = useState<FinanzasGastoFijo[]>([])
  const [deudas, setDeudas] = useState<FinanzasDeuda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const periodo = `${mes}-01`
    setLoading(true)
    Promise.all([getIngresos(), getGastosVariables(periodo), getGastosFijos(), getDeudas()])
      .then(([ing, gv, gf, d]) => {
        setIngresos(ing.filter((i) => i.periodo === periodo))
        setGastosVariables(gv)
        setGastosFijos(gf)
        setDeudas(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mes])

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
  }

  const totalIngresos = ingresos.reduce((a, i) => a + Number(i.monto), 0)
  const totalGastosVariables = gastosVariables.reduce((a, g) => a + Number(g.monto), 0)
  const fijosActivos = gastosFijos.filter((f) => f.activo)
  const totalGastosFijos = fijosActivos.reduce((a, f) => a + Number(f.monto), 0)
  const totalEgresos = totalGastosVariables + totalGastosFijos
  const neto = totalIngresos - totalEgresos
  const deudasActivas = deudas.filter((d) => d.activa)
  const totalDeuda = deudasActivas.reduce((a, d) => a + Number(d.saldo_actual), 0)

  const porCategoria = new Map<string, number>()
  for (const g of gastosVariables) {
    const nombre = g.categoria?.nombre ?? 'Sin categoría'
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + Number(g.monto))
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Ingresos del mes" value={currency.format(totalIngresos)} color="text-green-600" />
        <StatCard label="Egresos del mes" value={currency.format(totalEgresos)} color="text-red-600" />
        <StatCard label="Neto" value={currency.format(neto)} color={neto >= 0 ? 'text-green-600' : 'text-red-600'} />
        <StatCard label="Deuda pendiente" value={currency.format(totalDeuda)} color="text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gastos variables por categoría</h2>
          {porCategoria.size === 0 ? (
            <p className="text-gray-500 text-sm">Sin gastos registrados este mes.</p>
          ) : (
            <ul className="space-y-2">
              {[...porCategoria.entries()].map(([nombre, monto]) => (
                <li key={nombre} className="flex justify-between text-sm">
                  <span className="text-gray-700">{nombre}</span>
                  <span className="font-medium text-gray-900">{currency.format(monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gastos fijos activos</h2>
          {fijosActivos.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay gastos fijos activos.</p>
          ) : (
            <ul className="space-y-2">
              {fijosActivos.map((f) => (
                <li key={f.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{f.nombre}</span>
                  <span className="font-medium text-gray-900">{currency.format(f.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

interface PagoRow {
  id: number
  tipo: 'variable' | 'fijo'
  concepto: string
  monto: number
  quincena: 1 | 2 | null
  pagado: boolean
  categoriaColor: string | null
}

function PagosTab({ mes }: { mes: string }) {
  const periodo = `${mes}-01`
  const [gastosVariables, setGastosVariables] = useState<FinanzasGastoVariable[]>([])
  const [pagosFijos, setPagosFijos] = useState<FinanzasPagoFijo[]>([])
  const [categorias, setCategorias] = useState<FinanzasCategoriaGasto[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ categoria_id: '', concepto: '', monto: 0, quincena: '' })

  useEffect(() => {
    setLoading(true)
    ensurePagosFijos(periodo)
      .then(() => Promise.all([getGastosVariables(periodo), getPagosFijos(periodo), getCategoriasGasto()]))
      .then(([gv, pf, c]) => {
        setGastosVariables(gv)
        setPagosFijos(pf)
        setCategorias(c)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [periodo])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createGastoVariable({
      categoria_id: Number(form.categoria_id),
      concepto: form.concepto,
      monto: form.monto,
      periodo,
      quincena: form.quincena ? (Number(form.quincena) as 1 | 2) : null,
    })
    setGastosVariables((prev) => [created, ...prev])
    setForm({ categoria_id: '', concepto: '', monto: 0, quincena: '' })
    setShowForm(false)
  }

  async function toggleVariablePagado(g: FinanzasGastoVariable) {
    const updated = await updateGastoVariable(g.id, { pagado: !g.pagado })
    setGastosVariables((prev) => prev.map((x) => (x.id === g.id ? updated : x)))
  }

  async function updateVariableMonto(g: FinanzasGastoVariable, monto: number) {
    if (monto === g.monto) return
    const updated = await updateGastoVariable(g.id, { monto })
    setGastosVariables((prev) => prev.map((x) => (x.id === g.id ? updated : x)))
  }

  async function toggleFijoPagado(p: FinanzasPagoFijo) {
    const updated = await updatePagoFijo(p.id, { pagado: !p.pagado })
    setPagosFijos((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
  }

  async function updateFijoMonto(p: FinanzasPagoFijo, monto: number) {
    if (monto === p.monto) return
    const updated = await updatePagoFijo(p.id, { monto })
    setPagosFijos((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
  }

  async function reassignQuincena(row: PagoRow, quincena: 1 | 2 | null) {
    if (row.tipo === 'variable') {
      const g = gastosVariables.find((x) => x.id === row.id)
      if (!g) return
      const updated = await updateGastoVariable(g.id, { quincena })
      setGastosVariables((prev) => prev.map((x) => (x.id === g.id ? updated : x)))
    } else {
      const p = pagosFijos.find((x) => x.id === row.id)
      if (!p) return
      const updated = await updatePagoFijo(p.id, { quincena })
      setPagosFijos((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
    }
  }

  function togglePagado(row: PagoRow) {
    if (row.tipo === 'variable') {
      const g = gastosVariables.find((x) => x.id === row.id)
      if (g) toggleVariablePagado(g)
    } else {
      const p = pagosFijos.find((x) => x.id === row.id)
      if (p) toggleFijoPagado(p)
    }
  }

  function updateMonto(row: PagoRow, monto: number) {
    if (row.tipo === 'variable') {
      const g = gastosVariables.find((x) => x.id === row.id)
      if (g) updateVariableMonto(g, monto)
    } else {
      const p = pagosFijos.find((x) => x.id === row.id)
      if (p) updateFijoMonto(p, monto)
    }
  }

  const rows: PagoRow[] = [
    ...gastosVariables.map((g) => ({
      id: g.id,
      tipo: 'variable' as const,
      concepto: `${g.categoria?.nombre ?? 'Sin categoría'} — ${g.concepto}`,
      monto: g.monto,
      quincena: g.quincena,
      pagado: g.pagado,
      categoriaColor: g.categoria?.color ?? null,
    })),
    ...pagosFijos.map((p) => ({
      id: p.id,
      tipo: 'fijo' as const,
      concepto: `Fijo — ${p.gasto_fijo?.nombre ?? '—'}`,
      monto: p.monto,
      quincena: p.quincena,
      pagado: p.pagado,
      categoriaColor: null,
    })),
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Gasto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                required
                value={form.categoria_id}
                onChange={(e) => setForm((p) => ({ ...p, categoria_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecciona...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
              <input
                type="text"
                required
                value={form.concepto}
                onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                required
                min={0}
                value={form.monto}
                onChange={(e) => setForm((p) => ({ ...p, monto: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quincena (opcional)</label>
              <select
                value={form.quincena}
                onChange={(e) => setForm((p) => ({ ...p, quincena: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Mensual (sin quincena)</option>
                <option value="1">Quincena 1 (15)</option>
                <option value="2">Quincena 2 (30)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Guardar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay gastos registrados para este mes.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuincenaWidget
              quincena={1}
              rows={rows.filter((r) => r.quincena === 1)}
              onToggle={togglePagado}
              onMonto={updateMonto}
              onReassign={reassignQuincena}
            />
            <QuincenaWidget
              quincena={2}
              rows={rows.filter((r) => r.quincena === 2)}
              onToggle={togglePagado}
              onMonto={updateMonto}
              onReassign={reassignQuincena}
            />
          </div>

          {rows.some((r) => r.quincena === null) && (
            <QuincenaWidget
              quincena={null}
              rows={rows.filter((r) => r.quincena === null)}
              onToggle={togglePagado}
              onMonto={updateMonto}
              onReassign={reassignQuincena}
            />
          )}
        </div>
      )}
    </div>
  )
}

const QUINCENA_META = {
  1: { label: 'Quincena 1 (día 15)', header: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  2: { label: 'Quincena 2 (día 30)', header: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-800' },
  none: { label: 'Sin quincena asignada', header: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-700' },
}

function QuincenaWidget({
  quincena,
  rows,
  onToggle,
  onMonto,
  onReassign,
}: {
  quincena: 1 | 2 | null
  rows: PagoRow[]
  onToggle: (row: PagoRow) => void
  onMonto: (row: PagoRow, monto: number) => void
  onReassign: (row: PagoRow, quincena: 1 | 2 | null) => void
}) {
  const meta = quincena === 1 ? QUINCENA_META[1] : quincena === 2 ? QUINCENA_META[2] : QUINCENA_META.none
  const total = rows.reduce((a, r) => a + r.monto, 0)
  const pagados = rows.filter((r) => r.pagado).length

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${meta.header}`}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${meta.badge}`}>{meta.label}</span>
        <span className="text-xs text-gray-500">
          {pagados}/{rows.length} pagados · {currency.format(total)}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.length === 0 && <li className="px-4 py-3 text-sm text-gray-400">Sin gastos aquí.</li>}
        {rows.map((r) => (
          <li
            key={`${r.tipo}-${r.id}`}
            className={`flex items-center gap-2 px-3 py-2 text-sm ${r.pagado ? 'bg-green-50' : ''}`}
          >
            <input
              type="checkbox"
              checked={r.pagado}
              onChange={() => onToggle(r)}
              className="h-4 w-4 rounded border-gray-300 shrink-0"
            />
            {r.categoriaColor && (
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.categoriaColor }} />
            )}
            <span className="flex-1 truncate text-gray-900" title={r.concepto}>{r.concepto}</span>
            <input
              type="number"
              defaultValue={r.monto}
              onBlur={(e) => onMonto(r, Number(e.target.value))}
              className="w-24 border border-gray-300 rounded-md px-1.5 py-1 text-xs text-right shrink-0"
            />
            <select
              value={r.quincena ?? ''}
              onChange={(e) => onReassign(r, e.target.value ? (Number(e.target.value) as 1 | 2) : null)}
              className="border border-gray-300 rounded-md px-1 py-1 text-xs shrink-0"
              title="Reasignar quincena"
            >
              <option value="">—</option>
              <option value="1">Q1</option>
              <option value="2">Q2</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GastosFijosTab() {
  const [gastos, setGastos] = useState<FinanzasGastoFijo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', monto: 0, tipo: 'indefinido' as 'cuota' | 'indefinido', cuotas_totales: 0 })

  useEffect(() => {
    getGastosFijos().then(setGastos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createGastoFijo({
      nombre: form.nombre,
      monto: form.monto,
      tipo: form.tipo,
      cuotas_totales: form.tipo === 'cuota' ? form.cuotas_totales : null,
      cuotas_pagadas: 0,
      activo: true,
    })
    setGastos((prev) => [...prev, created])
    setForm({ nombre: '', monto: 0, tipo: 'indefinido', cuotas_totales: 0 })
    setShowForm(false)
  }

  async function toggleActivo(g: FinanzasGastoFijo) {
    const updated = await updateGastoFijo(g.id, { activo: !g.activo })
    setGastos((prev) => prev.map((x) => (x.id === g.id ? updated : x)))
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Gasto Fijo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                required
                min={0}
                value={form.monto}
                onChange={(e) => setForm((p) => ({ ...p, monto: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as 'cuota' | 'indefinido' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="indefinido">Indefinido</option>
                <option value="cuota">Con cuotas</option>
              </select>
            </div>
            {form.tipo === 'cuota' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas totales</label>
                <input
                  type="number"
                  min={1}
                  value={form.cuotas_totales}
                  onChange={(e) => setForm((p) => ({ ...p, cuotas_totales: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : gastos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay gastos fijos todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-2 text-gray-900">{g.nombre}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {g.tipo === 'cuota' ? `Cuota (${g.cuotas_pagadas}/${g.cuotas_totales ?? '?'})` : 'Indefinido'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{currency.format(g.monto)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggleActivo(g)}
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        g.activo
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {g.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DeudasTab() {
  const [deudas, setDeudas] = useState<FinanzasDeuda[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSaldo, setEditSaldo] = useState(0)
  const [form, setForm] = useState({ persona: '', concepto: '', monto_original: 0, saldo_actual: 0, pago_mensual: 0 })

  useEffect(() => {
    getDeudas().then(setDeudas).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createDeuda({ ...form, activa: true })
    setDeudas((prev) => [...prev, created])
    setForm({ persona: '', concepto: '', monto_original: 0, saldo_actual: 0, pago_mensual: 0 })
    setShowForm(false)
  }

  async function handleSaveSaldo(d: FinanzasDeuda) {
    const updated = await updateDeuda(d.id, { saldo_actual: editSaldo })
    setDeudas((prev) => prev.map((x) => (x.id === d.id ? updated : x)))
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Deuda'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <input
                type="text"
                required
                value={form.persona}
                onChange={(e) => setForm((p) => ({ ...p, persona: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
              <input
                type="text"
                required
                value={form.concepto}
                onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto original</label>
              <input
                type="number"
                min={0}
                value={form.monto_original}
                onChange={(e) => setForm((p) => ({ ...p, monto_original: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo actual</label>
              <input
                type="number"
                required
                value={form.saldo_actual}
                onChange={(e) => setForm((p) => ({ ...p, saldo_actual: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pago mensual</label>
              <input
                type="number"
                min={0}
                value={form.pago_mensual}
                onChange={(e) => setForm((p) => ({ ...p, pago_mensual: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : deudas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay deudas registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Persona</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2 text-right">Monto original</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2 text-right">Pago mensual</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deudas.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-gray-700">{d.persona}</td>
                  <td className="px-4 py-2 text-gray-900">{d.concepto}</td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {d.monto_original != null ? currency.format(d.monto_original) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {editingId === d.id ? (
                      <input
                        type="number"
                        autoFocus
                        value={editSaldo}
                        onChange={(e) => setEditSaldo(Number(e.target.value))}
                        className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm text-right"
                      />
                    ) : (
                      currency.format(d.saldo_actual)
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {d.pago_mensual != null ? currency.format(d.pago_mensual) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editingId === d.id ? (
                      <button
                        onClick={() => handleSaveSaldo(d)}
                        className="px-2 py-0.5 text-xs text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Guardar
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(d.id)
                          setEditSaldo(d.saldo_actual)
                        }}
                        className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Editar saldo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function IngresosTab() {
  const [ingresos, setIngresos] = useState<FinanzasIngreso[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ fuente: '', monto: 0, periodo: currentMonth(), quincena: '' })

  useEffect(() => {
    getIngresos().then(setIngresos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createIngreso({
      fuente: form.fuente,
      monto: form.monto,
      periodo: `${form.periodo}-01`,
      quincena: form.quincena ? (Number(form.quincena) as 1 | 2) : null,
    })
    setIngresos((prev) => [created, ...prev])
    setForm({ fuente: '', monto: 0, periodo: currentMonth(), quincena: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Ingreso'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
              <input
                type="text"
                required
                placeholder="Salario Transcom, Otros..."
                value={form.fuente}
                onChange={(e) => setForm((p) => ({ ...p, fuente: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                required
                min={0}
                value={form.monto}
                onChange={(e) => setForm((p) => ({ ...p, monto: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <input
                type="month"
                value={form.periodo}
                onChange={(e) => setForm((p) => ({ ...p, periodo: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quincena (opcional)</label>
              <select
                value={form.quincena}
                onChange={(e) => setForm((p) => ({ ...p, quincena: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Mensual (sin quincena)</option>
                <option value="1">Quincena 1 (15)</option>
                <option value="2">Quincena 2 (30)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : ingresos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay ingresos registrados todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Fuente</th>
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2">Quincena</th>
                <th className="px-4 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingresos.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2 text-gray-900">{i.fuente}</td>
                  <td className="px-4 py-2 text-gray-500">{i.periodo}</td>
                  <td className="px-4 py-2 text-gray-500">{i.quincena ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{currency.format(i.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
