# Fase 2 — puesta en marcha (checklist para Rafa)

Esto no lo puedo hacer yo: requiere abrir una app de escritorio (cTrader) y,
si corre en el VPS, esa máquina física. Lo dejo como checklist para que lo
hagas cuando tengas el VPS a mano (o en este mismo PC, si decides arrancar
aquí antes de mudarlo al VPS — dímelo y ajusto la ruta).

## 1. Máquina donde corre esto

`.mcp.json` (ya creado en esta carpeta) apunta a `http://127.0.0.1:9876/mcp/`
— **loopback, no remoto**: Claude Code y cTrader Desktop tienen que estar en
la MISMA máquina. Confírmame: ¿arrancamos ya en este PC, o esperamos a tener
el VPS listo?

## 2. cTrader Desktop

1. Abrir cTrader Desktop, iniciar sesión en la **cuenta demo** (no la live).
2. `Settings → MCP Server → Enable`.
3. Permitir trading y confirmaciones según prefieras en esa pantalla (el
   guardrail real de "no ejecutar sin tu aprobación" lo maneja la lógica de
   `trading-live/CLAUDE.md`, no depende de este ajuste de cTrader).

## 3. Verificar la conexión

Con Claude Code abierto DENTRO de esta carpeta (`trading-live/`, para que
cargue `.mcp.json` y `CLAUDE.md`), pídeme algo simple para confirmar que ve
el MCP, por ejemplo "muéstrame el balance de la cuenta demo" — debería
aparecer una tool `mcp__ctrader__*` disponible. Si no aparece, cerrar y
reabrir la sesión de Claude Code suele bastar (no hace falta reiniciar
cTrader).

## 4. TradingView MCP — Fase 2b, no ahora

El documento original menciona un segundo MCP (no oficial, vía
`tradingview-mcp-server`) para leer indicadores custom que no están en
cTrader. No lo agregué a `.mcp.json` todavía porque sigue sin resolverse
**cuáles indicadores exactos** hacen falta (sección 7 del documento de
trading) — agregarlo ahora sería adivinar. Cuando lo tengas claro, aviso y lo
sumo.

## 5. Después de conectar

Con el MCP respondiendo, el siguiente paso real (ver `CLAUDE.md`, "Próximos
pasos técnicos") es backtesting de los 3 modelos WS contra datos históricos
— y antes de eso, definir contigo los valores de gestión de riesgo (sección
6, siguen pendientes: riesgo por operación, riesgo diario/semanal, tamaño de
posición, pares habilitados, sesiones horarias, máximo de operaciones
simultáneas, R:R mínimo).
