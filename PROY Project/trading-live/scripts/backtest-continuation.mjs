// Backtest histórico del modelo "WS Continuation" (v1, especificado por Rafa
// el 2026-09-08) sobre #USNDAQ100, usando datos reales vía el MCP de cTrader
// Desktop.
//
// SOLO ANÁLISIS: no llama ninguna tool de ejecución de órdenes, no escribe a
// Supabase. Escribe un reporte en trading-live/backtest-results/.
//
// Regla v1 (resumen — ver trading-live/CLAUDE.md para el contexto de los 3
// modelos WS):
//  - Se opera sobre aperturas horarias (H1), en hora de Nueva York, desde la
//    1:00am hasta el mediodía (sesión Londres 1-5am, London Lunch 5-9am, NY
//    9am-1pm NY time), DST-aware.
//  - "Movimiento ya iniciado": la primera hora de la ventana del día que
//    produce un raid+entrada válidos (mismo mecanismo del Time-Based Entry:
//    M1 toma el extremo de la vela H1 anterior) fija la dirección del día.
//    Esa primera entrada NO se cuenta como señal de Continuation (es el
//    Time-Based Entry) — solo las siguientes horas, en la misma dirección,
//    mientras el precio no haya tocado ya el DOL original del movimiento.
//  - PO3 / raid: en cada hora candidata (ventana [apertura-5min,
//    apertura+15min]), M1 rompe el extremo de la vela H1 anterior en la
//    dirección del movimiento en curso -> entrada inmediata al cierre de esa
//    vela M1, sin esperar cambio de carácter.
//  - SL: extremo del raid +/- buffer ATR14(M1), más holgado que el Time-Based
//    Entry (multiplicador mayor, ver ATR_BUFFER_MULT).
//  - TP: el MISMO DOL (nivel H4, o D1 si no hay H4 que rinda) que se usó para
//    la entrada inicial del día — se sigue apuntando al mismo objetivo, no a
//    uno nuevo por hora. Ratio objetivo 1R-2R (si el remanente rinde <1R, no
//    hay señal esa hora).
//  - Salida: toque de TP, o salida por tiempo si una vela H1 posterior cierra
//    haciendo un extremo adverso más allá del de la vela H1 inmediatamente
//    anterior (lectura de "la nueva hora te hace un alto/bajo en contra").
import { initSession, getBalance, getTrendbarsRange } from './ctrader-client.mjs';
import { isUsDst } from './dst.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYMBOL = '#USNDAQ100';

// ---------- decisiones propias (ambigüedad remanente en la regla — no
// asumidas en silencio, se listan también en el reporte) ----------
const ATR_PERIOD = 14;
const ATR_BUFFER_MULT = 0.4; // más holgado que el 0.1 del Time-Based Entry — valor propio, no lo dio Rafa
const SWING_FRACTAL_HTF = 2;
const MIN_RR = 1;
const MAX_RR = 2;
const RAID_WINDOW_BEFORE_MIN = 5; // cubre el "Failure Swing en los últimos 5 min de la vela anterior"
const RAID_WINDOW_AFTER_MIN = 15; // "periodo de gracia" / PO3
const NY_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // aperturas horarias NY 1am-12pm (sesión hasta la 1pm)

function sma(values) { return values.reduce((a, b) => a + b, 0) / values.length; }

function computeATR(bars, endIndexExclusive, period) {
  const start = Math.max(1, endIndexExclusive - period);
  const trs = [];
  for (let i = start; i < endIndexExclusive; i++) {
    const cur = bars[i], prev = bars[i - 1];
    trs.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)));
  }
  return trs.length ? sma(trs) : null;
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
    if (isSwing) out.push(c);
  }
  return out;
}

function pickDolTarget(direction, entry, sl, h4Swings, d1Swings, minRR) {
  const riskPerUnit = Math.abs(entry - sl);
  const candidates = [];
  const collect = (swings, tf) => {
    for (const s of swings) {
      const level = direction === 'long' ? s.high : s.low;
      const dist = direction === 'long' ? level - entry : entry - level;
      if (dist <= 0) continue;
      const r = dist / riskPerUnit;
      if (r >= minRR) candidates.push({ level, r, tf, dist });
    }
  };
  collect(h4Swings, 'H4');
  if (candidates.length === 0) collect(d1Swings, 'D1');
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0];
}

