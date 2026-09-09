// Backtest histórico del modelo "WS Last Quarter" (v1, especificado por Rafa
// el 2026-09-08) sobre #USNDAQ100, usando datos reales vía el MCP de cTrader
// Desktop.
//
// SOLO ANÁLISIS: no llama ninguna tool de ejecución de órdenes, no escribe a
// Supabase. Escribe un reporte en trading-live/backtest-results/.
//
// Regla v1 (resumen — ver trading-live/CLAUDE.md para el contexto de los 3
// modelos WS):
//  - Mismo marco horario que WS Continuation: aperturas horarias NY 1am-12pm,
//    DST-aware.
//  - Rango del movimiento: desde el origen (entrada del Time-Based Entry del
//    día, en el extremo opuesto) hasta el DOL de HTF (H4, o D1 si no hay H4
//    que rinda). "Último cuadrante" = el 25% de ese rango más cercano al DOL.
//  - Señal: la vela H1 inmediatamente anterior a la hora candidata entró en
//    la zona del último cuadrante (su extremo favorable >= inicio de esa
//    zona) SIN tocar/superar el DOL. La hora candidata repite el patrón PO3
//    (raid del extremo de esa vela H1 en la ventana [apertura-5min,
//    apertura+15min]) -> entrada inmediata, empujando el último tramo hacia
//    el DOL.
//  - SL: extremo del raid +/- buffer ATR14(M1), más holgado incluso que WS
//    Continuation (ver ATR_BUFFER_MULT) — se acepta R bajo o desfavorable a
//    propósito, sin piso de R mínimo.
//  - TP: nivel EXACTO del DOL (sin capar a un máximo de R). Salida inmediata
//    al tocarlo, sin esperar más expansión.
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
const ATR_BUFFER_MULT = 0.8; // el más holgado de los 3 modelos — valor propio, no lo dio Rafa
const SWING_FRACTAL_HTF = 2;
const LAST_QUARTER_FRACTION = 0.25; // "último cuadrante" = 25% del rango más cercano al DOL
const RAID_WINDOW_BEFORE_MIN = 5;
const RAID_WINDOW_AFTER_MIN = 15;
const NY_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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

