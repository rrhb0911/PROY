'use client'

import { useState, useEffect } from 'react'
import {
  getMesociclos,
  createMesociclo,
  getSemanas,
  createSemana,
  getEntrenos,
  createEntreno,
} from '@/lib/ciclismo-db'
import type { CiclismoMesociclo, CiclismoSemana, CiclismoEntreno } from '@/lib/types'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'semanas', label: 'Evolución Semanal' },
  { id: 'entrenos', label: 'Entrenos' },
  { id: 'mesociclos', label: 'Mesociclos' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function CiclismoPage() {
  const [tab, setTab] = useState<TabId>('resumen')

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ciclismo</h1>
        <p className="text-sm text-gray-500">Evolución semanal, entrenos y periodización</p>
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

      {tab === 'resumen' && <ResumenTab />}
      {tab === 'semanas' && <SemanasTab />}
      {tab === 'entrenos' && <EntrenosTab />}
      {tab === 'mesociclos' && <MesociclosTab />}
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

function ResumenTab() {
  const [semanas, setSemanas] = useState<CiclismoSemana[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSemanas().then(setSemanas).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
  }

  const ultima = semanas[0]

  if (!ultima) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No hay semanas registradas todavía. Agrega la primera en &quot;Evolución Semanal&quot;.
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Última semana registrada: {ultima.semana_inicio}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="CTL (forma)" value={ultima.ctl?.toString() ?? '—'} color="text-blue-600" />
        <StatCard label="ATL (fatiga)" value={ultima.atl?.toString() ?? '—'} color="text-red-600" />
        <StatCard
          label="TSB (frescura)"
          value={ultima.tsb?.toString() ?? '—'}
          color={(ultima.tsb ?? 0) >= 0 ? 'text-green-600' : 'text-amber-600'}
        />
        <StatCard label="FTP" value={ultima.ftp ? `${ultima.ftp} W` : '—'} color="text-purple-600" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="eFTP" value={ultima.eftp ? `${ultima.eftp} W` : '—'} />
        <StatCard label="FRC" value={ultima.frc?.toString() ?? '—'} />
        <StatCard label="Peso" value={ultima.peso ? `${ultima.peso} kg` : '—'} />
        <StatCard label="Horas" value={ultima.horas?.toString() ?? '—'} />
      </div>
    </div>
  )
}

function SemanasTab() {
  const [semanas, setSemanas] = useState<CiclismoSemana[]>([])
  const [mesociclos, setMesociclos] = useState<CiclismoMesociclo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    semana_inicio: new Date().toISOString().slice(0, 10),
    mesociclo_id: '',
    ctl: '',
    atl: '',
    tsb: '',
    tte_min: '',
    ftp: '',
    eftp: '',
    frc: '',
    peso: '',
    kj: '',
    horas: '',
    notas: '',
  })

  useEffect(() => {
    Promise.all([getSemanas(), getMesociclos()])
      .then(([s, m]) => {
        setSemanas(s)
        setMesociclos(m)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const num = (v: string) => (v === '' ? null : Number(v))
    const created = await createSemana({
      semana_inicio: form.semana_inicio,
      mesociclo_id: form.mesociclo_id ? Number(form.mesociclo_id) : null,
      ctl: num(form.ctl),
      atl: num(form.atl),
      tsb: num(form.tsb),
      tte_min: num(form.tte_min),
      ftp: num(form.ftp),
      eftp: num(form.eftp),
      frc: num(form.frc),
      peso: num(form.peso),
      kj: num(form.kj),
      horas: num(form.horas),
      notas: form.notas || null,
    })
    setSemanas((prev) => [created, ...prev])
    setForm({ ...form, notas: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Semana'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semana (lunes)</label>
              <input
                type="date"
                required
                value={form.semana_inicio}
                onChange={(e) => setForm((p) => ({ ...p, semana_inicio: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mesociclo (opcional)</label>
              <select
                value={form.mesociclo_id}
                onChange={(e) => setForm((p) => ({ ...p, mesociclo_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {mesociclos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {(['ctl', 'atl', 'tsb', 'tte_min'] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.toUpperCase()}</label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {(['ftp', 'eftp', 'frc', 'peso'] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.toUpperCase()}</label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">kJ</label>
              <input
                type="number"
                value={form.kj}
                onChange={(e) => setForm((p) => ({ ...p, kj: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas</label>
              <input
                type="number"
                step="0.1"
                value={form.horas}
                onChange={(e) => setForm((p) => ({ ...p, horas: e.target.value }))}
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : semanas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay semanas registradas todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Semana</th>
                <th className="px-3 py-2">Mesociclo</th>
                <th className="px-3 py-2 text-right">CTL</th>
                <th className="px-3 py-2 text-right">ATL</th>
                <th className="px-3 py-2 text-right">TSB</th>
                <th className="px-3 py-2 text-right">FTP</th>
                <th className="px-3 py-2 text-right">eFTP</th>
                <th className="px-3 py-2 text-right">FRC</th>
                <th className="px-3 py-2 text-right">Peso</th>
                <th className="px-3 py-2 text-right">kJ</th>
                <th className="px-3 py-2 text-right">Horas</th>
                <th className="px-3 py-2">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {semanas.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-gray-900">{s.semana_inicio}</td>
                  <td className="px-3 py-2 text-gray-500">{s.mesociclo?.nombre ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.ctl ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.atl ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.tsb ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.ftp ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.eftp ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.frc ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.peso ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.kj ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.horas ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{s.notas ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EntrenosTab() {
  const [entrenos, setEntrenos] = useState<CiclismoEntreno[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tipo: '',
    duracion_min: '',
    tss: '',
    intensity_factor: '',
    potencia_promedio: '',
    hr_promedio: '',
    kj: '',
    rpe: '',
    notas: '',
  })

  useEffect(() => {
    getEntrenos().then(setEntrenos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const num = (v: string) => (v === '' ? null : Number(v))
    const created = await createEntreno({
      fecha: form.fecha,
      tipo: form.tipo || null,
      duracion_min: num(form.duracion_min),
      tss: num(form.tss),
      intensity_factor: num(form.intensity_factor),
      potencia_promedio: num(form.potencia_promedio),
      hr_promedio: num(form.hr_promedio),
      kj: num(form.kj),
      rpe: num(form.rpe),
      notas: form.notas || null,
    })
    setEntrenos((prev) => [created, ...prev])
    setForm({ ...form, tipo: '', duracion_min: '', tss: '', intensity_factor: '', potencia_promedio: '', hr_promedio: '', kj: '', rpe: '', notas: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Entreno'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <input
                type="text"
                placeholder="VO2max, Base, Recuperación..."
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
              <input
                type="number"
                value={form.duracion_min}
                onChange={(e) => setForm((p) => ({ ...p, duracion_min: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TSS</label>
              <input
                type="number"
                value={form.tss}
                onChange={(e) => setForm((p) => ({ ...p, tss: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IF</label>
              <input
                type="number"
                step="0.01"
                value={form.intensity_factor}
                onChange={(e) => setForm((p) => ({ ...p, intensity_factor: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RPE (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.rpe}
                onChange={(e) => setForm((p) => ({ ...p, rpe: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Potencia prom. (W)</label>
              <input
                type="number"
                value={form.potencia_promedio}
                onChange={(e) => setForm((p) => ({ ...p, potencia_promedio: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HR prom. (bpm)</label>
              <input
                type="number"
                value={form.hr_promedio}
                onChange={(e) => setForm((p) => ({ ...p, hr_promedio: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">kJ</label>
              <input
                type="number"
                value={form.kj}
                onChange={(e) => setForm((p) => ({ ...p, kj: e.target.value }))}
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : entrenos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay entrenos registrados todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Duración</th>
                <th className="px-3 py-2 text-right">TSS</th>
                <th className="px-3 py-2 text-right">Potencia</th>
                <th className="px-3 py-2 text-right">HR</th>
                <th className="px-3 py-2 text-right">RPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entrenos.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-gray-900">{e.fecha}</td>
                  <td className="px-3 py-2 text-gray-500">{e.tipo ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{e.duracion_min ? `${e.duracion_min} min` : '—'}</td>
                  <td className="px-3 py-2 text-right">{e.tss ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{e.potencia_promedio ? `${e.potencia_promedio} W` : '—'}</td>
                  <td className="px-3 py-2 text-right">{e.hr_promedio ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{e.rpe ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MesociclosTab() {
  const [mesociclos, setMesociclos] = useState<CiclismoMesociclo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    nombre: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: '',
    enfoque: '',
    metrica_objetivo: '',
  })

  useEffect(() => {
    getMesociclos().then(setMesociclos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createMesociclo({
      nombre: form.nombre,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      enfoque: form.enfoque || null,
      metrica_objetivo: form.metrica_objetivo || null,
    })
    setMesociclos((prev) => [created, ...prev])
    setForm({ nombre: '', fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: '', enfoque: '', metrica_objetivo: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Mesociclo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                placeholder="Base I, Construcción II..."
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input
                type="date"
                required
                value={form.fecha_inicio}
                onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin (opcional)</label>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enfoque</label>
            <textarea
              rows={2}
              value={form.enfoque}
              onChange={(e) => setForm((p) => ({ ...p, enfoque: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Métrica objetivo</label>
            <input
              type="text"
              placeholder="eFTP, TTE Z2..."
              value={form.metrica_objetivo}
              onChange={(e) => setForm((p) => ({ ...p, metrica_objetivo: e.target.value }))}
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
        ) : mesociclos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay mesociclos todavía.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {mesociclos.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{m.nombre}</p>
                  <span className="text-xs text-gray-500">
                    {m.fecha_inicio} {m.fecha_fin ? `→ ${m.fecha_fin}` : ''}
                  </span>
                </div>
                {m.enfoque && <p className="text-sm text-gray-600 mt-1">{m.enfoque}</p>}
                {m.metrica_objetivo && (
                  <p className="text-xs text-gray-400 mt-0.5">Objetivo: {m.metrica_objetivo}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
