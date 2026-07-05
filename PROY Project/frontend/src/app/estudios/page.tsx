'use client'

import { useState, useEffect } from 'react'
import { getRecursos, createRecurso, updateRecurso, getMetas, createMeta, updateMeta } from '@/lib/estudios-db'
import type { EstudioRecurso, EstudioMeta, AreaEstudio, EstadoEstudio } from '@/lib/types'

const TABS = [
  { id: 'recursos', label: 'Recursos' },
  { id: 'metas', label: 'Metas' },
] as const

type TabId = (typeof TABS)[number]['id']

const AREAS: { value: AreaEstudio; label: string }[] = [
  { value: 'programacion', label: 'Programación' },
  { value: 'trading', label: 'Trading' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'ingles', label: 'Inglés' },
]

const TIPOS: { value: EstudioRecurso['tipo']; label: string; icon: string }[] = [
  { value: 'libro', label: 'Libro', icon: '📖' },
  { value: 'curso', label: 'Curso', icon: '🎓' },
  { value: 'articulo', label: 'Artículo', icon: '📰' },
  { value: 'herramienta', label: 'Herramienta', icon: '🛠️' },
]

const ESTADOS: { value: EstadoEstudio; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  { value: 'en_progreso', label: 'En progreso', color: 'bg-amber-100 text-amber-800' },
  { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-800' },
]

function areaLabel(area: AreaEstudio) {
  return AREAS.find((a) => a.value === area)?.label ?? area
}

function tipoMeta(tipo: EstudioRecurso['tipo']) {
  return TIPOS.find((t) => t.value === tipo)!
}

export default function EstudiosPage() {
  const [tab, setTab] = useState<TabId>('recursos')

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estudios</h1>
        <p className="text-sm text-gray-500">Recursos de aprendizaje y metas trimestrales</p>
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

      {tab === 'recursos' && <RecursosTab />}
      {tab === 'metas' && <MetasTab />}
    </div>
  )
}

function RecursosTab() {
  const [recursos, setRecursos] = useState<EstudioRecurso[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroArea, setFiltroArea] = useState<AreaEstudio | 'todas'>('todas')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    tipo: 'libro' as EstudioRecurso['tipo'],
    area: 'programacion' as AreaEstudio,
    titulo: '',
    link: '',
    notas: '',
  })

  useEffect(() => {
    getRecursos().then(setRecursos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createRecurso({
      tipo: form.tipo,
      area: form.area,
      titulo: form.titulo,
      link: form.link || null,
      notas: form.notas || null,
    })
    setRecursos((prev) => [...prev, created].sort((a, b) => a.titulo.localeCompare(b.titulo)))
    setForm({ tipo: 'libro', area: 'programacion', titulo: '', link: '', notas: '' })
    setShowForm(false)
  }

  async function handleEstadoChange(recurso: EstudioRecurso, estado: EstadoEstudio) {
    const updated = await updateRecurso(recurso.id, { estado })
    setRecursos((prev) => prev.map((r) => (r.id === recurso.id ? updated : r)))
  }

  const filtrados = filtroArea === 'todas' ? recursos : recursos.filter((r) => r.area === filtroArea)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroArea('todas')}
            className={`px-3 py-1 text-sm rounded-full border ${filtroArea === 'todas' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            Todas
          </button>
          {AREAS.map((a) => (
            <button
              key={a.value}
              onClick={() => setFiltroArea(a.value)}
              className={`px-3 py-1 text-sm rounded-full border ${filtroArea === a.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Recurso'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as EstudioRecurso['tipo'] }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
              <select
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value as AreaEstudio }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (opcional)</label>
            <input
              type="url"
              value={form.link}
              onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay recursos registrados todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Área</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((r) => {
                const tipo = tipoMeta(r.tipo)
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-gray-900">
                      {r.link ? (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {r.titulo}
                        </a>
                      ) : (
                        r.titulo
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {tipo.icon} {tipo.label}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{areaLabel(r.area)}</td>
                    <td className="px-4 py-2">
                      <select
                        value={r.estado}
                        onChange={(e) => handleEstadoChange(r, e.target.value as EstadoEstudio)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1"
                      >
                        {ESTADOS.map((es) => (
                          <option key={es.value} value={es.value}>
                            {es.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MetasTab() {
  const [metas, setMetas] = useState<EstudioMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ trimestre: '', meta: '', notas: '' })

  useEffect(() => {
    getMetas().then(setMetas).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createMeta({ trimestre: form.trimestre, meta: form.meta, notas: form.notas || null })
    setMetas((prev) => [...prev, created].sort((a, b) => a.trimestre.localeCompare(b.trimestre)))
    setForm({ trimestre: '', meta: '', notas: '' })
    setShowForm(false)
  }

  async function handleEstadoChange(item: EstudioMeta, estado: EstadoEstudio) {
    const updated = await updateMeta(item.id, { estado })
    setMetas((prev) => prev.map((m) => (m.id === item.id ? updated : m)))
  }

  const porTrimestre = metas.reduce<Record<string, EstudioMeta[]>>((acc, m) => {
    ;(acc[m.trimestre] ??= []).push(m)
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Meta'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
            <input
              type="text"
              required
              placeholder="Q3 2026"
              value={form.trimestre}
              onChange={(e) => setForm((p) => ({ ...p, trimestre: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta</label>
            <input
              type="text"
              required
              value={form.meta}
              onChange={(e) => setForm((p) => ({ ...p, meta: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
      ) : metas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay metas registradas todavía.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porTrimestre).map(([trimestre, items]) => (
            <div key={trimestre} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700">{trimestre}</div>
              <ul className="divide-y divide-gray-100">
                {items.map((m) => (
                  <li key={m.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-900">{m.meta}</p>
                      {m.notas && <p className="text-xs text-gray-500">{m.notas}</p>}
                    </div>
                    <select
                      value={m.estado}
                      onChange={(e) => handleEstadoChange(m, e.target.value as EstadoEstudio)}
                      className="text-xs border border-gray-300 rounded-md px-2 py-1"
                    >
                      {ESTADOS.map((es) => (
                        <option key={es.value} value={es.value}>
                          {es.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
