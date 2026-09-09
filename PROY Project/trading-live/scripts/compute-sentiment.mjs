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
import { isUsDst } from './dst.mjs';
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
// Únicos habilitados para proponer entradas (ver trading-live/CLAUDE.md) —
// solo estos traen velas M1 de hoy (overlay de estrategia en Live necesita
// esa granularidad para detectar barrido/confirmación; el resto es solo
// análisis de apoyo, no corre el overlay).
const TRADABLE_SYMBOLS = new Set(['NAS100', 'GER40']);
const TIMEFRAMES = ['h1', 'h4', 'd1'];
const LOOKBACK_DAYS = { h1: 20, h4: 120, d1: 500 }; // suficiente para intentar SMA/EMA200; si no hay tanta historia, se omite esa media

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

// ---------------------------------------------------------------------------
// Snapshot de mercado (Live): precio actual, OHLC del día (calendario NY,
// consistente con la zona horaria confirmada por Rafa para las sesiones de
// los modelos WS), soportes/resistencias cercanos, y velas H1 para graficar.
// ---------------------------------------------------------------------------
function nyDayStartUTC(now) {
  const offsetH = isUsDst(now) ? -4 : -5; // EDT (-4) o EST (-5)
  const shifted = new Date(now.getTime() + offsetH * 3600000);
  const midnightShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, 0, 0);
  return new Date(midnightShifted - offsetH * 3600000);
}

// Instante en el que "muere" un nivel dibujado en el gráfico de Live: 12:00
// hora de Nueva York del día siguiente al de la vela que lo marcó — no un
// número mágico, es lo que pidió Rafa para poder ver visualmente dónde nace
// y dónde muere cada línea, en vez de una raya infinita cruzando el gráfico.
function nyNoonNextDayUTC(originDate) {
  const dayStart = nyDayStartUTC(originDate).getTime();
  return new Date(dayStart + 36 * 3600000); // +24h (día siguiente) +12h (mediodía)
}

function toCompactBars(bars, limit) {
  return bars.slice(-limit).map((b) => ({ t: b.timestamp, o: b.open, h: b.high, l: b.low, c: b.close }));
}

// Soporte/resistencia NO son "del día" — son swings recientes (buscados sobre
// varios días de historia) que siguen VIVOS: nacen en la vela que los marcó y
// mueren a las 12:00 NY del día siguiente (misma regla que pidió Rafa para
// todos los niveles). Un swing de hace una semana que por casualidad queda
// cerca del precio actual YA MURIÓ — no se muestra, aunque esté "cerca" en
// precio. Esto es lo que hace que la lista se sienta "de los últimos días",
// no una foto fija de niveles viejos.
function nearestLevels(bars, lastPrice, now, fractal = 3, maxLevels = 3) {
  const highs = findSwings(bars.slice(0, -1), 'high', fractal).map((s) => ({ price: s.bar.high, time: s.bar.timestamp }));
  const lows = findSwings(bars.slice(0, -1), 'low', fractal).map((s) => ({ price: s.bar.low, time: s.bar.timestamp }));
  const dedupe = (levels) => { const seen = new Set(); return levels.filter((l) => (seen.has(l.price) ? false : (seen.add(l.price), true))); };
  const withDiesAt = (l) => ({ ...l, dies_at: nyNoonNextDayUTC(new Date(l.time)).toISOString() });
  const stillAlive = (l) => new Date(l.dies_at).getTime() > now.getTime();
  const resistance = dedupe(highs).map(withDiesAt).filter((l) => l.price > lastPrice && stillAlive(l)).sort((a, b) => a.price - b.price).slice(0, maxLevels);
  const support = dedupe(lows).map(withDiesAt).filter((l) => l.price < lastPrice && stillAlive(l)).sort((a, b) => b.price - a.price).slice(0, maxLevels);
  return { support, resistance };
}

const CHART_BARS_LIMIT = 300; // cuántas velas se guardan por timeframe para el gráfico de Live (más = más contexto al maximizar)

