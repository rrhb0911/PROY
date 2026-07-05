import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, getOrCreateProyCalendarId, listEvents, createEvent, updateEvent } from '@/lib/google-calendar'

interface SyncRow {
  id: number
  origen: 'evento' | 'proyecto' | 'documento'
  origen_id: number
  google_event_id: string
  synced_at: string
  created_by: 'dashboard' | 'google'
}

export async function POST() {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    return NextResponse.json({ connected: false, pushed: 0, pulled: 0 })
  }

  const admin = createAdminClient()
  let pulled = 0
  let pushed = 0

  const { data: syncRows } = await admin.from('google_calendar_sync').select('*')
  const byGoogleId = new Map<string, SyncRow>((syncRows ?? []).map((s: SyncRow) => [s.google_event_id, s]))

  // ---------- Pull: traer cambios de Google (eventos nuevos o editados) ----------
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
  const googleEvents = await listEvents(accessToken, timeMin, timeMax)

  for (const event of googleEvents) {
    const fecha = event.start?.date ?? event.start?.dateTime?.slice(0, 10)
    if (!fecha) continue

    const mapped = byGoogleId.get(event.id)
    if (!mapped) {
      // Cita creada directo en Google Calendar -> se importa como Evento nuevo
      const { data: nuevoEvento } = await admin
        .from('calendario_eventos')
        .insert({ titulo: event.summary ?? '(sin título)', fecha, categoria: 'personal' })
        .select()
        .single()
      if (nuevoEvento) {
        await admin.from('google_calendar_sync').insert({
          origen: 'evento',
          origen_id: nuevoEvento.id,
          google_event_id: event.id,
          synced_at: new Date().toISOString(),
          created_by: 'google',
        })
        pulled++
      }
      continue
    }

    if (new Date(event.updated) > new Date(mapped.synced_at)) {
      // Se editó del lado de Google desde el último sync -> gana Google
      if (mapped.origen === 'evento') {
        await admin.from('calendario_eventos').update({ titulo: event.summary, fecha }).eq('id', mapped.origen_id)
      } else if (mapped.origen === 'proyecto') {
        await admin.from('projects').update({ target_date: fecha }).eq('id', mapped.origen_id)
      } else if (mapped.origen === 'documento') {
        await admin.from('documentos').update({ fecha_vencimiento: fecha }).eq('id', mapped.origen_id)
      }
      await admin.from('google_calendar_sync').update({ synced_at: new Date().toISOString() }).eq('id', mapped.id)
      pulled++
    }
  }

  // ---------- Push: reflejar Eventos/Proyectos/Documentos locales en el calendario dedicado "PROY" ----------
  const proyCalendarId = await getOrCreateProyCalendarId(accessToken)
  const { data: syncRowsFresh } = await admin.from('google_calendar_sync').select('*')
  const byKey = new Map<string, SyncRow>((syncRowsFresh ?? []).map((s: SyncRow) => [`${s.origen}-${s.origen_id}`, s]))

  const [{ data: eventos }, { data: proyectos }, { data: documentos }] = await Promise.all([
    admin.from('calendario_eventos').select('id,titulo,fecha'),
    admin.from('projects').select('id,name,target_date').not('target_date', 'is', null),
    admin.from('documentos').select('id,nombre,fecha_vencimiento').not('fecha_vencimiento', 'is', null),
  ])

  async function push(origen: SyncRow['origen'], id: number, titulo: string, fecha: string) {
    const key = `${origen}-${id}`
    const existing = byKey.get(key)
    if (!existing) {
      const created = await createEvent(accessToken!, proyCalendarId, titulo, fecha)
      await admin.from('google_calendar_sync').insert({
        origen,
        origen_id: id,
        google_event_id: created.id,
        synced_at: new Date().toISOString(),
        created_by: 'dashboard',
      })
      pushed++
    } else if (existing.created_by === 'dashboard') {
      // Nunca se sobreescribe un evento importado del calendario personal (cumpleaños, fuera de oficina, etc.)
      await updateEvent(accessToken!, proyCalendarId, existing.google_event_id, titulo, fecha)
      await admin.from('google_calendar_sync').update({ synced_at: new Date().toISOString() }).eq('id', existing.id)
      pushed++
    }
  }

  for (const e of eventos ?? []) await push('evento', e.id, e.titulo, e.fecha)
  for (const p of proyectos ?? []) await push('proyecto', p.id, `Entrega: ${p.name}`, p.target_date)
  for (const d of documentos ?? []) await push('documento', d.id, `Vence: ${d.nombre}`, d.fecha_vencimiento)

  return NextResponse.json({ connected: true, pushed, pulled })
}
