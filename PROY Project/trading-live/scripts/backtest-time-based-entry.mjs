// Backtest histórico del modelo "Time-Based Entry / CRT" (v1 confirmado por
// Rafa) sobre #USNDAQ100, usando datos reales vía el MCP de cTrader Desktop.
//
// SOLO ANÁLISIS: no llama ninguna tool de ejecución de órdenes, no escribe a
// Supabase. Escribe un reporte en trading-live/backtest-results/.
//
// Regla v1 (resumen — ver trading-live/CLAUDE.md para el detalle completo):
//  - Ventana de sesión (UTC, según DST): Londres 07:00-08:30 (BST) / 08:00-09:30
//    (GMT); NY 12:00-13:30 (EDT) / 13:00-14:30 (EST).
//  - Rango barrido = vela H1 inmediatamente anterior al inicio de la ventana.
//  - Barrido: M1 rompe el high o el low de esa vela H1 — el primero que ocurre
//    define la dirección esperada (barre low -> long, barre high -> short).
//  - Confirmación: M1 cambio de carácter (rompe el último swing M1 previo al
//    barrido, en la dirección de la reversión) O rechazo de mecha limpio en la
//    misma vela del barrido.
//  - Entrada: cierre de la vela M1 de confirmación.
//  - SL: extremo de la mecha del barrido +/- 0.1 * ATR14(M1) de buffer.
//  - TP: próximo swing H4 (o D1 si no hay H4 que alcance) del lado contrario,
//    mínimo 2R, techo 3R.
//  - Cierre por tiempo: 90 min desde el inicio de la ventana si no se tocó ni
//    SL ni TP.

import { initSession, getBalance, getTrendbars, getTrendbarsRange } from './ctrader-client.mjs';
import { isUsDst, isUkDst } from './dst.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYMBOL = '#USNDAQ100';

// ---------- decisiones propias que tomé por ambigüedad remanente (se listan
// también en el reporte final, no las escondo) ----------
const ATR_PERIOD = 14; // ATR14 en M1, estándar, no especificado explícitamente en la regla
const ATR_BUFFER_MULT = 0.1;
const SWING_FRACTAL_M1 = 1; // vela con high/low mayor que N velas a cada lado, en M1
const SWING_FRACTAL_HTF = 2; // en H4/D1, fractal más exigente (2 velas a cada lado)
const MIN_RR = 2;
const MAX_RR = 3;
const SESSION_MINUTES = 90;
const REJECTION_WICK_FRACTION = 0.5; // "rechazo de mecha limpio": la vela del barrido cierra de vuelta al menos 50% del rango de la mecha

function sma(values) { return values.reduce((a, b) => a + b, 0) / values.length; }

function computeATR(bars, endIndexExclusive, period) {
  // ATR simple (SMA de True Range) usando las `period` velas anteriores a endIndexExclusive.
  const start = Math.max(1, endIndexExclusive - period);
  const trs = [];
  for (let i = start; i < endIndexExclusive; i++) {
    const cur = bars[i], prev = bars[i - 1];
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
    trs.push(tr);
  }
  return trs.length ? sma(trs) : null;
}

function findLastSwing(bars, uptoIndexExclusive, type, fractal) {
  // Busca hacia atrás desde uptoIndexExclusive-1 el fractal de swing más reciente.
  // type: 'high' | 'low'
  for (let i = uptoIndexExclusive - 1 - fractal; i >= fractal; i--) {
    const c = bars[i];
    let isSwing = true;
    for (let k = 1; k <= fractal && isSwing; k++) {
      if (type === 'high') {
        if (!(c.high > bars[i - k].high && c.high > bars[i + k].high)) isSwing = false;
      } else {
        if (!(c.low < bars[i - k].low && c.low < bars[i + k].low)) isSwing = false;
      }
    }
    if (isSwing) return { index: i, bar: c };
  }
  return null;
}