function findBarAt(bars, iso) {
  const t = new Date(iso).getTime();
  return bars.find((b) => new Date(b.timestamp).getTime() === t) || null;
}

// hora local NY -> Date UTC, DST-aware (probe a mediodía UTC del día para is UsDst)
function nyHourToUtc(dayUTC, nyHour) {
  const probe = new Date(Date.UTC(dayUTC.getUTCFullYear(), dayUTC.getUTCMonth(), dayUTC.getUTCDate(), 12));
  const offset = isUsDst(probe) ? 4 : 5; // EDT=-4, EST=-5
  return new Date(Date.UTC(dayUTC.getUTCFullYear(), dayUTC.getUTCMonth(), dayUTC.getUTCDate(), nyHour + offset));
}

// Busca el raid de refCandle (H1 anterior) dentro de la ventana [hourStart-5min, hourStart+15min] en M1.
function detectRaid(m1, refCandle, hourStartMs) {
  const winStart = hourStartMs - RAID_WINDOW_BEFORE_MIN * 60000;
  const winEnd = hourStartMs + RAID_WINDOW_AFTER_MIN * 60000;
  for (let i = 0; i < m1.length; i++) {
    const t = new Date(m1[i].timestamp).getTime();
    if (t < winStart) continue;
    if (t > winEnd) break;
    const b = m1[i];
    const brokeHigh = b.high > refCandle.high;
    const brokeLow = b.low < refCandle.low;
    if (brokeHigh && brokeLow) return { idx: i, dir: 'ambos_mismo_m1' };
    if (brokeHigh) return { idx: i, dir: 'high' };
    if (brokeLow) return { idx: i, dir: 'low' };
  }
  return null;
}

