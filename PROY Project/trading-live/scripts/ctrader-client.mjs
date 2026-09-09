// Cliente mínimo del MCP local de cTrader Desktop (JSON-RPC 2.0 sobre HTTP,
// no es una integración nativa de tools — se habla crudo por fetch).
// Requiere cTrader Desktop abierto en esta misma máquina con Settings → MCP
// Server → Enable, y la cuenta DEMO activa (nunca la live).

const BASE_URL = 'http://127.0.0.1:9876/mcp/';
const HEADERS_BASE = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };

let nextId = 1;

async function rpc(sessionId, method, params) {
  const headers = { ...HEADERS_BASE };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  return res;
}

export async function initSession() {
  const res = await rpc(null, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'trading-live-backtest', version: '0.0.1' },
  });
  const sessionId = res.headers.get('Mcp-Session-Id');
  if (!sessionId) throw new Error('No se recibió Mcp-Session-Id — ¿cTrader Desktop tiene el MCP Server habilitado?');
  await res.json();
  await rpc(sessionId, 'notifications/initialized', {});
  return sessionId;
}

export async function callTool(sessionId, name, args) {
  const res = await rpc(sessionId, 'tools/call', { name, arguments: args });
  const json = await res.json();
  if (json.error) throw new Error(`MCP tool_error en ${name}: ${JSON.stringify(json.error)}`);
  const text = json.result?.content?.[0]?.text;
  if (text === undefined) throw new Error(`Forma de respuesta inesperada para ${name}: ${JSON.stringify(json)}`);
  return JSON.parse(text);
}

export async function getBalance(sessionId) {
  return callTool(sessionId, 'get_balance', {});
}

export async function getTrendbars(sessionId, symbolName, timeframe, fromISO, toISO, limit = 1000) {
  return callTool(sessionId, 'get_trendbars', { symbolName, timeframe, from: fromISO, to: toISO, limit });
}

// IMPORTANTE (verificado empíricamente): cuando el rango pide más barras que
// `limit`, el servidor devuelve las ÚLTIMAS `limit` barras antes de `to` (no
// las primeras después de `from`), en orden ascendente, con truncated:true.
// Para cubrir el rango completo hay que paginar HACIA ATRÁS: mover `to` al
// timestamp de la barra más vieja recibida y repetir.
export async function getTrendbarsRange(sessionId, symbolName, timeframe, fromISO, toISO) {
  const all = [];
  let cursorTo = toISO;
  const fromTime = new Date(fromISO).getTime();
  for (let guard = 0; guard < 300; guard++) {
    const page = await getTrendbars(sessionId, symbolName, timeframe, fromISO, cursorTo, 1000);
    const bars = page.bars ?? [];
    if (bars.length === 0) break;
    all.push(...bars);
    const oldestTs = bars[0].timestamp;
    if (new Date(oldestTs).getTime() <= fromTime || !page.truncated) break;
    cursorTo = oldestTs;
  }
  const seen = new Set();
  const dedup = all.filter((b) => (seen.has(b.timestamp) ? false : (seen.add(b.timestamp), true)));
  dedup.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return dedup.filter((b) => {
    const t = new Date(b.timestamp).getTime();
    return t >= fromTime && t <= new Date(toISO).getTime();
  });
}