function nyHourToUtc(dayUTC, nyHour) {
  const probe = new Date(Date.UTC(dayUTC.getUTCFullYear(), dayUTC.getUTCMonth(), dayUTC.getUTCDate(), 12));
  const offset = isUsDst(probe) ? 4 : 5;
  return new Date(Date.UTC(dayUTC.getUTCFullYear(), dayUTC.getUTCMonth(), dayUTC.getUTCDate(), nyHour + offset));
}

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
  console.log(`H1: ${h1Bars.length} velas.`);

  console.log('Descargando H4 y D1 para niveles DOL...');
  const h4Bars = await getTrendbarsRange(sid, SYMBOL, 'h4', htfFrom, toISO);
  const d1Bars = await getTrendbarsRange(sid, SYMBOL, 'd1', htfFrom, toISO);
  const h4Swings = { high: findSwings(h4Bars, 'high', SWING_FRACTAL_HTF), low: findSwings(h4Bars, 'low', SWING_FRACTAL_HTF) };
  const d1Swings = { high: findSwings(d1Bars, 'high', SWING_FRACTAL_HTF), low: findSwings(d1Bars, 'low', SWING_FRACTAL_HTF) };

  const daysSet = new Set(h1Bars.map((b) => b.timestamp.slice(0, 10)));
  const days = [...daysSet].sort();
  console.log(`Días con datos H1: ${days.length}`);

  function closePosition(pos, exitPx, reason, exitAt) {
    const risk = Math.abs(pos.entry - pos.sl);
    const r = pos.direction === 'long' ? (exitPx - pos.entry) / risk : (pos.entry - exitPx) / risk;
    pos.record.exit = exitPx; pos.record.exitReason = reason; pos.record.exitAt = exitAt; pos.record.r = Number(r.toFixed(3));
  }

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

    let dayDirection = null, dayOrigin = null, dayDol = null, dayTouchedDol = false;
    let openPosition = null;

    for (let hi = 0; hi < NY_HOURS.length; hi++) {
      const hourStart = nyHourToUtc(dayUTC, NY_HOURS[hi]);
      const hourStartMs = hourStart.getTime();
      const refIso = new Date(hourStartMs - 3600000).toISOString();
      const refCandle = findBarAt(h1Bars, refIso);
      if (!refCandle) continue;

      if (openPosition) {
        const from = openPosition.lastCheckedIdx + 1;
        let exited = false;
        for (let i = from; i < m1.length; i++) {
          const b = m1[i];
          const t = new Date(b.timestamp).getTime();
          if (t >= hourStartMs) break;
          const slHit = openPosition.direction === 'long' ? b.low <= openPosition.sl : b.high >= openPosition.sl;
          const tpHit = openPosition.direction === 'long' ? b.high >= openPosition.tp : b.low <= openPosition.tp;
          if (slHit && tpHit) { closePosition(openPosition, openPosition.sl, 'sl_y_tp_misma_vela_asume_sl', b.timestamp); exited = true; openPosition.lastCheckedIdx = i; break; }
          if (tpHit) { closePosition(openPosition, openPosition.tp, 'tp', b.timestamp); dayTouchedDol = true; exited = true; openPosition.lastCheckedIdx = i; break; }
          if (slHit) { closePosition(openPosition, openPosition.sl, 'sl', b.timestamp); exited = true; openPosition.lastCheckedIdx = i; break; }
          openPosition.lastCheckedIdx = i;
        }
        if (exited) { results.push(openPosition.record); openPosition = null; }
      }

      if (openPosition) {
        const adverse = openPosition.direction === 'long' ? refCandle.low < openPosition.refLow : refCandle.high > openPosition.refHigh;
        if (adverse) {
          const exitPx = refCandle.close;
          closePosition(openPosition, exitPx, 'tiempo_nueva_hora_adversa', refCandle.timestamp);
          results.push(openPosition.record);
          openPosition = null;
        }
      }

      const raid = detectRaid(m1, refCandle, hourStartMs);

      if (dayDirection === null) {
        if (!raid || raid.dir === 'ambos_mismo_m1') continue;
        const direction = raid.dir === 'low' ? 'long' : 'short';
        const sweepBar = m1[raid.idx];
        const atr = computeATR(m1, raid.idx, ATR_PERIOD);
        const originSl = direction === 'long' ? sweepBar.low - (atr ?? 0) * 0.1 : sweepBar.high + (atr ?? 0) * 0.1;
        const dol = pickDolTarget(direction, sweepBar.close, originSl, direction === 'long' ? h4Swings.high : h4Swings.low, direction === 'long' ? d1Swings.high : d1Swings.low, 0);
        dayDirection = direction;
        dayOrigin = sweepBar.close;
        dayDol = dol;
        continue;
      }

      if (dayTouchedDol && !openPosition) continue;
      if (!dayDol) continue; // sin DOL válido, no se puede definir el último cuadrante
      if (openPosition) continue;

      // ¿La vela H1 anterior (refCandle) ya entró en el último cuadrante sin tocar el DOL?
      const totalRange = Math.abs(dayDol.level - dayOrigin);
      const zoneStart = dayDirection === 'long' ? dayDol.level - LAST_QUARTER_FRACTION * totalRange : dayDol.level + LAST_QUARTER_FRACTION * totalRange;
      const favExtreme = dayDirection === 'long' ? refCandle.high : refCandle.low;
      const inLastQuarter = dayDirection === 'long'
        ? (favExtreme >= zoneStart && favExtreme < dayDol.level)
        : (favExtreme <= zoneStart && favExtreme > dayDol.level);
      if (!inLastQuarter) continue;

      if (!raid || raid.dir === 'ambos_mismo_m1') continue;
      const direction = raid.dir === 'low' ? 'long' : 'short';
      if (direction !== dayDirection) continue;

      const sweepBar = m1[raid.idx];
      const entry = sweepBar.close;
      const atr = computeATR(m1, raid.idx, ATR_PERIOD);
      const sl = direction === 'long' ? sweepBar.low - (atr ?? 0) * ATR_BUFFER_MULT : sweepBar.high + (atr ?? 0) * ATR_BUFFER_MULT;
      const distToDol = direction === 'long' ? dayDol.level - entry : entry - dayDol.level;
      if (distToDol <= 0) { dayTouchedDol = true; continue; }
      const riskPerUnit = Math.abs(entry - sl);
      const targetR = distToDol / riskPerUnit;

      openPosition = {
        direction, entry, sl, tp: dayDol.level, refHigh: refCandle.high, refLow: refCandle.low,
        lastCheckedIdx: raid.idx,
        record: {
          date: dayStr, nyHour: NY_HOURS[hi], outcome: 'setup', direction,
          refCandle: { timestamp: refCandle.timestamp, high: refCandle.high, low: refCandle.low },
          sweepAt: sweepBar.timestamp, entry, sl, tp: dayDol.level, targetR: Number(targetR.toFixed(3)), tpTf: dayDol.tf,
        },
      };
    }
    if (openPosition) {
      // ver comentario equivalente en backtest-continuation.mjs: se escanea hasta
      // el final del rango antes de cerrar técnicamente por fin de ventana.
      let closed = false;
      for (let i = openPosition.lastCheckedIdx + 1; i < m1.length; i++) {
        const b = m1[i];
        const slHit = openPosition.direction === 'long' ? b.low <= openPosition.sl : b.high >= openPosition.sl;
        const tpHit = openPosition.direction === 'long' ? b.high >= openPosition.tp : b.low <= openPosition.tp;
        if (slHit && tpHit) { closePosition(openPosition, openPosition.sl, 'sl_y_tp_misma_vela_asume_sl', b.timestamp); closed = true; break; }
        if (tpHit) { closePosition(openPosition, openPosition.tp, 'tp', b.timestamp); closed = true; break; }
        if (slHit) { closePosition(openPosition, openPosition.sl, 'sl', b.timestamp); closed = true; break; }
      }
      if (!closed) {
        const last = m1[m1.length - 1];
        closePosition(openPosition, last.close, 'fin_ventana_dia', last.timestamp);
      }
      results.push(openPosition.record);
    }
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
  writeFileSync(`${__dirname}/../backtest-results/last-quarter-v1.json`, JSON.stringify({ summary, results }, null, 2));

  const examples = withSignal.slice(0, 5);
  const md = `# Backtest — WS Last Quarter v1 (\`${SYMBOL}\`)

Generado: ${summary.generatedAt}

## Rango de datos real disponible
H1: ${summary.dataRangeH1.from} → ${summary.dataRangeH1.to} (${summary.dataRangeH1.bars} velas)

## Resultado agregado
- Días analizados: **${summary.diasAnalizados}**
- Señales de Last Quarter detectadas: **${summary.signalsDetected}**
- Win rate: **${winRate !== null ? winRate.toFixed(1) + '%' : 'N/A (sin señales)'}**
- R promedio: **${avgR !== null ? avgR.toFixed(2) : 'N/A'}**
- Ganadoras / perdedoras: ${wins.length} / ${losses.length}

## Ejemplos concretos
${examples.length === 0 ? '_No se detectó ningún setup completo en el rango disponible._' : examples.map((e, i) => `
### ${i + 1}. ${e.date} · hora NY ${e.nyHour}:00 · ${e.direction === 'long' ? 'LONG' : 'SHORT'}
- Vela H1 de referencia: ${e.refCandle.timestamp} (high ${e.refCandle.high}, low ${e.refCandle.low})
- Raid: ${e.sweepAt}
- Entry: ${e.entry} · SL: ${e.sl.toFixed(2)} · TP: ${e.tp.toFixed(2)} (objetivo ${e.targetR}R exacto al DOL, nivel ${e.tpTf})
- Salida: ${e.exit?.toFixed ? e.exit.toFixed(2) : e.exit} el ${e.exitAt} (motivo: ${e.exitReason})
- Resultado: **${e.r > 0 ? '+' : ''}${e.r}R**
`).join('\n')}

## Decisiones propias (interpretación de la regla que dio Rafa el 2026-09-08 — no asumidas en silencio)
1. **Zona horaria y ventana de raid**: mismas decisiones que WS Continuation (hora de Nueva York DST-aware, ventana unificada [apertura-5min, apertura+15min]) — ver \`continuation-v1.md\` puntos 1-2.
2. **"Último cuadrante"**: se definió como el 25% del rango total (origen del movimiento → DOL) más cercano al DOL, midiendo en precio, no en tiempo.
3. **Origen del rango**: precio de entrada de la señal inicial del día (el mismo mecanismo de Time-Based Entry usado para fijar dirección en WS Continuation), no un swing HTF explícito.
4. **"Falla en completar el DOL"**: se interpretó únicamente como que la vela H1 anterior entró en la zona del último cuadrante sin tocar el DOL — no se exigió una confirmación explícita de "rechazo" en esa vela; el propio patrón PO3 de la hora candidata (raid + reversión) se tomó como la evidencia del fallo/retroceso.
5. **Buffer de SL**: ATR14(M1) × ${ATR_BUFFER_MULT} — el más holgado de los 3 modelos, valor propio no dado por Rafa. Sin piso de R mínimo en el TP (se acepta cualquier R positivo, por bajo que sea).
6. **DOL del día**: se calcula una sola vez con la señal inicial (\`minRR: 0\`, cualquier distancia positiva sirve) y se reutiliza para todo el día — mismo criterio que en WS Continuation.
7. **Salida por tiempo y cierre de ventana del día**: mismas reglas técnicas que WS Continuation (no vienen de la especificación de Rafa, son cierre de backtest).

## Qué NO se hizo
- No se llamó ninguna tool de ejecución de órdenes del MCP de cTrader.
- No se escribió nada a Supabase — esto es histórico, para revisión antes de conectar nada en vivo.
`;
  writeFileSync(`${__dirname}/../backtest-results/last-quarter-v1.md`, md);

  console.log('\n=== RESUMEN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nReporte escrito en trading-live/backtest-results/last-quarter-v1.md (y .json)');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
