// Calcula el "score de sentimiento" (-1..+1) para los 6 símbolos del dashboard
// de Tower, en H4 y D1, y lo escribe en `trading_sentiment` (Supabase de Tower).
// Corre en ESTA máquina (donde vive cTrader Desktop) porque el MCP es local —
// Tower (Vercel) no puede llamarlo directo. Ver canvas de diseño "Sentimiento de
// Mercado" (propuesta B2) para el diseño visual que consume esta tabla.
//
// Metodología (adaptación de TradingView Technical Rating, ver investigación
// previa a este script — no se copia 1:1):
//  - Grupo A (peso 35%): SMA/EMA de 20/50/100/200, calculadas SOBRE EL MISMO
//    timeframe que se está evaluando (H4 usa velas H4, D1 usa velas D1) — no es
//    una mezcla de timeframes. +1 si el cierre está sobre la media, -1 si está
//    debajo, 0 si faltan datos para esa media.
//  - Grupo B (peso 35%): RSI(14), MACD(12,26,9), Estocástico(14,3,3), ADX(14)
//    con dirección (+DI/-DI) — mismas reglas de señal que TradingView.
//  - Grupo C (peso 30%): estructura propia (no existe en TradingView) — momentum
//    de 20 velas, ruptura del último swing (fractal=2), y ruptura de rango de
//    20 velas con volumen. Ver "Decisiones propias" abajo.
//
// SOLO LECTURA de mercado: no llama ninguna tool de ejecución de órdenes.
import { initSession, getBalance, getTrendbarsRange } from './ctrader-client.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local vive en tower/, no acá — se lee cruzado (mismo monorepo PROY).
const towerEnvPath = path.join(__dirname, '..', '..', 'tower', '.env.local');
for (const line of fs.readFileSync(towerEnvPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (deberían venir de tower/.env.local).');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SYMBOLS = {
  NAS100: '#USNDAQ100',
  SPX500: '#USSPX500',
  US30: '#US30',
  GER40: '#Germany40',
  BITCOIN: 'BITCOIN',
  EURUSD: 'EURUSD',
};
const TIMEFRAMES = ['h4', 'd1'];
const LOOKBACK_DAYS = { h4: 120, d1: 500 }; // suficiente para intentar SMA/EMA200; si no hay tanta historia, se omite esa media

const GROUP_META = [
  { name: 'Medias móviles', weight: 35, detail: 'SMA/EMA 20·50·100·200 sobre el mismo timeframe evaluado.' },
  { name: 'Osciladores', weight: 35, detail: 'RSI(14), MACD(12,26,9), Estocástico(14,3,3), ADX(14) con dirección.' },
  { name: 'Estructura SMC/ICT', weight: 30, detail: 'Momentum de 20 velas, ruptura del último swing, ruptura de rango con volumen — señal propia, no de TradingView.' },
];

// ---------------------------------------------------------------------------
// Indicadores (funciones puras sobre arrays de velas OHLCV)
// ---------------------------------------------------------------------------
function closesOf(bars) { return bars.map((b) => b.close); }

function smaAt(values, period, i) {
  if (i + 1 < period) return null;
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) sum += values[k];
  return sum / period;
}
function emaSeries(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  out[period - 1] = seed / period;
  for (let i = period; i < values.length; i++) out[i] = values[i] * k + out[i - 1] * (1 - k);
  return out;
}

function rsiAt(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macdAt(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return null;
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  const macdLine = closes.map((_, i) => (emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null));
  const macdValid = macdLine.filter((v) => v != null);
  if (macdValid.length < signal) return null;
  const signalSeries = emaSeries(macdValid, signal);
  return { macd: macdValid[macdValid.length - 1], signal: signalSeries[signalSeries.length - 1] };
}

function stochasticAt(bars, kPeriod = 14, kSmooth = 3) {
  if (bars.length < kPeriod + kSmooth) return null;
  const raw = [];
  for (let i = bars.length - kPeriod - kSmooth + 1; i < bars.length; i++) {
    if (i - kPeriod + 1 < 0) continue;
    let hh = -Infinity, ll = Infinity;
    for (let k = i - kPeriod + 1; k <= i; k++) { hh = Math.max(hh, bars[k].high); ll = Math.min(ll, bars[k].low); }
    raw.push(hh === ll ? 50 : ((bars[i].close - ll) / (hh - ll)) * 100);
  }
  if (raw.length < kSmooth) return null;
  const kSmoothed = raw.slice(-kSmooth).reduce((a, b) => a + b, 0) / kSmooth;
  return { k: kSmoothed };
}

function adxAt(bars, period = 14) {
  if (bars.length < period * 2) return null;
  const plusDM = [], minusDM = [], tr = [];
  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i - 1].close), Math.abs(bars[i].low - bars[i - 1].close)));
  }
  const n = plusDM.length;
  if (n < period * 2) return null;
  const smooth = (arr) => { let s = arr.slice(0, period).reduce((a, b) => a + b, 0); const out = [s]; for (let i = period; i < arr.length; i++) { s = s - s / period + arr[i]; out.push(s); } return out; };
  const trS = smooth(tr), plusS = smooth(plusDM), minusS = smooth(minusDM);
  const plusDI = plusS.map((v, i) => (trS[i] ? (v / trS[i]) * 100 : 0));
  const minusDI = minusS.map((v, i) => (trS[i] ? (v / trS[i]) * 100 : 0));
  const dx = plusDI.map((v, i) => { const sum = v + minusDI[i]; return sum ? (Math.abs(v - minusDI[i]) / sum) * 100 : 0; });
  const dxValid = dx.filter((v) => v != null);
  if (dxValid.length < period) return null;
  const adx = dxValid.slice(-period).reduce((a, b) => a + b, 0) / period;
  return { adx, plusDI: plusDI[plusDI.length - 1], minusDI: minusDI[minusDI.length - 1] };
}