function findSwings(bars, type, fractal) {
  const out = [];
  for (let i = fractal; i < bars.length - fractal; i++) {
    const c = bars[i];
    let isSwing = true;
    for (let k = 1; k <= fractal && isSwing; k++) {
      if (type === 'high') {
        if (!(c.high > bars[i - k].high && c.high > bars[i + k].high)) isSwing = false;
      } else {
        if (!(c.low < bars[i - k].low && c.low < bars[i + k].low)) isSwing = false;
      }
    }
    if (isSwing) out.push(c);
  }
  return out;
}

function sessionWindowsForDay(dayUTC) {
  // dayUTC: Date a medianoche UTC de ese día calendario.
  const y = dayUTC.getUTCFullYear(), m = dayUTC.getUTCMonth(), d = dayUTC.getUTCDate();
  const mk = (h, min) => new Date(Date.UTC(y, m, d, h, min));
  const probe = new Date(Date.UTC(y, m, d, 12)); // mediodía de ese día para evaluar DST
  const london = isUkDst(probe) ? mk(7, 0) : mk(8, 0);
  const ny = isUsDst(probe) ? mk(12, 0) : mk(13, 0);
  return [
    { session: 'Londres', start: london },
    { session: 'NY', start: ny },
  ];
}

function findBarAt(bars, iso) {
  // Comparar por valor de tiempo, no por string: toISOString() de JS siempre
  // agrega milisegundos (".000Z") y las marcas de tiempo del MCP no los traen.
  const t = new Date(iso).getTime();
  return bars.find((b) => new Date(b.timestamp).getTime() === t) || null;
}

function pickDolTargets(direction, entry, sl, h4Swings, d1Swings) {
  const riskPerUnit = Math.abs(entry - sl);
  const candidates = [];
  const collect = (swings, tf) => {
    for (const s of swings) {
      const level = direction === 'long' ? s.high : s.low;
      const dist = direction === 'long' ? level - entry : entry - level;
      if (dist <= 0) continue;
      const r = dist / riskPerUnit;
      if (r >= MIN_RR) candidates.push({ level, r, tf, dist });
    }
  };
  collect(h4Swings, 'H4');
  if (candidates.length === 0) collect(d1Swings, 'D1');
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist); // el más cercano que ya cumple >=2R
  const chosen = candidates[0];
  const cappedR = Math.min(chosen.r, MAX_RR);
  const tp = direction === 'long' ? entry + cappedR * riskPerUnit : entry - cappedR * riskPerUnit;
  return { tp, targetR: cappedR, rawLevel: chosen.level, tf: chosen.tf, uncappedR: chosen.r };
}

