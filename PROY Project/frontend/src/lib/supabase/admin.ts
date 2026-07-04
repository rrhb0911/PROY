import { createClient } from '@supabase/supabase-js'

// Único cliente con service role key — bypassa RLS.
// Solo debe usarse en route handlers server-side, nunca en cliente/browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
