'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventDropArg } from '@fullcalendar/core'
import { getProjects, updateProject } from '@/lib/db'
import { getDocumentos, updateDocumento } from '@/lib/documentos-db'
import { getEventos, createEvento, updateEvento } from '@/lib/calendario-db'
import type { CalendarioEvento } from '@/lib/types'

const TABS = [
  { id: 'proximos', label: 'Próximos' },
  { id: 'eventos', label: 'Eventos' },
] as const

type TabId = (typeof TABS)[number]['id']

interface ItemCalendario {
  id: string
  tipo: 'proyecto' | 'documento' | 'evento'
  origenId: number
  titulo: string
  fecha: string
  badge: string
}

const TIPO_META = {
  proyecto: { label: 'Proyecto', color: 'bg-red-100 text-red-800', hex: '#dc2626' },
  documento: { label: 'Documento', color: 'bg-orange-100 text-orange-800', hex: '#f97316' },
  evento: { label: 'Evento', color: 'bg-purple-100 text-purple-800', hex: '#9333ea' },
}

export default function CalendarioPage() {
  const [tab, setTab] = useState<TabId>('proximos')

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <p className="text-sm text-gray-500">Entregas, vencimientos y eventos personales</p>
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

      {tab === 'proximos' && <ProximosTab />}
      {tab === 'eventos' && <EventosTab />}
    </div>
  )
}

interface PendingDrop {
  item: ItemCalendario
  nuevaFecha: string
  revert: () => void
}

function ProximosTab() {
  const [items, setItems] = useState<ItemCalendario[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(true)
  const [connected, setConnected] = useState(true)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

  useEffect(() => {
    fetch('/api/calendar-sync', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => setConnected(result.connected))
      .catch(console.error)
      .finally(() => {
        setSyncing(false)
        cargarItems().finally(() => setLoading(false))
      })
  }, [])

  async function cargarItems() {
    const [proyectos, documentos, eventos] = await Promise.all([getProjects(), getDocumentos(), getEventos()])
    const unificado: ItemCalendario[] = [
      ...proyectos
        .filter((p) => p.target_date)
        .map((p) => ({ id: `proyecto-${p.id}`, tipo: 'proyecto' as const, origenId: p.id, titulo: p.name, fecha: p.target_date!, badge: 'Entrega' })),
      ...documentos
        .filter((d) => d.fecha_vencimiento)
        .map((d) => ({ id: `documento-${d.id}`, tipo: 'documento' as const, origenId: d.id, titulo: d.nombre, fecha: d.fecha_vencimiento!, badge: 'Vence' })),
      ...eventos.map((e) => ({ id: `evento-${e.id}`, tipo: 'evento' as const, origenId: e.id, titulo: e.titulo, fecha: e.fecha, badge: e.categoria === 'recordatorio' ? 'Recordatorio' : 'Personal' })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha))
    setItems(unificado)
  }

  function handleEventDrop(info: EventDropArg) {
    const item = items.find((i) => i.id === info.event.id)
    if (!item) return
    setPendingDrop({ item, nuevaFecha: info.event.startStr, revert: info.revert })
  }

  async function confirmarMovimiento() {
    if (!pendingDrop) return
    const { item, nuevaFecha } = pendingDrop
    if (item.tipo === 'proyecto') await updateProject(item.origenId, { target_date: nuevaFecha })
    else if (item.tipo === 'documento') await updateDocumento(item.origenId, { fecha_vencimiento: nuevaFecha })
    else await updateEvento(item.origenId, { fecha: nuevaFecha })
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, fecha: nuevaFecha } : i)))
    setPendingDrop(null)
  }

  function cancelarMovimiento() {
    pendingDrop?.revert()
    setPendingDrop(null)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        {syncing ? 'Sincronizando con Google Calendar...' : 'Cargando...'}
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <p>Tu cuenta de Google todavía no tiene permiso de Calendario.</p>
        <p className="text-sm mt-1">
          Cierra sesión y vuelve a entrar con Google para conectar tu calendario —{' '}
          <a href="/login" className="text-blue-600 hover:underline">ir a login</a>.
        </p>
      </div>
    )
  }

  const events = items.map((item) => ({
    id: item.id,
    title: item.titulo,
    date: item.fecha,
    backgroundColor: TIPO_META[item.tipo].hex,
    borderColor: TIPO_META[item.tipo].hex,
  }))

  return (
    <div>
      <div className="flex gap-3 mb-4 text-xs text-gray-500">
        {(Object.keys(TIPO_META) as (keyof typeof TIPO_META)[]).map((tipo) => (
          <span key={tipo} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIPO_META[tipo].hex }} />
            {TIPO_META[tipo].label}
          </span>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="es"
          height="auto"
          editable={true}
          events={events}
          eventDrop={handleEventDrop}
        />
      </div>

      {pendingDrop && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={cancelarMovimiento}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Mover este item?</h3>
            <p className="text-sm text-gray-600 mb-6">
              &quot;{pendingDrop.item.titulo}&quot; se moverá a <strong>{pendingDrop.nuevaFecha}</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelarMovimiento}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMovimiento}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EventosTab() {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    titulo: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '',
    categoria: 'personal' as 'personal' | 'recordatorio',
    notas: '',
  })

  useEffect(() => {
    getEventos().then(setEventos).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const created = await createEvento({
      titulo: form.titulo,
      fecha: form.fecha,
      hora: form.hora || null,
      categoria: form.categoria,
      notas: form.notas || null,
    })
    setEventos((prev) => [...prev, created].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    setForm({ titulo: '', fecha: new Date().toISOString().slice(0, 10), hora: '', categoria: 'personal', notas: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Evento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora (opcional)</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value as 'personal' | 'recordatorio' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="personal">Personal</option>
                <option value="recordatorio">Recordatorio</option>
              </select>
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
        ) : eventos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay eventos registrados todavía.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {eventos.map((e) => (
              <li key={e.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.titulo}</p>
                  {e.notas && <p className="text-sm text-gray-500">{e.notas}</p>}
                </div>
                <span className="text-xs text-gray-500">
                  {e.fecha} {e.hora ?? ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
