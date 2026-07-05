# Módulo de Trading — PROY

## Visión General

Sistema de trading unificado que conecta **cTrader** (forex/CFDs) vía MCP + FIX API y **Binance** (crypto) para operar, ejecutar estrategias y analizar mercados asistido por IA.

---

## Conexiones Disponibles

### 1. Local MCP — cTrader Desktop ✅ (ya configurado)
`opencode.jsonc` → `http://127.0.0.1:9876/mcp/`

| Aspecto | Detalle |
|---------|---------|
| **Requiere** | cTrader Desktop abierto |
| **Alcance** | Trading, cuentas, charts, indicadores, plugins, UI, alertas |
| **Ideal para** | Análisis con IA, órdenes rápido, control total del escritorio |

### 2. Remote MCP — cTrader Web
```json
{
  "mcpServers": {
    "ctrader-remote": {
      "command": "npx",
      "args": ["-y", "@ctrader/mcp-server"],
      "env": { "CTRADER_TOKEN": "tu-token" }
    }
  }
}
```
**Alcance:** Trading, cuentas, market data (sin charts ni indicadores)

### 3. FIX API — Conexión Directa al Broker ✅ (credenciales listas)
Conexión institucional directa a FxPro sin intermediarios.

| Conexión | Puerto SSL | Propósito |
|----------|-----------|-----------|
| **QUOTE** (SenderSubID: QUOTE) | 5211 | Market data en vivo |
| **TRADE** (SenderSubID: TRADE) | 5212 | Ejecución de órdenes |

**Host:** `live-uk-eqx-01.p.c-trader.com`
**Account:** 8176757 | **SenderCompID:** `live.fxpro.8176757` | **TargetCompID:** `cServer`

### 4. Binance API — Crypto (pendiente)
API REST + WebSocket para spot y futures.

---

## Arquitectura Completa

```
┌──────────────────────────────────────────────────────────┐
│                    Claude Code (AI Layer)                 │
│  (razonamiento, análisis, decisiones, lenguaje natural)   │
└──────┬──────────────┬──────────────────┬─────────────────┘
       │ MCP (HTTP)    │ FIX (TCP/SSL)    │ REST + WS
       ▼               ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ cTrader MCP  │ │ cTrader FIX  │ │ Binance API      │
│ (Local/Rem)  │ │ (FxPro)      │ │ (spot+futures)   │
├──────────────┤ ├──────────────┤ ├──────────────────┤
│ • Trading    │ │ • Precios    │ │ • Crypto spot    │
│ • Charts     │ │ • Órdenes    │ │ • Futures        │
│ • Indicadores│ │ • HFT        │ │ • WebSocket      │
│ • UI/Plugins │ │ • Multi-brk  │ │ • Order book     │
└──────────────┘ └──────────────┘ └──────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              cTrader Algo (cBots en C#)                   │
│  Estrategias: SuperTrend HTF/LTF + FRAMA + ICT + Fib     │
│  + RSI Trendlines + Volumen                              │
└──────────────────────────────────────────────────────────┘
```

---

## Estrategias (desde TradingView Pine Script)

Archivos en `trading/strategies/`:

| Estrategia | Componentes | Estado |
|-----------|-------------|--------|
| **ST 4H + EMA 200 + Fib [RRHB]** (800 líneas) | SuperTrend HTF (11 MAs), FRAMA Channel, ICT Sessions, Fibonacci, RSI+Volumen | Pine listo → convertir a C# |
| **RSI & Volumen [RRHB]** (116 líneas) | RSI + Trendlines + Volumen normalizado | Pine listo → convertir a C# |

---

## Estructura de Archivos

```
trading/
├── config/
│   ├── fix-api.md           # Credenciales FIX (QUOTE + TRADE)
│   ├── mcp-local.md         # Config Local MCP
│   └── binance.md           # Binance API (pendiente)
├── strategies/
│   ├── ST 4H + EMA 200 + Fib [RRHB].md    # Pine Script original
│   └── RSI & Volumen [RRHB].md             # Pine Script original
├── cBots/                   # Aquí irán los cBots convertidos a C#
├── indicators/              # Aquí irán los indicadores en C#
├── scripts/
├── backtests/
└── logs/
```

---

## C# vs Python para cTrader — ¿Cuál elegir?

| Aspecto | C# (.NET 6.0) | Python |
|---------|---------------|--------|
| **Soporte nativo cTrader** | ✅ Completo (cBots, indicadores, plugins) | ✅ Soporte oficial (más nuevo) |
| **FIX API** | ✅ SDK oficial (QuickFIXn) | ⚠️ No hay SDK oficial, toca con wrappers |
| **Rendimiento** | 🚀 Más rápido (compilado) | 🐢 Interpretado, más lento |
| **Documentación** | 📚 Extensa, 10+ años de ejemplos | 📖 Creciente, menos ejemplos |
| **Librerías** | Sistema.IO, Math, LINQ potente | pandas, numpy, scipy |
| **Pine → Conversión** | 🔄 Más directa (mismos conceptos OOP) | ⚠️ Requiere adaptación |
| **Algoritmos complejos** | ✅ Mejor para HFT y lógica pesada | ✅ Bueno para data science |
| **Debugging** | ✅ IDE completo (VS/Rider) | ✅ Cualquier editor |

### ✅ Recomendación: C#

**Motivos:**
1. La FIX API tiene SDK oficial solo en **.NET (QuickFIXn)**
2. Los cBots de cTrader tienen 10+ años de ejemplos y comunidad en C#
3. La conversión del Pine Script es más directa a C# (estructuras de control, tipos, eventos `OnStart`/`OnTick`)
4. Mejor rendimiento para estrategias en vivo
5. Si después quieres algo en Python, el cBot en C# puede llamar scripts Python para análisis

### Cuándo usar Python
- **Análisis offline**: backtesting, data science, machine learning
- **Scripts auxiliares**: sincronización de datos, reportes
- **Binance**: la API REST/WS de Binance tiene SDKs excelentes en Python

---

## Referencia Rápida

| Archivo | Propósito |
|---------|-----------|
| `trading/CHECKLIST-TRADING.md` | Double check paso a paso para Claude Code |
| `trading/config/fix-api.md` | Credenciales FIX API |
| `trading/config/mcp-local.md` | Config Local MCP |
| `trading/config/binance.md` | Binance API (pendiente) |
| `trading/strategies/` | Pine Scripts originales (no modificar) |

---

## Próximos Pasos

1. ✅ Configurar Local MCP en opencode.jsonc
2. ✅ Documentar credenciales FIX API
3. Pendiente: convertir estrategia Pine → cBot C#
4. Pendiente: probar conexión FIX con QuickFIXn
5. Pendiente: configurar Binance API
6. Pendiente: backtest de la estrategia convertida
