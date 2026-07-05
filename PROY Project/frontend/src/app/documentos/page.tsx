'use client'

import { useState, useEffect } from 'react'
import { getDocumentos, createDocumento } from '@/lib/documentos-db'
import type { Documento, CategoriaDocumento } from '@/lib/types'

const CATEGORIA_LABEL: Record<CategoriaDocumento, string> = {
  identificacion: 'Identificación',
  vehicular: 'Vehicular',
  financiero: 'Financiero',
  contractual: 'Contractual',
  garantia: 'Garantía',
  salud: 'Salud',
  vivienda: 'Vivienda',
}

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as CategoriaDocumento[]

const TABS = [
  { id: 'vencimientos', label: 'Vencimientos' },
  { id: 'documentos', label: 'Documentos' },
] as const

type TabId = (typeof TABS)[number]['id']

function diasRestantes(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fecha + 'T00:00:00')
  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export default function DocumentosPage() {
  const [tab, setTab] = useState<TabId>('vencimientos')

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500">Documentos personales y vencimientos</p>
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

      {tab === 'vencimientos' && <VencimientosTab />}
      {tab === 'documentos' && <DocumentosTab />}
    </div>
  )
}

function VencimientosTab() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocumentos().then(setDocumentos).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
  }

  const conVencimiento = documentos.filter((d) => d.fecha_vencimiento)
  const ordenados = [...conVencimiento].sort(
    (a, b) => new Date(a.fecha_vencimiento!).getTime() - new Date(b.fecha_vencimiento!).getTime()
  )

  if (ordenados.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No hay documentos con fecha de vencimiento registrada.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2">Documento</th>
            <th className="px-4 py-2">Categoría</th>
            <th className="px-4 py-2">Vence</th>
            <th className="px-4 py-2 text-right">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ordenados.map((d) => {
            const dias = diasRestantes(d.fecha_vencimiento!)
            const estado =
              dias < 0
                ? { label: `Vencido hace ${Math.abs(dias)}d`, color: 'bg-red-100 text-red-800' }
                : dias <= d.dias_alerta
                  ? { label: `En ${dias}d`, color: 'bg-amber-100 text-amber-800' }
                  : { label: `En ${dias}d`, color: 'bg-green-100 text-green-800' }
            return (
              <tr key={d.id}>
                <td className="px-4 py-2 text-gray-900">{d.nombre}</td>
                <td className="px-4 py-2 text-gray-500">{CATEGORIA_LABEL[d.categoria]}</td>
                <td className="px-4 py-2 text-gray-500">{d.fecha_vencimiento}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estado.color}`}>{estado.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DocumentosTab() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaDocumento | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    categoria: 'identificacion' as CategoriaDocumento,
    nombre: '',
    numero_referencia: '',
    emisor: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    dias_alerta: 30,
    ubicacion_fisica: '',
    link_digital: '',
    notas: '',
  })

  useEffect(() => {
    getDocumentos().then(setDocumentos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createDocumento({
      categoria: form.categoria,
      nombre: form.nombre,
      numero_referencia: form.numero_referencia || null,
      emisor: form.emisor || null,
      fecha_emision: form.fecha_emision || null,
      fecha_vencimiento: form.fecha_vencimiento || null,
      dias_alerta: form.dias_alerta,
      ubicacion_fisica: form.ubicacion_fisica || null,
      link_digital: form.link_digital || null,
      notas: form.notas || null,
    })
    setDocumentos((prev) => [...prev, created])
    setForm({
      categoria: 'identificacion',
      nombre: '',
      numero_referencia: '',
      emisor: '',
      fecha_emision: '',
      fecha_vencimiento: '',
      dias_alerta: 30,
      ubicacion_fisica: '',
      link_digital: '',
      notas: '',
    })
    setShowForm(false)
  }

  const filtrados = categoriaFiltro ? documentos.filter((d) => d.categoria === categoriaFiltro) : documentos

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Documento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value as CategoriaDocumento }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                placeholder="Pasaporte, SOAT, Contrato Transcom..."
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número/Referencia</label>
              <input
                type="text"
                value={form.numero_referencia}
                onChange={(e) => setForm((p) => ({ ...p, numero_referencia: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emisor</label>
              <input
                type="text"
                value={form.emisor}
                onChange={(e) => setForm((p) => ({ ...p, emisor: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha emisión</label>
              <input
                type="date"
                value={form.fecha_emision}
                onChange={(e) => setForm((p) => ({ ...p, fecha_emision: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alertar (días antes)</label>
              <input
                type="number"
                min={0}
                value={form.dias_alerta}
                onChange={(e) => setForm((p) => ({ ...p, dias_alerta: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación física</label>
              <input
                type="text"
                value={form.ubicacion_fisica}
                onChange={(e) => setForm((p) => ({ ...p, ubicacion_fisica: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link copia digital</label>
              <input
                type="url"
                value={form.link_digital}
                onChange={(e) => setForm((p) => ({ ...p, link_digital: e.target.value }))}
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

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategoriaFiltro(null)}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            categoriaFiltro === null
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => setCategoriaFiltro(c)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              categoriaFiltro === c
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {CATEGORIA_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay documentos {categoriaFiltro ? 'en esta categoría' : 'todavía'}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Emisor</th>
                <th className="px-4 py-2">Vence</th>
                <th className="px-4 py-2">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-gray-900">{d.nombre}</td>
                  <td className="px-4 py-2 text-gray-500">{CATEGORIA_LABEL[d.categoria]}</td>
                  <td className="px-4 py-2 text-gray-500">{d.emisor ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{d.fecha_vencimiento ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {d.link_digital ? (
                      <a href={d.link_digital} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Ver copia
                      </a>
                    ) : (
                      d.ubicacion_fisica ?? '—'
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
