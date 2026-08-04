# cTrader MCP — Trading Analysis

## Comportamiento estándar al abrir este proyecto

Cada vez que el usuario pida "el análisis" (o abra este proyecto y pida un análisis del día), Claude debe entregar, sin que se lo tengan que pedir de nuevo:

1. **NAS100 (`#USNDAQ100`) es el activo principal.** Análisis técnico completo con escenario de entrada claro (long o short: soporte/resistencia clave, dirección de la tendencia, condición que confirmaría la entrada), no solo describir el precio.
2. **Relación con otros mercados que puedan influir en NAS100** — no es un análisis aparte, es contexto para la operación de NAS100. Plantilla validada por el usuario (2026-07-21), usar estos 3 roles como mínimo:
   - **SPX500 y US30 = confirmación cruzada.** ¿Se mueven en la misma dirección que NAS100 (confirma el escenario) o NAS100 va rezagado/adelantado (divergencia = señal de alerta, priorizar SPX500/US30 sobre NAS100 si diverge)?
   - **BTC (`BITCOIN` en cTrader) = indicador líder de apetito de riesgo.** Si BTC hace máximos/mínimos nuevos antes que NAS100, es señal adelantada de hacia dónde va el risk-on/risk-off — mencionar explícitamente si BTC "lidera" o "confirma" el movimiento de NAS100.
   - **USD (vía EURUSD u otros majors) = viento a favor o en contra.** Dólar fuerte (EURUSD cayendo) suele presionar a NAS100 — señalar si el dólar está alineado con el escenario o es la principal señal de cautela.
   - Cualquier otro dato relevante que aparezca (noticias, WTI/gas si hay un shock que mueva el sentimiento general, etc.)
3. El resto de símbolos (US30, SPX500, majors, XAUUSD, WTI) ya no se piden todos por defecto — solo se detallan si el usuario los pide explícitamente por nombre, o si son relevantes como contexto de correlación para NAS100 (punto 2).

### Fuente de datos
- Datos técnicos (velas OHLC) se sacan de **cTrader MCP** (`get_trendbars`, `get_spot_prices`) — es la fuente fiable para forex/índices/commodities, con datos reales del broker (FxPro).
- El servidor **TradingView MCP** (`combined_analysis`, `multi_timeframe_analysis`, `multi_agent_analysis`) tiene un bug: ignora el parámetro `exchange` y siempre intenta `KUCOIN` internamente — por eso falla con "No data found" para forex/índices/commodities (no está mapeado a OANDA/TVC). Es útil igual para: `market_snapshot` (visión rápida de índices/crypto/fx vía Yahoo, sin exchange), `financial_news` (aunque el feed configurado es mayormente cripto/CoinDesk — poco relevante para forex).
- `get_spot_prices` de cTrader falla fuera de horario de mercado (fin de semana / mercado cerrado) — no es un problema de configuración, simplemente no hay cotización en vivo. Usar el último `d1` bar cerrado como referencia.

### Símbolos de referencia (watchlist "rafa" en cTrader)
EURUSD, GBPUSD, USDJPY, WTI, XAUUSD, #US30, #USSPX500. Activo principal: **#USNDAQ100** (NAS100 — nombre real en el broker, no "NAS100" ni "NASDAQ100"). Correlación: **BITCOIN** (nombre real en cTrader, no "BTC" ni "BTCUSD").

### Nota sobre el MCP
El MCP de cTrader ya está operativo dentro de la sesión de Claude Code (no requiere reiniciar Claude Code para funcionar) — se confirmó consultando posiciones, balance, watchlists y velas diarias sin problema. Si en algún momento las tools de `mcp__ctrader__*` no aparecen, sí puede hacer falta reiniciar sesión para que se recarguen los servers MCP definidos en `.mcp.json`.
