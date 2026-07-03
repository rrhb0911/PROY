# Módulo de Trading — PROY

## Visión General

Sistema de trading unificado que conecta **cTrader** (forex/CFDs) y **Binance** (crypto) para operar en línea, generar estrategias, analizar tendencias y ejecutar órdenes asistido por IA a través de Claude Code + MCP.

---

## Conexiones

### cTrader (Forex / CFDs)

cTrader expone **MCP servers oficiales** (cTrader AI Agent Connect) que permiten a Claude Code conectarse directamente a la plataforma:

| Tipo | Conexión | Alcance |
|------|----------|---------|
| **Remote MCP** | cTrader Web | Cuenta, órdenes, market data, velas históricas |
| **Local MCP** | cTrader Desktop (Windows) | Todo lo anterior + charts, indicadores, plugins, alertas, workspaces |

**Setup:**
1. **Remote MCP**: cTrader Web → Settings → Remote MCP → copiar token → configurar en `~/.claude.json`
2. **Local MCP**: cTrader Desktop → Settings → MCP Server → habilitar → conectar con Claude Code

**Capacidades vía MCP:**
- Balance, equity, margen, P&L
- Órdenes market, limit, stop
- Modificar SL/TP, cerrar posiciones
- Velas OHLCV en cualquier timeframe
- Indicadores técnicos (RSI, MACD, BB, EMA, etc.)
- Trade history y análisis de portafolio

### Binance (Crypto)

API REST + WebSocket para datos en tiempo real de spot y futures.

**Capacidades:**
- Precios en tiempo real (WebSocket streams)
- Velas históricas (OHLCV)
- Order book, depth
- Cuenta (balance, órdenes abiertas)
- Ejecución de órdenes spot y futures

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code                        │
│  (razonamiento, estrategias, análisis, decisiones)   │
└────────┬───────────────────────────────┬────────────┘
         │ MCP                            │ REST + WS
         ▼                                ▼
┌─────────────────┐           ┌──────────────────────┐
│  cTrader MCP     │           │  Binance API          │
│  (Local/Remote)  │           │  (spot + futures)     │
├─────────────────┤           ├──────────────────────┤
│ • Forex + CFDs   │           │ • Crypto spot         │
│ • Ejecución      │           │ • Crypto futures      │
│ • Charts         │           │ • WebSocket streams   │
│ • Indicadores    │           │ • Order book          │
└─────────────────┘           └──────────────────────┘
```

---

## Estrategias

### 1. Análisis de Mercado
- Escanear múltiples símbolos en busca de tendencias
- Identificar soportes/resistencias clave
- Detectar patrones de velas
- Análisis multi-timeframe

### 2. Estrategias Direccionales
- **Trend Following**: EMA crossover, MACD, confirmación de volumen
- **Breakout**: Ruptura de soporte/resistencia con filtro RSI
- **Reversión**: RSI sobrecompra/sobreventa con confirmación de precio
- **Martingala / Grid**: Para mercados laterales controlados

### 3. Risk Management
- Tamaño de posición basado en % de cuenta (riesgo por operación)
- Stop Loss dinámico (ATR, trailing)
- Take Profit escalonado
- Ratio riesgo/recompensa mínimo configurable

### 4. Señales Multi-mercado
- Correlación forex + crypto
- Contexto global (índices, commodities) vía cTrader
- Noticias y sentimiento

---

## Estructura de Archivos

```
trading/
├── config/
│   ├── ctrader.json          # Conexión MCP cTrader
│   └── binance.json          # API keys Binance
├── strategies/               # Estrategias implementadas
│   ├── trend-following.md
│   ├── breakout.md
│   └── martingale.md
├── scripts/
│   ├── sync-prices.py        # Sincronización de precios
│   └── signals.py            # Generador de señales
├── backtests/                # Resultados de backtests
└── logs/                     # Historial de operaciones
```

---

## Setup Inicial

### cTrader Remote MCP (para Claude Code)
```json
{
  "mcpServers": {
    "ctrader": {
      "command": "npx",
      "args": ["-y", "@ctrader/mcp-server"],
      "env": {
        "CTRADER_TOKEN": "tu-token-desde-ctrader-web"
      }
    }
  }
}
```

### Binance API
```env
BINANCE_API_KEY=tu-api-key
BINANCE_SECRET_KEY=tu-secret
```

---

## Próximos Pasos

1. Configurar cuenta demo en cTrader
2. Probar conexión MCP con Claude Code
3. Sincronizar mercados de interés (forex + crypto)
4. Backtestear primera estrategia
5. Operar en demo con supervisión manual
