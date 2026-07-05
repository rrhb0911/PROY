import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const providerToken = data.session?.provider_token
      const providerRefreshToken = data.session?.provider_refresh_token
      if (providerToken) {
        const admin = createAdminClient()
        const { data: existing } = await admin
          .from('google_calendar_tokens')
          .select('id, refresh_token')
          .maybeSingle()
        await admin.from('google_calendar_tokens').upsert({
          id: existing?.id ?? undefined,
          access_token: providerToken,
          // Google solo entrega refresh_token la primera vez que se consiente (prompt=consent);
          // si no viene uno nuevo, se conserva el que ya estaba guardado.
          refresh_token: providerRefreshToken ?? existing?.refresh_token ?? null,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