async function main() {
  console.log('Conectando al MCP de cTrader...');
  const sid = await initSession();
  const balance = await getBalance(sid);
  if (balance.isLive) throw new Error('SEGURIDAD: la cuenta activa es LIVE, no demo. Abortando.');
  console.log(`Conectado. Cuenta: ${balance.accountType}, broker ${balance.brokerName}, balance ${balance.balance} ${balance.depositAsset}, live=${balance.isLive}`);

  const now = new Date();
  const toISO = now.toISOString();
  const fromDate = new Date(now.getTime() - 30 * 86400000);
  const fromISO = fromDate.toISOString();

  console.log(`Descargando H1 (${fromISO} -> ${toISO})...`);
  const h1Bars = await getTrendbarsRange(sid, SYMBOL, 'h1', fromISO, toISO);
  console.log(`H1: ${h1Bars.length} velas. Rango real: ${h1Bars[0]?.timestamp} -> ${h1Bars[h1Bars.length - 1]?.timestamp}`);

  const htfFrom = new Date(now.getTime() - 60 * 86400000).toISOString(); // más histórico para tener swings HTF de sobra
  console.log('Descargando H4 y D1 para niveles DOL...');
  const h4Bars = await getTrendbarsRange(sid, SYMBOL, 'h4', htfFrom, toISO);
  const d1Bars = await getTrendbarsRange(sid, SYMBOL, 'd1', htfFrom, toISO);
  console.log(`H4: ${h4Bars.length} velas. D1: ${d1Bars.length} velas.`);

  const h4Swings = { high: findSwings(h4Bars, 'high', SWING_FRACTAL_HTF), low: findSwings(h4Bars, 'low', SWING_FRACTAL_HTF) };
  const d1Swings = { high: findSwings(d1Bars, 'high', SWING_FRACTAL_HTF), low: findSwings(d1Bars, 'low', SWING_FRACTAL_HTF) };

  // Días calendario reales cubiertos por los datos H1
  const daysSet = new Set(h1Bars.map((b) => b.timestamp.slice(0, 10)));
  const days = [...daysSet].sort();

  const sessions = [];
  for (const dayStr of days) {
    const dayUTC = new Date(dayStr + 'T00:00:00Z');
    for (const { session, start } of sessionWindowsForDay(dayUTC)) {
      sessions.push({ session, date: dayStr, windowStart: start });
    }
  }
  console.log(`Sesiones candidatas (Londres+NY por día con datos H1): ${sessions.length}`);

  const results = [];
  let processed = 0;
  for (const s of sessions) {
    processed++;
    const refIso = new Date(s.windowStart.getTime() - 3600 * 1000).toISOString();
    const refCandle = findBarAt(h1Bars, refIso);
    if (!refCandle) { results.push({ ...s, outcome: 'sin_datos_h1', reason: `no hay vela H1 en ${refIso}` }); continue; }

    const windowEnd = new Date(s.windowStart.getTime() + SESSION_MINUTES * 60000);
    const windowEndMs = windowEnd.getTime();
    // pedimos algo de M1 previo (para ATR) además del rango de la sesión
    const m1From = new Date(s.windowStart.getTime() - 30 * 60000).toISOString();
    const m1To = windowEnd.toISOString();
    let m1;
    try {
      m1 = await getTrendbarsRange(sid, SYMBOL, 'm1', m1From, m1To);
    } catch (e) {
      results.push({ ...s, outcome: 'error_mcp', reason: String(e.message || e) });
      continue;
    }
    if (m1.length < 30) { results.push({ ...s, outcome: 'sin_datos_m1', reason: `solo ${m1.length} velas M1 disponibles` }); continue; }

    const windowStartIdx = m1.findIndex((b) => new Date(b.timestamp).getTime() >= s.windowStart.getTime());
    if (windowStartIdx < 0) { results.push({ ...s, outcome: 'sin_datos_m1', reason: 'ventana sin velas M1' }); continue; }

    // 1) Barrido: primer M1 dentro de la ventana que rompe high o low de refCandle
    let sweepIdx = -1, sweepDir = null;
    for (let i = windowStartIdx; i < m1.length && new Date(m1[i].timestamp).getTime() < windowEndMs; i++) {
      const b = m1[i];
      const brokeHigh = b.high > refCandle.high;
      const brokeLow = b.low < refCandle.low;
      if (brokeHigh && brokeLow) { sweepIdx = i; sweepDir = 'ambos_mismo_m1'; break; } // ambiguo, se descarta abajo
      if (brokeHigh) { sweepIdx = i; sweepDir = 'high'; break; }
      if (brokeLow) { sweepIdx = i; sweepDir = 'low'; break; }
    }
    if (sweepIdx === -1) { results.push({ ...s, outcome: 'sin_barrido', reason: 'precio no rompió el rango H1 de referencia dentro de la ventana' }); continue; }
    if (sweepDir === 'ambos_mismo_m1') { results.push({ ...s, outcome: 'descartado_ambiguo', reason: 'la misma vela M1 rompió ambos lados del rango H1 — no se puede determinar cuál fue primero' }); continue; }

    const direction = sweepDir === 'low' ? 'long' : 'short';
    const sweepBar = m1[sweepIdx];

    // 2) Confirmación: cambio de carácter (rompe swing M1 previo) O rechazo de mecha limpio en la misma vela del barrido
    let entryIdx = -1, confirmType = null;
    const wickRange = sweepDir === 'low' ? (sweepBar.open - sweepBar.low) : (sweepBar.high - sweepBar.open);
    const closeBack = sweepDir === 'low' ? (sweepBar.close - sweepBar.low) : (sweepBar.high - sweepBar.close);
    if (wickRange > 0 && closeBack / wickRange >= REJECTION_WICK_FRACTION &&
        ((direction === 'long' && sweepBar.close > refCandle.low) || (direction === 'short' && sweepBar.close < refCandle.high))) {
      entryIdx = sweepIdx; confirmType = 'rechazo_mecha';
    } else {
      const swingType = direction === 'long' ? 'high' : 'low';
      const swing = findLastSwing(m1, sweepIdx, swingType, SWING_FRACTAL_M1);
      if (swing) {
        for (let i = sweepIdx + 1; i < m1.length && new Date(m1[i].timestamp).getTime() < windowEndMs; i++) {
          const b = m1[i];
          if ((direction === 'long' && b.close > swing.bar.high) || (direction === 'short' && b.close < swing.bar.low)) {
            entryIdx = i; confirmType = 'cambio_caracter'; break;
          }
        }
      }
    }
    if (entryIdx === -1) { results.push({ ...s, outcome: 'sin_confirmacion', reason: 'hubo barrido pero no se confirmó cambio de carácter ni rechazo de mecha dentro de la ventana', direction, sweepAt: sweepBar.timestamp }); continue; }

    const entryBar = m1[entryIdx];
    const entry = entryBar.close;
    const atr = computeATR(m1, sweepIdx, ATR_PERIOD);
    const buffer = (atr ?? 0) * ATR_BUFFER_MULT;
    const sl = direction === 'long' ? sweepBar.low - buffer : sweepBar.high + buffer;

    const dol = pickDolTargets(direction, entry, sl, direction === 'long' ? h4Swings.high : h4Swings.low, direction === 'long' ? d1Swings.high : d1Swings.low);
    if (!dol) { results.push({ ...s, outcome: 'sin_dol', reason: 'no se encontró nivel H4/D1 que rinda >=2R', direction, entry, sl }); continue; }

    // 3) Simulación de salida: SL/TP/tiempo, vela a vela desde entryIdx+1 hasta el cierre de la ventana de 90 min
    let exit = null, exitReason = null, exitAt = null;
    for (let i = entryIdx + 1; i < m1.length && new Date(m1[i].timestamp).getTime() < windowEndMs; i++) {
      const b = m1[i];
      const slHit = direction === 'long' ? b.low <= sl : b.high >= sl;
      const tpHit = direction === 'long' ? b.high >= dol.tp : b.low <= dol.tp;
      if (slHit && tpHit) { exit = sl; exitReason = 'sl_y_tp_misma_vela_asume_sl'; exitAt = b.timestamp; break; } // conservador
      if (slHit) { exit = sl; exitReason = 'sl'; exitAt = b.timestamp; break; }
      if (tpHit) { exit = dol.tp; exitReason = 'tp'; exitAt = b.timestamp; break; }
    }
    if (exit === null) {
      const lastInWindow = [...m1].reverse().find((b) => new Date(b.timestamp).getTime() < windowEndMs);
      exit = lastInWindow ? lastInWindow.close : entry;
      exitReason = 'tiempo_90min';
      exitAt = lastInWindow ? lastInWindow.timestamp : windowEnd.toISOString();
    }

    const riskPerUnit = Math.abs(entry - sl);
    const rResult = direction === 'long' ? (exit - entry) / riskPerUnit : (entry - exit) / riskPerUnit;

    results.push({
      ...s, outcome: 'setup', direction, confirmType,
      refCandle: { timestamp: refCandle.timestamp, high: refCandle.high, low: refCandle.low },
      sweepAt: sweepBar.timestamp, entryAt: entryBar.timestamp, entry, sl, tp: dol.tp, targetR: dol.targetR, tpTf: dol.tf,
      exit, exitReason, exitAt, r: Number(rResult.toFixed(3)),
    });
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
    sessionsAnalyzed: sessions.length,
    signalsDetected: withSignal.length,
    winRate, avgR, wins: wins.length, losses: losses.length,
    outcomeBreakdown: results.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] || 0) + 1; return acc; }, {}),
  };

  mkdirSync(`${__dirname}/../backtest-results`, { recursive: true });
  writeFileSync(`${__dirname}/../backtest-results/time-based-entry-v1.json`, JSON.stringify({ summary, results }, null, 2));

  const examples = withSignal.slice(0, 5);
  const md = `# Backtest — Time-Based Entry / CRT v1 (\`${SYMBOL}\`)

Generado: ${summary.generatedAt}

## Rango de datos real disponible
H1: ${summary.dataRangeH1.from} → ${summary.dataRangeH1.to} (${summary.dataRangeH1.bars} velas)

No es un rango elegido de antemano — es lo que el MCP de cTrader realmente devolvió al pedir los últimos 30 días desde hoy.

## Resultado agregado
- Sesiones analizadas (Londres + NY, un intento por día calendario cubierto por los datos): **${summary.sessionsAnalyzed}**
- Señales detectadas (barrido + confirmación completos): **${summary.signalsDetected}**
- Win rate: **${winRate !== null ? winRate.toFixed(1) + '%' : 'N/A (sin señales)'}**
- R promedio: **${avgR !== null ? avgR.toFixed(2) : 'N/A'}**
- Ganadoras / perdedoras: ${wins.length} / ${losses.length}

### Desglose de por qué NO hubo señal (la mayoría de sesiones)
${Object.entries(summary.outcomeBreakdown).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}

## Ejemplos concretos de setups detectados
${examples.length === 0 ? '_No se detectó ningún setup completo en el rango disponible — ver desglose arriba._' : examples.map((e, i) => `
### ${i + 1}. ${e.session} · ${e.date} · ${e.direction === 'long' ? 'LONG' : 'SHORT'}
- Vela H1 de referencia: ${e.refCandle.timestamp} (high ${e.refCandle.high}, low ${e.refCandle.low})
- Barrido: ${e.sweepAt}
- Confirmación (${e.confirmType}): ${e.entryAt}
- Entry: ${e.entry} · SL: ${e.sl.toFixed(2)} · TP: ${e.tp.toFixed(2)} (objetivo ${e.targetR.toFixed(2)}R, nivel ${e.tpTf})
- Salida: ${e.exit.toFixed(2)} el ${e.exitAt} (motivo: ${e.exitReason})
- Resultado: **${e.r > 0 ? '+' : ''}${e.r}R**
`).join('\n')}

## Decisiones propias (por ambigüedad remanente en la regla — no asumidas en silencio)
1. **ATR**: se usó ATR(14) simple en M1 (no especificado en la regla original).
2. **Definición de "swing" M1** para el cambio de carácter: fractal de 1 vela a cada lado. Para swings H4/D1 (niveles DOL): fractal de 2 velas a cada lado (más exigente, para no tomar micro-máximos como niveles institucionales).
3. **"Rechazo de mecha limpio"**: se interpretó como que la misma vela del barrido cierra de vuelta al menos 50% del rango de su propia mecha, y el cierre queda del lado correcto del rango H1 de referencia. Si no se cumple, se buscó el "cambio de carácter" clásico (ruptura de swing M1 previo) como confirmación alternativa.
4. **Barrido ambiguo**: si la MISMA vela M1 rompe high Y low del rango de referencia, la sesión se descartó por no poder determinar cuál lado se barrió primero (columna \`descartado_ambiguo\` arriba).
5. **SL y TP en la misma vela**: si una vela toca ambos niveles, se asumió conservadoramente que el SL se ejecuta primero.
6. **DOL**: se buscó primero en swings H4; solo si ninguno rinde ≥2R se probó en D1, tal como pide la regla.

## Qué NO se hizo
- No se llamó ninguna tool de ejecución de órdenes del MCP de cTrader.
- No se escribió nada a \`trading_setups\`/\`trading_positions\` de Supabase — esto es histórico, para revisión antes de conectar nada en vivo.
`;
  writeFileSync(`${__dirname}/../backtest-results/time-based-entry-v1.md`, md);

  console.log('\n=== RESUMEN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nReporte escrito en trading-live/backtest-results/time-based-entry-v1.md (y .json)`);
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
