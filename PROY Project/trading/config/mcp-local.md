# Local MCP Server — cTrader Desktop

Configurado en `opencode.jsonc`:

```json
{
  "mcpServers": {
    "ctrader": {
      "type": "http",
      "url": "http://127.0.0.1:9876/mcp/"
    }
  }
}
```

## Requisitos
- cTrader Windows/Mac abierto con sesión iniciada
- Settings → MCP Server → Enable
- Permitir trading y confirmaciones según preferencia

## Capacidades
- Trading (órdenes market, limit, stop)
- Cuenta (balance, equity, margen)
- Charts (abrir, navegar, objetos, templates)
- Indicadores técnicos (RSI, MACD, BB, EMA, etc.)
- Plugins, workspaces, alertas de precio

## Diferencia con Remote MCP
El local tiene más capacidades (charts, indicadores, UI) pero requiere cTrader Desktop abierto.