async function main() {
  console.log('Conectando al MCP de cTrader...');
  const sid = await initSession();
  const balance = await getBalance(sid);
  if (balance.isLive) throw new Error('SEGURIDAD: la cuenta activa es LIVE, no demo. Abortando.');
  console.log(`Conectado. Cuenta: ${balance.accountType}, broker ${balance.brokerName}, balance ${balance.balance} ${balance.depositAsset}, live=${!!balance.isLive}`);

  const now = new Date();
  const toISO = now.toISOString();
  const fromISO = new Date(now.getTime() - 30 * 86400000).toISOString();
  const htfFrom = new Date(now.getTime() - 60 * 86400000).toISOString();

  console.log(`Descargando H1 (${fromISO} -> ${toISO})...`);
  const h1Bars = await getTrendbarsRange(sid, SYMBOL, 'h1', fromISO, toISO);
  console.log(`H1: ${h1Bars.length} velas. Rango real: ${h1Bars[0]?.timestamp} -> ${h1Bars[h1Bars.length - 1]?.timestamp}`);

  console.log('Descargando H4 y D1 para niveles DOL...');
  const h4Bars = await getTrendbarsRange(sid, SYMBOL, 'h4', htfFrom, toISO);
  const d1Bars = await getTrendbarsRange(sid, SYMBOL, 'd1', htfFrom, toISO);
  const h4Swings = { high: findSwings(h4Bars, 'high', SWING_FRACTAL_HTF), low: findSwings(h4Bars, 'low', SWING_FRACTAL_HTF) };
  const d1Swings = { high: findSwings(d1Bars, 'high', SWING_FRACTAL_HTF), low: findSwings(d1Bars, 'low', SWING_FRACTAL_HTF) };

  const daysSet = new Set(h1Bars.map((b) => b.timestamp.slice(0, 10)));
  const days = [...daysSet].sort();
  console.log(`Días con datos H1: ${days.length}`);

  const results = [];
  for (const dayStr of days) {
    const dayUTC = new Date(dayStr + 'T00:00:00Z');
    const dayStartUtc = nyHourToUtc(dayUTC, NY_HOURS[0]);
    const dayEndUtc = new Date(nyHourToUtc(dayUTC, NY_HOURS[NY_HOURS.length - 1]).getTime() + 3600000);

    const m1From = new Date(dayStartUtc.getTime() - RAID_WINDOW_BEFORE_MIN * 60000).toISOString();
    const m1To = dayEndUtc.toISOString();
    let m1;
    try {
      m1 = await getTrendbarsRange(sid, SYMBOL, 'm1', m1From, m1To);
    } catch (e) {
      results.push({ date: dayStr, outcome: 'error_mcp', reason: String(e.message || e) });
      continue;
    }
    if (m1.length < NY_HOURS.length * 30) { results.push({ date: dayStr, outcome: 'sin_datos_m1', reason: `solo ${m1.length} velas M1` }); continue; }

    let dayDirection = null; // 'long' | 'short', fijada por la primera hora que dispara
    let dayDol = null; // { level, tf } del movimiento del día
    let dayTouchedDol = false;
    let openPosition = null; // { entry, sl, tp, entryIdx, entryAt, hourIdx }

    for (let hi = 0; hi < NY_HOURS.length; hi++) {
      const hourStart = nyHourToUtc(dayUTC, NY_HOURS[hi]);
      const hourStartMs = hourStart.getTime();
      const refIso = new Date(hourStartMs - 3600000).toISOString();
      const refCandle = findBarAt(h1Bars, refIso);
      if (!refCandle) continue; // sin vela H1 de referencia (fuera del rango real de datos)

      // --- si hay posición abierta, primero chequear su salida hasta este hourStart ---
      if (openPosition) {
        const from = openPosition.lastCheckedIdx + 1;
        let exited = false;
        for (let i = from; i < m1.length; i++) {
          const b = m1[i];
          const t = new Date(b.timestamp).getTime();
          if (t >= hourStartMs) break; // se revisa el cierre de hora en el bloque de abajo
          const slHit = openPosition.direction === 'long' ? b.low <= openPosition.sl : b.high >= openPosition.sl;
          const tpHit = openPosition.direction === 'long' ? b.high >= openPosition.tp : b.low <= openPosition.tp;
          if (slHit && tpHit) { closePosition(openPosition, openPosition.sl, 'sl_y_tp_misma_vela_asume_sl', b.timestamp); exited = true; openPosition.lastCheckedIdx = i; break; }
          if (slHit) { closePosition(openPosition, openPosition.sl, 'sl', b.timestamp); exited = true; openPosition.lastCheckedIdx = i; break; }
          if (tpHit) { closePosition(openPosition, openPosition.tp, 'tp', b.timestamp); dayTouchedDol = true; exited = true; openPosition.lastCheckedIdx = i; break; }
          openPosition.lastCheckedIdx = i;
        }
        if (exited) { results.push(openPosition.record); openPosition = null; }
      }

      // salida por tiempo: al cierre de esta hora, si hizo extremo adverso vs la H1 anterior
      if (openPosition) {
        const prevH1 = refCandle;
        const adverse = openPosition.direction === 'long' ? prevH1.low < openPosition.refLow : prevH1.high > openPosition.refHigh;
        if (adverse) {
          const exitPx = prevH1.close;
          const risk = Math.abs(openPosition.entry - openPosition.sl);
          const r = openPosition.direction === 'long' ? (exitPx - openPosition.entry) / risk : (openPosition.entry - exitPx) / risk;
          openPosition.record.exit = exitPx; openPosition.record.exitReason = 'tiempo_nueva_hora_adversa'; openPosition.record.exitAt = prevH1.timestamp; openPosition.record.r = Number(r.toFixed(3));
          results.push(openPosition.record);
          openPosition = null;
        }
      }

      if (dayTouchedDol && !openPosition) continue; // movimiento ya completado, no se buscan más continuaciones

      const raid = detectRaid(m1, refCandle, hourStartMs);
      if (!raid || raid.dir === 'ambos_mismo_m1') continue;
      const direction = raid.dir === 'low' ? 'long' : 'short';

      if (dayDirection === null) {
        // primera señal del día: fija dirección + DOL, pero NO se cuenta como Continuation (es el Time-Based Entry)
        const sweepBar = m1[raid.idx];
        const atr = computeATR(m1, raid.idx, ATR_PERIOD);
        const sl = direction === 'long' ? sweepBar.low - (atr ?? 0) * ATR_BUFFER_MULT : sweepBar.high + (atr ?? 0) * ATR_BUFFER_MULT;
        const dol = pickDolTarget(direction, sweepBar.close, sl, direction === 'long' ? h4Swings.high : h4Swings.low, direction === 'long' ? d1Swings.high : d1Swings.low, MIN_RR);
        dayDirection = direction;
        dayDol = dol; // puede ser null si no hay DOL válido — entonces no habrá continuations ese día
        continue;
      }

      if (direction !== dayDirection) continue; // solo se opera a favor del movimiento del día
      if (openPosition) continue; // ya hay una posición de continuation abierta
      if (!dayDol) continue; // sin DOL válido del día, no se puede medir R de continuation

      const sweepBar = m1[raid.idx];
      const entry = sweepBar.close;
      const atr = computeATR(m1, raid.idx, ATR_PERIOD);
      const sl = direction === 'long' ? sweepBar.low - (atr ?? 0) * ATR_BUFFER_MULT : sweepBar.high + (atr ?? 0) * ATR_BUFFER_MULT;
      const riskPerUnit = Math.abs(entry - sl);
      const distToDol = direction === 'long' ? dayDol.level - entry : entry - dayDol.level;
      if (distToDol <= 0) { dayTouchedDol = true; continue; } // el precio ya pasó el DOL original, movimiento agotado
      const rr = distToDol / riskPerUnit;
      if (rr < MIN_RR) continue; // remanente insuficiente para 1R, se descarta la hora
      const cappedR = Math.min(rr, MAX_RR);
      const tp = direction === 'long' ? entry + cappedR * riskPerUnit : entry - cappedR * riskPerUnit;

      openPosition = {
        direction, entry, sl, tp, refHigh: refCandle.high, refLow: refCandle.low,
        lastCheckedIdx: raid.idx,
        record: {
          date: dayStr, nyHour: NY_HOURS[hi], outcome: 'setup', direction,
          refCandle: { timestamp: refCandle.timestamp, high: refCandle.high, low: refCandle.low },
          sweepAt: sweepBar.timestamp, entry, sl, tp, targetR: cappedR, tpTf: dayDol.tf,
        },
      };
    }
    if (openPosition) {
      // posición sin salida definida al llegar a la última hora candidata: se sigue
      // escaneando M1 hasta el final del rango descargado por si el SL/TP ya se
      // tocó ahí, antes de recién al final cerrar técnicamente al último precio
      // disponible (no es una regla de Rafa, es cierre técnico del backtest).
      let closed = false;
      for (let i = openPosition.lastCheckedIdx + 1; i < m1.length; i++) {
        const b = m1[i];
        const slHit = openPosition.direction === 'long' ? b.low <= openPosition.sl : b.high >= openPosition.sl;
        const tpHit = openPosition.direction === 'long' ? b.high >= openPosition.tp : b.low <= openPosition.tp;
        if (slHit && tpHit) { closePosition(openPosition, openPosition.sl, 'sl_y_tp_misma_vela_asume_sl', b.timestamp); closed = true; break; }
        if (slHit) { closePosition(openPosition, openPosition.sl, 'sl', b.timestamp); closed = true; break; }
        if (tpHit) { closePosition(openPosition, openPosition.tp, 'tp', b.timestamp); closed = true; break; }
      }
      if (!closed) {
        const last = m1[m1.length - 1];
        closePosition(openPosition, last.close, 'fin_ventana_dia', last.timestamp);
      }
      results.push(openPosition.record);
    }
  }

  function closePosition(pos, exitPx, reason, exitAt) {
    const risk = Math.abs(pos.entry - pos.sl);
    const r = pos.direction === 'long' ? (exitPx - pos.entry) / risk : (pos.entry - exitPx) / risk;
    pos.record.exit = exitPx; pos.record.exitReason = reason; pos.record.exitAt = exitAt; pos.record.r = Number(r.toFixed(3));
  }

  const withSignal = results.filter((r) => r.outcome === 'setup');
  const wins = withSignal.filter((r) => r.r > 0);
  const losses = withSignal.filter((r) => r.r <= 0);
  const avgR = withSignal.length ? withSignal.reduce((a, r) => a + r.r, 0) / withSignal.length : null;
  const winRate = withSignal.length ? (wins.length / withSignal.length) * 100 : null;

  const summary = {
    generatedAt: new Date().toISOString(),
    symbol: SYMBOL,
    dataRangeH1: { from: h1Bars[0]?.timestamp, to: h1Bars[h1Bars.length - 1]?.timestamp, bars: h1Bars.length },
    diasAnalizados: days.length,
    signalsDetected: withSignal.length,
    winRate, avgR, wins: wins.length, losses: losses.length,
  };

  mkdirSync(`${__dirname}/../backtest-results`, { recursive: true });
  writeFileSync(`${__dirname}/../backtest-results/continuation-v1.json`, JSON.stringify({ summary, results }, null, 2));

  const examples = withSignal.slice(0, 5);
  const md = `# Backtest — WS Continuation v1 (\`${SYMBOL}\`)

Generado: ${summary.generatedAt}

## Rango de datos real disponible
H1: ${summary.dataRangeH1.from} → ${summary.dataRangeH1.to} (${summary.dataRangeH1.bars} velas)

## Resultado agregado
- Días analizados: **${summary.diasAnalizados}**
- Señales de Continuation detectadas (excluye la entrada inicial de Time-Based Entry): **${summary.signalsDetected}**
- Win rate: **${winRate !== null ? winRate.toFixed(1) + '%' : 'N/A (sin señales)'}**
- R promedio: **${avgR !== null ? avgR.toFixed(2) : 'N/A'}**
- Ganadoras / perdedoras: ${wins.length} / ${losses.length}

## Ejemplos concretos
${examples.length === 0 ? '_No se detectó ningún setup completo en el rango disponible._' : examples.map((e, i) => `
### ${i + 1}. ${e.date} · hora NY ${e.nyHour}:00 · ${e.direction === 'long' ? 'LONG' : 'SHORT'}
- Vela H1 de referencia: ${e.refCandle.timestamp} (high ${e.refCandle.high}, low ${e.refCandle.low})
- Raid: ${e.sweepAt}
- Entry: ${e.entry} · SL: ${e.sl.toFixed(2)} · TP: ${e.tp.toFixed(2)} (objetivo ${e.targetR.toFixed(2)}R, nivel ${e.tpTf})
- Salida: ${e.exit?.toFixed ? e.exit.toFixed(2) : e.exit} el ${e.exitAt} (motivo: ${e.exitReason})
- Resultado: **${e.r > 0 ? '+' : ''}${e.r}R**
`).join('\n')}

## Decisiones propias (interpretación de la regla que dio Rafa el 2026-09-08 — no asumidas en silencio)
1. **Zona horaria de sesión**: se interpretaron los horarios (1am-5am Londres, 5am-9am London Lunch, 9am-1pm NY) como **hora local de Nueva York** (America/New_York, DST-aware vía \`isUsDst\`) — convención estándar ICT/SMC, no confirmada explícitamente por Rafa. Si la intención era otra zona horaria, el backtest completo cambia.
2. **Ventana de raid unificada**: el "raid en los primeros 15 min de la vela nueva" y el "Failure Swing en los últimos 5 min de la vela anterior" se implementaron como una sola ventana continua [apertura-5min, apertura+15min] en vez de dos rutas de detección separadas.
3. **Buffer de SL**: ATR14(M1) × ${ATR_BUFFER_MULT} (vs ${ATR_BUFFER_MULT / 4} del Time-Based Entry) — "más holgado" no vino con un número, este multiplicador es una elección propia a validar/ajustar.
4. **TP de continuation = mismo DOL del movimiento del día**, no un nuevo nivel HTF más cercano por hora — se interpretó "sumarse al movimiento" como perseguir el mismo objetivo original, acotado a 1R-2R.
5. **"Día"**: se usó el calendario UTC de las velas H1 devueltas por el MCP como agrupador de días, no el calendario de Nueva York — puede generar un desfasaje de hasta unas horas en el límite del día.
6. **Salida por tiempo**: se implementó como "la vela H1 inmediatamente anterior a la hora candidata hace un extremo adverso respecto a la vela H1 anterior a ESA" — es una lectura de la frase de Rafa, no una cita textual de una regla ya codificada.
7. **Fin de ventana del día**: si queda una posición abierta al llegar a la última hora candidata (12pm NY) sin TP/SL/salida por tiempo, se cierra técnicamente al último precio M1 disponible (\`fin_ventana_dia\`) — esto es un cierre de backtest, no una regla de Rafa.

## Qué NO se hizo
- No se llamó ninguna tool de ejecución de órdenes del MCP de cTrader.
- No se escribió nada a Supabase — esto es histórico, para revisión antes de conectar nada en vivo.
`;
  writeFileSync(`${__dirname}/../backtest-results/continuation-v1.md`, md);

  console.log('\n=== RESUMEN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nReporte escrito en trading-live/backtest-results/continuation-v1.md (y .json)');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
