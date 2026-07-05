'use client'

import { useState, useEffect } from 'react'
import {
  getCuentas,
  createCuenta,
  getEstrategias,
  createEstrategia,
  getBots,
  createBot,
  updateBot,
  getOperaciones,
  createOperacion,
  getAnalisis,
  createAnalisis,
} from '@/lib/trading-db'
import type {
  TradingCuenta,
  TradingEstrategia,
  TradingBot,
  TradingOperacion,
  TradingAnalisis,
  Mercado,
} from '@/lib/types'

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'estrategias', label: 'Estrategias' },
  { id: 'bots', label: 'Bots' },
  { id: 'operaciones', label: 'Operaciones' },
  { id: 'analisis', label: 'Análisis' },
] as const

type TabId = (typeof TABS)[number]['id']

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MERCADO_LABEL: Record<Mercado, string> = { forex: 'Forex', crypto: 'Crypto' }

export default function TradingPage() {
  const [tab, setTab] = useState<TabId>('resumen')
  const [mes, setMes] = useState(currentMonth())

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trading</h1>
        <p className="text-sm text-gray-500">Cuentas, estrategias, bots, operaciones y análisis</p>
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

      {(tab === 'resumen' || tab === 'operaciones') && (
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
      {tab === 'cuentas' && <CuentasTab />}
      {tab === 'estrategias' && <EstrategiasTab />}
      {tab === 'bots' && <BotsTab />}
      {tab === 'operaciones' && <OperacionesTab mes={mes} />}
      {tab === 'analisis' && <AnalisisTab />}
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
  const [cuentas, setCuentas] = useState<TradingCuenta[]>([])
  const [operaciones, setOperaciones] = useState<TradingOperacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getCuentas(), getOperaciones(mes)])
      .then(([c, o]) => {
        setCuentas(c)
        setOperaciones(o)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mes])

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
  }

  const balancePorMercado = (mercado: Mercado) =>
    cuentas.filter((c) => c.mercado === mercado && c.activa).reduce((a, c) => a + Number(c.balance_actual), 0)

  const pnlPorMercado = (mercado: Mercado) =>
    operaciones.filter((o) => o.mercado === mercado).reduce((a, o) => a + Number(o.resultado), 0)

  const pnlTotal = operaciones.reduce((a, o) => a + Number(o.resultado), 0)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Balance Forex" value={currency.format(balancePorMercado('forex'))} color="text-blue-600" />
        <StatCard label="Balance Crypto" value={currency.format(balancePorMercado('crypto'))} color="text-purple-600" />
        <StatCard
          label="P&L del mes"
          value={currency.format(pnlTotal)}
          color={pnlTotal >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard label="Operaciones del mes" value={String(operaciones.length)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">P&L por mercado</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-700">Forex</span>
              <span className={`font-medium ${pnlPorMercado('forex') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currency.format(pnlPorMercado('forex'))}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-700">Crypto</span>
              <span className={`font-medium ${pnlPorMercado('crypto') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currency.format(pnlPorMercado('crypto'))}
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas activas</h2>
          {cuentas.filter((c) => c.activa).length === 0 ? (
            <p className="text-gray-500 text-sm">No hay cuentas activas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {cuentas.filter((c) => c.activa).map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span className="text-gray-700">{c.nombre} ({MERCADO_LABEL[c.mercado]})</span>
                  <span className="font-medium text-gray-900">{currency.format(c.balance_actual)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function CuentasTab() {
  const [cuentas, setCuentas] = useState<TradingCuenta[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', mercado: 'forex' as Mercado, broker: '', balance_actual: 0, moneda: 'USD' })

  useEffect(() => {
    getCuentas().then(setCuentas).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createCuenta({ ...form, activa: true })
    setCuentas((prev) => [...prev, created])
    setForm({ nombre: '', mercado: 'forex', broker: '', balance_actual: 0, moneda: 'USD' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Cuenta'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mercado</label>
              <select
                value={form.mercado}
                onChange={(e) => setForm((p) => ({ ...p, mercado: e.target.value as Mercado }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Broker/Exchange</label>
              <input
                type="text"
                placeholder="cTrader, Binance..."
                value={form.broker}
                onChange={(e) => setForm((p) => ({ ...p, broker: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
              <input
                type="number"
                value={form.balance_actual}
                onChange={(e) => setForm((p) => ({ ...p, balance_actual: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <input
                type="text"
                value={form.moneda}
                onChange={(e) => setForm((p) => ({ ...p, moneda: e.target.value }))}
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
        ) : cuentas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay cuentas todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Mercado</th>
                <th className="px-4 py-2">Broker</th>
                <th className="px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cuentas.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-2 text-gray-500">{MERCADO_LABEL[c.mercado]}</td>
                  <td className="px-4 py-2 text-gray-500">{c.broker ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{currency.format(c.balance_actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EstrategiasTab() {
  const [estrategias, setEstrategias] = useState<TradingEstrategia[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })

  useEffect(() => {
    getEstrategias().then(setEstrategias).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createEstrategia({ ...form, activa: true })
    setEstrategias((prev) => [...prev, created])
    setForm({ nombre: '', descripcion: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Estrategia'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
        ) : estrategias.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay estrategias todavía.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {estrategias.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{e.nombre}</p>
                {e.descripcion && <p className="text-sm text-gray-500 mt-0.5">{e.descripcion}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BotsTab() {
  const [bots, setBots] = useState<TradingBot[]>([])
  const [estrategias, setEstrategias] = useState<TradingEstrategia[]>([])
  const [cuentas, setCuentas] = useState<TradingCuenta[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', estrategia_id: '', cuenta_id: '' })

  useEffect(() => {
    Promise.all([getBots(), getEstrategias(), getCuentas()])
      .then(([b, e, c]) => {
        setBots(b)
        setEstrategias(e)
        setCuentas(c)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createBot({
      nombre: form.nombre,
      estrategia_id: form.estrategia_id ? Number(form.estrategia_id) : null,
      cuenta_id: Number(form.cuenta_id),
      activo: true,
    })
    setBots((prev) => [...prev, created])
    setForm({ nombre: '', estrategia_id: '', cuenta_id: '' })
    setShowForm(false)
  }

  async function toggleActivo(b: TradingBot) {
    const updated = await updateBot(b.id, { activo: !b.activo })
    setBots((prev) => prev.map((x) => (x.id === b.id ? updated : x)))
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Bot'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estrategia</label>
              <select
                value={form.estrategia_id}
                onChange={(e) => setForm((p) => ({ ...p, estrategia_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Sin estrategia</option>
                {estrategias.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
              <select
                required
                value={form.cuenta_id}
                onChange={(e) => setForm((p) => ({ ...p, cuenta_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecciona...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
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
        ) : bots.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay bots todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Estrategia</th>
                <th className="px-4 py-2">Cuenta</th>
                <th className="px-4 py-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bots.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 text-gray-900">{b.nombre}</td>
                  <td className="px-4 py-2 text-gray-500">{b.estrategia?.nombre ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{b.cuenta?.nombre ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggleActivo(b)}
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        b.activo
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {b.activo ? 'Activo' : 'Inactivo'}
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

function OperacionesTab({ mes }: { mes: string }) {
  const [operaciones, setOperaciones] = useState<TradingOperacion[]>([])
  const [cuentas, setCuentas] = useState<TradingCuenta[]>([])
  const [estrategias, setEstrategias] = useState<TradingEstrategia[]>([])
  const [bots, setBots] = useState<TradingBot[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    cuenta_id: '',
    estrategia_id: '',
    bot_id: '',
    par: '',
    tipo: 'compra' as 'compra' | 'venta',
    resultado: 0,
    fecha: new Date().toISOString().slice(0, 10),
    notas: '',
  })

  useEffect(() => {
    setLoading(true)
    Promise.all([getOperaciones(mes), getCuentas(), getEstrategias(), getBots()])
      .then(([o, c, e, b]) => {
        setOperaciones(o)
        setCuentas(c)
        setEstrategias(e)
        setBots(b)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mes])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const cuenta = cuentas.find((c) => c.id === Number(form.cuenta_id))
    if (!cuenta) return
    const created = await createOperacion({
      cuenta_id: cuenta.id,
      mercado: cuenta.mercado,
      estrategia_id: form.estrategia_id ? Number(form.estrategia_id) : null,
      bot_id: form.bot_id ? Number(form.bot_id) : null,
      par: form.par,
      tipo: form.tipo,
      resultado: form.resultado,
      fecha: form.fecha,
      notas: form.notas || null,
    })
    setOperaciones((prev) => [created, ...prev])
    setForm({
      cuenta_id: '',
      estrategia_id: '',
      bot_id: '',
      par: '',
      tipo: 'compra',
      resultado: 0,
      fecha: new Date().toISOString().slice(0, 10),
      notas: '',
    })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Operación'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
              <select
                required
                value={form.cuenta_id}
                onChange={(e) => setForm((p) => ({ ...p, cuenta_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecciona...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} ({MERCADO_LABEL[c.mercado]})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estrategia (opcional)</label>
              <select
                value={form.estrategia_id}
                onChange={(e) => setForm((p) => ({ ...p, estrategia_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {estrategias.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bot (opcional)</label>
              <select
                value={form.bot_id}
                onChange={(e) => setForm((p) => ({ ...p, bot_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Manual</option>
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Par/Activo</label>
              <input
                type="text"
                required
                placeholder="EUR/USD, BTC/USDT..."
                value={form.par}
                onChange={(e) => setForm((p) => ({ ...p, par: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as 'compra' | 'venta' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="compra">Compra</option>
                <option value="venta">Venta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resultado (P&L)</label>
              <input
                type="number"
                required
                value={form.resultado}
                onChange={(e) => setForm((p) => ({ ...p, resultado: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
        ) : operaciones.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay operaciones registradas este mes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cuenta</th>
                <th className="px-4 py-2">Par</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Bot</th>
                <th className="px-4 py-2 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operaciones.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 text-gray-500">{o.fecha}</td>
                  <td className="px-4 py-2 text-gray-700">{o.cuenta?.nombre ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-900">{o.par}</td>
                  <td className="px-4 py-2 text-gray-500">{o.tipo}</td>
                  <td className="px-4 py-2 text-gray-500">{o.bot?.nombre ?? 'Manual'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${o.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currency.format(o.resultado)}
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

function AnalisisTab() {
  const [analisis, setAnalisis] = useState<TradingAnalisis[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    mercado: '',
    titulo: '',
    contenido: '',
    fecha: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    getAnalisis().then(setAnalisis).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createAnalisis({
      mercado: form.mercado ? (form.mercado as Mercado) : null,
      titulo: form.titulo,
      contenido: form.contenido || null,
      fecha: form.fecha,
    })
    setAnalisis((prev) => [created, ...prev])
    setForm({ mercado: '', titulo: '', contenido: '', fecha: new Date().toISOString().slice(0, 10) })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Análisis'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mercado (opcional)</label>
              <select
                value={form.mercado}
                onChange={(e) => setForm((p) => ({ ...p, mercado: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">General</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
            <textarea
              rows={4}
              value={form.contenido}
              onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
        ) : analisis.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay entradas de análisis todavía.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {analisis.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                  <span className="text-xs text-gray-500">
                    {a.fecha} {a.mercado && `· ${MERCADO_LABEL[a.mercado]}`}
                  </span>
                </div>
                {a.contenido && <p className="text-sm text-gray-600 mt-1">{a.contenido}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
