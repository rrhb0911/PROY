# Checklist de Trading — Double Check con Claude Code

Usa este archivo como referencia cuando le pidas a Claude Code que verifique, configure o ejecute algo. Cada sección tiene pasos concretos para que Claude confirme antes de avanzar.

---

## 📡 1. Local MCP — Verificar Conexión

Pídele a Claude Code:

> "Verifica que el cTrader Local MCP esté funcionando. Conéctate y dime el balance de mi cuenta."

**Checklist:**
- [ ] cTrader Desktop está abierto
- [ ] MCP Server está habilitado (Settings → MCP Server → Enable)
- [ ] `opencode.jsonc` tiene la config correcta
- [ ] Claude Code responde con datos de cuenta (balance, equity)
- [ ] Si falla: reiniciar cTrader Desktop y recargar Claude Code

---

## 🔌 2. FIX API — Verificar Credenciales

Pídele a Claude Code:

> "Revisa el archivo trading/config/fix-api.md y confirma que las credenciales FIX están completas."

**Checklist:**
- [ ] Host: `live-uk-eqx-01.p.c-trader.com`
- [ ] Puerto QUOTE: 5211 (SSL)
- [ ] Puerto TRADE: 5212 (SSL)
- [ ] Account: 8176757
- [ ] SenderCompID: `live.fxpro.8176757`
- [ ] TargetCompID: `cServer`
- [ ] SenderSubID: `QUOTE` y `TRADE`
- [ ] Password: confirmar que está guardada (nunca en texto plano en commits)

---

## 📊 3. Estrategias Pine — Originales Intactos

Pídele a Claude Code:

> "Lista los archivos en trading/strategies/ y dime su tamaño en líneas."

**Checklist:**
- [ ] `ST 4H + EMA 200 + Fib [RRHB].md` existe (800 líneas)
- [ ] `RSI & Volumen [RRHB].md` existe (116 líneas)
- [ ] No han sido modificados (solo documentación)
- [ ] Los originales están respaldados

---

## 🧩 4. Componentes de la Estrategia (antes de codificar)

Cuando conviertas a cBot, verifica cada componente por separado:

### 4.1 SuperTrend HTF
- [ ] 11 tipos de media móvil (SMA, EMA, WMA, DEMA, TMA, VAR, WWMA, ZLEMA, TSF, HULL, TILL)
- [ ] ATR clásico o SMA(TR)
- [ ] Multiplicador configurable
- [ ] Señales de cambio de tendencia
- [ ] HTF con `request.security()`

### 4.2 FRAMA Channel
- [ ] Dimensión fractal con N=26
- [ ] Bandas superior e inferior con distancia configurable
- [ ] Breakouts (crossover/crossunder)
- [ ] Etiquetas de señal

### 4.3 ICT Sessions
- [ ] Londres (0300-1200)
- [ ] Nueva York (0830-1700)
- [ ] Cierre al final de sesión
- [ ] Franja combinada (OR lógico)

### 4.4 Fibonacci
- [ ] Detección automática del último impulso
- [ ] Niveles 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
- [ ] Líneas extensibles a la derecha
- [ ] Etiquetas con precio y porcentaje

### 4.5 RSI Trendlines + Volumen
- [ ] RSI con pivot highs/lows
- [ ] Trendlines automáticas
- [ ] Volumen escalado en el panel inferior

### 4.6 Lógica de Trading
- [ ] Entrada Long: SuperTrend alcista + sesión activa + sin posición
- [ ] Entrada Short: SuperTrend bajista + sesión activa + sin posición
- [ ] Stop Loss por operación
- [ ] Cierre al final de sesión (opcional)

---

## 🧪 5. Testing del cBot (cuando esté convertido)

Pídele a Claude Code:

> "Compara las señales del cBot contra el Pine Script original en TradingView para el mismo par y timeframe."

**Checklist:**
- [ ] Backtest en cTrader da resultados similares a TradingView
- [ ] Las señales de entrada coinciden (misma vela, mismo precio)
- [ ] Los SL se activan en los mismos puntos
- [ ] El FRAMA channel dibuja niveles idénticos
- [ ] Las ICT sessions se activan a la misma hora

---

## 🚦 6. Modos de Operación

### Modo Manual (arranque)
1. Claude Code analiza el mercado vía MCP
2. Claude sugiere entrada/salida
3. Tú confirmas antes de ejecutar

### Modo Semi-Automático
1. El cBot corre en segundo plano generando señales
2. Claude Code te notifica: "Señal LONG detectada en EURUSD"
3. Tú decides si ejecutar

### Modo Automático
1. El cBot ejecuta solo dentro del horario configurado
2. SL/TP automáticos
3. Solo abres cTrader para monitorear

### FIX API (High Frequency)
1. Conexión directa al broker sin cTrader Desktop
2. Para estrategias que requieren latencia < 10ms
3. No mezclar con MCP en la misma sesión

---

## ⚠️ 7. Seguridad y Riesgos

**Antes de operar real:**
- [ ] Usar cuenta demo las primeras 2 semanas
- [ ] Verificar que el SL se ejecuta correctamente
- [ ] Confirmar que el filtro de sesiones funciona
- [ ] Probar qué pasa si cTrader Desktop se cierra (MCP pierde conexión)
- [ ] Tener un plan de contingencia: si el cBot falla, cómo cierras posiciones

**Nunca:**
- [ ] Compartir credenciales FIX en commits
- [ ] Ejecutar en real sin backtest previo
- [ ] Dejar el cBot desatendido sin SL

---

## 📁 8. Estructura de Archivos (mantener)

```
trading/
├── config/
│   ├── fix-api.md       # FIX QUOTE + TRADE
│   ├── mcp-local.md     # Local MCP
│   └── binance.md       # Binance (pendiente)
├── strategies/           # Pine Scripts ORIGINALES (no modificar)
├── cBots/                # cBots convertidos a C#
│   └── SuperTrendFRAMA/  # Estrategia principal
├── indicators/           # Indicadores C#
├── scripts/              # Scripts auxiliares (Python, etc.)
├── backtests/            # Resultados de backtests
├── logs/                 # Historial de operaciones
└── CHECKLIST-TRADING.md  # Este archivo
```