function findSwings(bars, type, fractal) {
  const out = [];
  for (let i = fractal; i < bars.length - fractal; i++) {
    const c = bars[i];
    let isSwing = true;
    for (let k = 1; k <= fractal && isSwing; k++) {
      if (type === 'high') { if (!(c.high > bars[i - k].high && c.high > bars[i + k].high)) isSwing = false; }
      else { if (!(c.low < bars[i - k].low && c.low < bars[i + k].low)) isSwing = false; }
    }
    if (isSwing) out.push({ index: i, bar: c });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grupo A — Medias móviles
// ---------------------------------------------------------------------------
function groupA(bars) {
  const closes = closesOf(bars);
  const last = closes[closes.length - 1];
  const idx = closes.length - 1;
  const signals = [];
  for (const period of [20, 50, 100, 200]) {
    const sma = smaAt(closes, period, idx);
    if (sma != null) signals.push(last > sma ? 1 : last < sma ? -1 : 0);
    const emaFull = emaSeries(closes, period);
    const ema = emaFull[idx];
    if (ema != null) signals.push(last > ema ? 1 : last < ema ? -1 : 0);
  }
  if (signals.length === 0) return { score: 0, available: 0 };
  return { score: signals.reduce((a, b) => a + b, 0) / signals.length, available: signals.length };
}

// ---------------------------------------------------------------------------
// Grupo B — Osciladores
// ---------------------------------------------------------------------------
function groupB(bars) {
  const closes = closesOf(bars);
  const signals = [];

  const rsi = rsiAt(closes, 14);
  if (rsi != null) signals.push(rsi < 30 ? 1 : rsi > 70 ? -1 : rsi >= 50 ? 0.3 : -0.3);

  const macd = macdAt(closes, 12, 26, 9);
  if (macd != null) signals.push(macd.macd > macd.signal ? 1 : -1);

  const stoch = stochasticAt(bars, 14, 3);
  if (stoch != null) signals.push(stoch.k < 20 ? 1 : stoch.k > 80 ? -1 : stoch.k >= 50 ? 0.3 : -0.3);

  const adx = adxAt(bars, 14);
  if (adx != null && adx.adx > 20) signals.push(adx.plusDI > adx.minusDI ? 1 : -1);

  if (signals.length === 0) return { score: 0, available: 0 };
  return { score: signals.reduce((a, b) => a + b, 0) / signals.length, available: signals.length };
}

// ---------------------------------------------------------------------------
// Grupo C — Estructura SMC/ICT (heurística propia, ver nota al final del script)
// ---------------------------------------------------------------------------
function groupC(bars) {
  const n = bars.length;
  const signals = [];

  // c1: momentum de 20 velas, normalizado por ATR14 (evita falsos positivos en símbolos de baja volatilidad)
  if (n >= 21) {
    const atr = (() => {
      const trs = [];
      for (let i = n - 14; i < n; i++) { const c = bars[i], p = bars[i - 1]; trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))); }
      return trs.reduce((a, b) => a + b, 0) / trs.length;
    })();
    const move = bars[n - 1].close - bars[n - 21].close;
    const norm = atr > 0 ? move / (atr * 3) : 0; // 3 ATR de movimiento en 20 velas = señal plena
    signals.push(Math.max(-1, Math.min(1, norm)));
  }

  // c2: ruptura del último swing (fractal=2) — cambio de carácter genérico
  const swingsHigh = findSwings(bars.slice(0, -1), 'high', 2);
  const swingsLow = findSwings(bars.slice(0, -1), 'low', 2);
  const lastClose = bars[n - 1].close;
  const lastSwingHigh = swingsHigh[swingsHigh.length - 1];
  const lastSwingLow = swingsLow[swingsLow.length - 1];
  if (lastSwingHigh && lastClose > lastSwingHigh.bar.high) signals.push(1);
  else if (lastSwingLow && lastClose < lastSwingLow.bar.low) signals.push(-1);
  else signals.push(0);

  // c3: ruptura de rango de 20 velas con volumen por encima del promedio
  if (n >= 21) {
    const range = bars.slice(n - 21, n - 1);
    const rangeHigh = Math.max(...range.map((b) => b.high));
    const rangeLow = Math.min(...range.map((b) => b.low));
    const avgVol = range.reduce((a, b) => a + (b.volume || 0), 0) / range.length;
    const lastVol = bars[n - 1].volume || 0;
    const volOk = avgVol > 0 && lastVol > avgVol * 1.3;
    if (volOk && lastClose > rangeHigh) signals.push(1);
    else if (volOk && lastClose < rangeLow) signals.push(-1);
    else signals.push(0);
  }

  if (signals.length === 0) return { score: 0, available: 0 };
  return { score: signals.reduce((a, b) => a + b, 0) / signals.length, available: signals.length };
}