async function computeMarketSnapshot(sid, symKey, ctraderSymbol, now, barsH1, barsH4, barsD1) {
  // barsH1 ya viene del loop de sentimiento (mismo símbolo, mismo momento,
  // mismo lookback de 20 días) — evita una segunda llamada MCP redundante.
  let bars = barsH1;
  if (!bars) {
    const fromISO = new Date(now.getTime() - 20 * 86400000).toISOString();
    try {
      bars = await getTrendbarsRange(sid, ctraderSymbol, 'h1', fromISO, now.toISOString());
    } catch (e) {
      console.log(`${symKey}/snapshot: ERROR MCP — ${e.message}`);
      return null;
    }
  }
  if (bars.length < 20) {
    console.log(`${symKey}/snapshot: solo ${bars.length} velas H1, insuficiente — se omite`);
    return null;
  }

  const lastPrice = bars[bars.length - 1].close;
  const dayStart = nyDayStartUTC(now).getTime();
  const prevDayStart = dayStart - 24 * 3600000;
  const todayBars = bars.filter((b) => new Date(b.timestamp).getTime() >= dayStart);
  const prevBars = bars.filter((b) => new Date(b.timestamp).getTime() < dayStart); // todo lo anterior a hoy (para prev_day_close)
  const prevDayOnlyBars = bars.filter((b) => { const t = new Date(b.timestamp).getTime(); return t >= prevDayStart && t < dayStart; }); // SOLO ayer (para PDH/PDL)

  const { support, resistance } = nearestLevels(bars, lastPrice, now);

  // M1 de hoy (00:00 NY -> ahora), solo para los símbolos operables — hace
  // falta esa granularidad para el overlay de estrategia (barrido/
  // confirmación real, no solo la vela H1 de referencia).
  let barsM1Today = [];
  if (TRADABLE_SYMBOLS.has(symKey)) {
    try {
      barsM1Today = await getTrendbarsRange(sid, ctraderSymbol, 'm1', new Date(dayStart).toISOString(), now.toISOString());
    } catch (e) {
      console.log(`${symKey}/snapshot: ERROR MCP al traer M1 de hoy — ${e.message}`);
    }
  }

  const dayHighBar = todayBars.length ? todayBars.reduce((a, b) => (b.high > a.high ? b : a)) : null;
  const dayLowBar = todayBars.length ? todayBars.reduce((a, b) => (b.low < a.low ? b : a)) : null;
  // PDH/PDL (Previous Day High/Low, concepto estándar ICT/SMC): a diferencia
  // del resto de los niveles, mueren a las 12:00 NY del día ACTUAL (no +36h
  // desde que se marcaron) — son referencia para la primera mitad de hoy.
  const todayNoon = new Date(dayStart + 12 * 3600000).toISOString();
  const prevDayHighBar = prevDayOnlyBars.length ? prevDayOnlyBars.reduce((a, b) => (b.high > a.high ? b : a)) : null;
  const prevDayLowBar = prevDayOnlyBars.length ? prevDayOnlyBars.reduce((a, b) => (b.low < a.low ? b : a)) : null;

  return {
    symbol: symKey,
    ctrader_symbol: ctraderSymbol,
    last_price: lastPrice,
    day_open: todayBars.length ? todayBars[0].open : null,
    day_high: dayHighBar ? dayHighBar.high : null,
    day_high_time: dayHighBar ? dayHighBar.timestamp : null,
    day_high_dies_at: dayHighBar ? nyNoonNextDayUTC(new Date(dayHighBar.timestamp)).toISOString() : null,
    day_low: dayLowBar ? dayLowBar.low : null,
    day_low_time: dayLowBar ? dayLowBar.timestamp : null,
    day_low_dies_at: dayLowBar ? nyNoonNextDayUTC(new Date(dayLowBar.timestamp)).toISOString() : null,
    prev_day_high: prevDayHighBar ? prevDayHighBar.high : null,
    prev_day_high_time: prevDayHighBar ? prevDayHighBar.timestamp : null,
    prev_day_high_dies_at: prevDayHighBar ? todayNoon : null,
    prev_day_low: prevDayLowBar ? prevDayLowBar.low : null,
    prev_day_low_time: prevDayLowBar ? prevDayLowBar.timestamp : null,
    prev_day_low_dies_at: prevDayLowBar ? todayNoon : null,
    prev_day_close: prevBars.length ? prevBars[prevBars.length - 1].close : null,
    support, resistance,
    bars_h1: toCompactBars(bars, CHART_BARS_LIMIT),
    bars_h4: toCompactBars(barsH4 ?? [], CHART_BARS_LIMIT),
    bars_d1: toCompactBars(barsD1 ?? [], CHART_BARS_LIMIT),
    bars_m1_today: toCompactBars(barsM1Today, 1440), // techo real: un día completo de M1
    generated_at: new Date().toISOString(),
  };
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
  const barsByTf = {}; // symKey -> { h4: bars, d1: bars } — reusadas por el snapshot de mercado, sin refetch

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
      (barsByTf[symKey] ??= {})[tf] = bars;

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

  const snapshots = [];
  for (const [symKey, ctraderSymbol] of Object.entries(SYMBOLS)) {
    const snap = await computeMarketSnapshot(sid, symKey, ctraderSymbol, now, barsByTf[symKey]?.h1, barsByTf[symKey]?.h4, barsByTf[symKey]?.d1);
    if (snap) {
      snapshots.push(snap);
      console.log(`${symKey}/snapshot: last ${snap.last_price} · día ${snap.day_low}-${snap.day_high} · soporte ${snap.support[0]?.price ?? '—'} · resistencia ${snap.resistance[0]?.price ?? '—'}`);
    }
  }
  for (const row of snapshots) {
    const { error } = await supabase.from('trading_market_snapshot').upsert(row, { onConflict: 'symbol' });
    if (error) throw new Error(`trading_market_snapshot/${row.symbol}: ${error.message}`);
  }
  console.log(`${snapshots.length} filas escritas en trading_market_snapshot.`);

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
// 5. Snapshot de mercado (trading_market_snapshot): "día" se calcula con
//    calendario NY (00:00 hora de Nueva York, DST-aware vía isUsDst), igual
//    convención que las sesiones de los modelos WS. Soporte/resistencia:
//    swings H1 (fractal=3, más exigente que el fractal=2 del Grupo C) más
//    cercanos al precio actual, hasta 3 de cada lado — no reusa la lógica de
//    "DOL" real de los backtests de los modelos WS, es una heurística más
//    simple a propósito (mismo criterio que el Grupo C).
// 6. "Muerte" de un nivel en el gráfico de Live: 12:00 hora de Nueva York del
//    día siguiente al de la vela que lo marcó (soporte/resistencia/máximo/
//    mínimo) — pedido explícito de Rafa para que la línea sea un segmento con
//    nacimiento y muerte visibles, no una raya infinita. bars_h4/bars_d1 del
//    snapshot reusan las mismas velas que ya se piden para el sentimiento
//    (mismo símbolo, mismo momento) — no hay llamadas MCP extra por esto.
