import { createAdminClient } from './supabase/admin'

const PERSONAL_CALENDAR_ID = 'primary'
const API_BASE = 'https://www.googleapis.com/calendar/v3'

interface TokenRow {
  id: number
  access_token: string
  refresh_token: string | null
  expires_at: string
}

export async function getValidAccessToken(): Promise<string | null> {
  const admin = createAdminClient()
  const { data: token } = await admin
    .from('google_calendar_tokens')
    .select('*')
    .maybeSingle<TokenRow>()

  if (!token) return null

  if (new Date(token.expires_at) > new Date()) {
    return token.access_token
  }

  if (!token.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const refreshed = await res.json()

  await admin
    .from('google_calendar_tokens')
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq('id', token.id)

  return refreshed.access_token
}

export interface GoogleEvent {
  id: string
  summary: string
  description?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
  updated: string
}

async function googleFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function listEvents(accessToken: string, timeMin: string, timeMax: string): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', maxResults: '250' })
  const data = await googleFetch(accessToken, `/calendars/${PERSONAL_CALENDAR_ID}/events?${params}`)
  return data.items || []
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  summary: string,
  fecha: string
): Promise<GoogleEvent> {
  return googleFetch(accessToken, `/calendars/${calendarId}/events`, {
    method: 'POST',
    body: JSON.stringify({ summary, start: { date: fecha }, end: { date: fecha } }),
  })
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  summary: string,
  fecha: string
): Promise<GoogleEvent> {
  return googleFetch(accessToken, `/calendars/${calendarId}/events/${googleEventId}`, {
    method: 'PATCH',
    body: JSON.stringify({ summary, start: { date: fecha }, end: { date: fecha } }),
  })
}

interface TokenRowWithCalendar extends TokenRow {
  proy_calendar_id: string | null
}

export async function getOrCreateProyCalendarId(accessToken: string): Promise<string> {
  const admin = createAdminClient()
  const { data: token } = await admin
    .from('google_calendar_tokens')
    .select('*')
    .maybeSingle<TokenRowWithCalendar>()

  if (token?.proy_calendar_id) return token.proy_calendar_id

  const created = await googleFetch(accessToken, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: 'PROY' }),
  })

  await admin.from('google_calendar_tokens').update({ proy_calendar_id: created.id }).eq('id', token!.id)

  return created.id
}