function zoneFor(score) {
  if (score < -0.5) return { label: 'Venta fuerte', color: '#FF6B5E' };
  if (score < -0.1) return { label: 'Venta', color: '#FF8F80' };
  if (score <= 0.1) return { label: 'Neutral', color: '#F2C14E' };
  if (score <= 0.5) return { label: 'Compra', color: '#8FE0B0' };
  return { label: 'Compra fuerte', color: '#3ED98B' };
}

// Exportada para que sentiment-watcher.mjs la reuse sin duplicar la lógica —
// abre su propia sesión MCP cada vez (más simple y más robusto que mantener
// una sesión larga viva entre corridas espaciadas).
export async function runOnce() {
  console.log('Conectando al MCP de cTrader...');
  const sid = await initSession();
  const balance = await getBalance(sid);
  if (balance.isLive) throw new Error('SEGURIDAD: la cuenta activa es LIVE, no demo. Abortando.');
  console.log(`Conectado. Cuenta: ${balance.accountType}, broker ${balance.brokerName}, live=${!!balance.isLive}`);

  const now = new Date();
  const results = [];

  for (const [symKey, ctraderSymbol] of Object.entries(SYMBOLS)) {
    for (const tf of TIMEFRAMES) {
      const fromISO = new Date(now.getTime() - LOOKBACK_DAYS[tf] * 86400000).toISOString();
      let bars;
      try {
        bars = await getTrendbarsRange(sid, ctraderSymbol, tf, fromISO, now.toISOString());
      } catch (e) {
        console.log(`${symKey}/${tf}: ERROR MCP — ${e.message}`);
        continue;
      }
      if (bars.length < 25) {
        console.log(`${symKey}/${tf}: solo ${bars.length} velas, insuficiente — se omite`);
        continue;
      }

      const a = groupA(bars), b = groupB(bars), c = groupC(bars);
      const weighted = a.score * 0.35 + b.score * 0.35 + c.score * 0.30;
      const zone = zoneFor(weighted);
      const groups = [
        { ...GROUP_META[0], score: Number(a.score.toFixed(3)), color: zoneFor(a.score).color },
        { ...GROUP_META[1], score: Number(b.score.toFixed(3)), color: zoneFor(b.score).color },
        { ...GROUP_META[2], score: Number(c.score.toFixed(3)), color: zoneFor(c.score).color },
      ];

      const row = {
        symbol: symKey, timeframe: tf, ctrader_symbol: ctraderSymbol,
        score: Number(weighted.toFixed(3)), zone_label: zone.label, zone_color: zone.color,
        groups, data_range: { from: bars[0].timestamp, to: bars[bars.length - 1].timestamp, bars: bars.length },
        generated_at: new Date().toISOString(),
      };
      results.push(row);
      console.log(`${symKey}/${tf}: score ${row.score} (${zone.label}) — A=${a.score.toFixed(2)}(${a.available}) B=${b.score.toFixed(2)}(${b.available}) C=${c.score.toFixed(2)} · ${bars.length} velas`);
    }
  }

  for (const row of results) {
    const { error } = await supabase.from('trading_sentiment').upsert(row, { onConflict: 'symbol,timeframe' });
    if (error) throw new Error(`trading_sentiment/${row.symbol}/${row.timeframe}: ${error.message}`);
  }
  console.log(`\n${results.length} filas escritas en trading_sentiment.`);
  return results.length;
}

// Solo corre main() si se ejecuta este archivo directamente (`node
// compute-sentiment.mjs`) — no cuando sentiment-watcher.mjs lo importa.
if (process.argv[1] && process.argv[1].endsWith('compute-sentiment.mjs')) {
  runOnce().catch((e) => { console.error('ERROR:', e); process.exit(1); });
}

// ---------------------------------------------------------------------------
// Decisiones propias (Grupo C no tiene equivalente en TradingView — se listan
// para que Rafa las revise, mismo criterio que los backtests de trading/):
// 1. Momentum normalizado a 3×ATR14 en 20 velas — umbral elegido, no dado.
// 2. Swing/fractal=2 en el MISMO timeframe evaluado (no HTF como en los
//    backtests de los modelos WS) — más simple, pero pierde el concepto de
//    "DOL de timeframe mayor" que sí tienen los modelos WS reales.
// 3. Ruptura de rango: 20 velas previas, volumen 1.3x el promedio de esas 20.
// 4. Grupo A/B se calculan sobre el MISMO timeframe seleccionado (H4 usa velas
//    H4, D1 usa velas D1) — a diferencia de como se describió en el mockup
//    visual ("H1/H4/D1" mezclados), que era una simplificación de texto, no
//    una regla real todavía implementada.
