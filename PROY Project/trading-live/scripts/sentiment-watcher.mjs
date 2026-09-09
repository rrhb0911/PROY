// Proceso de larga duración (dejar corriendo en el VPS donde vive cTrader
// Desktop, 24/7): vigila `trading_sentiment_refresh` en Supabase por pedidos
// de actualización manual desde Tower (botón "Actualizar", desde cualquier
// dispositivo — PC, celular), y además corre solo cada AUTO_REFRESH_MIN como
// piso de frescura. No requiere sesión de Claude Code — es un script Node
// aparte, se inicia una vez y queda corriendo (o vía Task Scheduler de
// Windows / pm2 para que sobreviva un reinicio).
//
// Uso: node sentiment-watcher.mjs
import { runOnce } from './compute-sentiment.mjs';
import { createClient } from '@supabase/supabase-js';

// compute-sentiment.mjs ya carga tower/.env.local como efecto de importarlo
// (ver su propio header) — para cuando llegamos acá, process.env ya lo tiene.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const POLL_MS = 5000;
const AUTO_REFRESH_MIN = 30;

let running = false;

async function processRefresh(reason) {
  if (running) return; // ya hay una corrida en curso, no se pisan
  running = true;
  const startedAt = new Date();
  console.log(`[${startedAt.toISOString()}] Corriendo cálculo (${reason})...`);
  try {
    await supabase.from('trading_sentiment_refresh').upsert({ id: 'default', status: 'running', requested_at: startedAt.toISOString() });
    const count = await runOnce();
    await supabase.from('trading_sentiment_refresh').upsert({ id: 'default', status: 'done', completed_at: new Date().toISOString(), error: null });
    console.log(`[${new Date().toISOString()}] OK — ${count} filas actualizadas.\n`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ERROR:`, e.message || e);
    await supabase.from('trading_sentiment_refresh').upsert({ id: 'default', status: 'error', completed_at: new Date().toISOString(), error: String(e.message || e) }).catch(() => {});
  } finally {
    running = false;
  }
}

async function pollForRequests() {
  const { data, error } = await supabase.from('trading_sentiment_refresh').select('status').eq('id', 'default').maybeSingle();
  if (error) { console.warn('poll error:', error.message); return; }
  if (data?.status === 'pending') await processRefresh('pedido desde Tower');
}

console.log(`sentiment-watcher arrancado. Poll cada ${POLL_MS / 1000}s, auto-refresh cada ${AUTO_REFRESH_MIN}min.`);
setInterval(pollForRequests, POLL_MS);
setInterval(() => processRefresh('auto-refresh periódico'), AUTO_REFRESH_MIN * 60 * 1000);
processRefresh('arranque'); // primera corrida al iniciar el proceso
