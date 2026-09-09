# Rol en esta carpeta: expert advisor de trading (SMC/ICT/CRT, modelos WS)

Este proyecto es la reconstrucción DELIBERADAMENTE DISTINTA del que vive en
`../trading/` — ese queda congelado como referencia (créditos FIX API a
FxPro, cBots en C#, Binance) pero **no se hereda su código ni su enfoque**.
Aquí el diseño es más simple y más conservador a propósito: solo MCP, sin
FIX API directa, sin cuenta live todavía, confirmación humana obligatoria en
cada operación. Si algo de `../trading/` sirve como referencia puntual
(un indicador, una idea de estrategia), tráelo explícitamente, no por
default.

## Objetivo

Claude Code, corriendo en un VPS Windows dedicado, analiza mercado con
metodología SMC/ICT/CRT (modelos "WS" de WillStreet_fx) y ejecuta operaciones
en cTrader — **no es un bot autónomo**: analiza y propone, Rafa aprueba o
rechaza cada entrada antes de que se ejecute.

## Guardrails no negociables (no se desactivan, no se negocian)

1. **Nunca ejecutar una orden sin confirmación humana explícita** — el flujo
   siempre termina en "propuesta → espera aprobación → recién ahí ejecuta".
2. **Cuenta demo hasta validar el sistema completo** — no pasar a cuenta live
   sin que Rafa lo pida explícitamente después de un período de validación.
3. **TradingView MCP es solo lectura/confirmación visual** — nunca tiene
   permiso de ejecución, nunca autoriza una orden por sí solo.
4. **cTrader MCP es la única fuente de verdad de datos de mercado y la única
   vía de ejecución** — si TradingView y cTrader difieren, manda cTrader.
5. **Ningún cambio a la lógica de entrada corre en vivo (ni en demo) sin
   backtest previo contra datos históricos.**
6. Esto no es asesoría financiera — es una herramienta de apoyo a la
   decisión de Rafa, quien mantiene el control final.

## Confirmación humana — formato acordado

Directo en la terminal del VPS: Claude presenta la propuesta (setup, modelo
que la dispara, entrada/SL/TP, R:R) y espera respuesta explícita en esa misma
sesión antes de llamar a `create_order` (o equivalente) del MCP de cTrader.
No se implementa Telegram/Discord por ahora — si en algún momento Rafa no va
a estar mirando esa terminal, avisar antes de operar así.

## Arquitectura (2 MCP, jerarquía fija)

- **cTrader Desktop MCP** (oficial, local — requiere cTrader Desktop abierto
  en el VPS): datos de cuenta, market data en tiempo real, gestión de
  órdenes/posiciones. Única vía de ejecución real.
- **TradingView Desktop MCP** (no oficial/comunidad, vía remote debugging):
  solo para leer indicadores custom que aún no están migrados a cTrader.
  Sin permisos de ejecución — si un MCP de terceros se rompe (TradingView
  cambia su estructura interna), degradar a "sin confirmación visual extra",
  nunca a "ejecutar sin ella".

Flujo: 1) lee estructura desde cTrader MCP → 2) aplica lógica WS (abajo) →
3) si hay setup válido, confirma visualmente con TradingView MCP → 4)
presenta la propuesta a Rafa → 5) espera aprobación explícita → 6) solo
entonces ejecuta vía cTrader MCP.

## Metodología — modelos WS (SMC/ICT/CRT, WillStreet_fx)

⚠️ Investigado de fuentes secundarias, no verificado contra resultados
auditados — tratar como hipótesis a validar con backtesting, no como verdad
asumida. Conceptos base: R Previa/Pendiente/Reiniciada (estados de rango),
Turtle Soup (barrida de liquidez), CISD (shift de estructura), PO3
(acumulación→manipulación→distribución). CRT no es ICT/SMC oficial — es una
síntesis derivada de Wyckoff, cuidado con fuentes que la venden como
"secreta".

**Decisión de Rafa: los 3 modelos se implementan desde el inicio, en
paralelo** (no se arranca con uno solo):

1. **WS Time-Based Entry**: entra en horas específicas de apertura de vela,
   condicionado a un raid HTF previo, sin failure swing al cierre de la hora
   anterior, confirmado con Turtle Soup.
2. **WS Continuation**: se suma a un movimiento ya iniciado — raid en
   timeframe menor de la vela anterior, dentro del PO3 de la vela nueva.
3. **WS Last Quarter**: opera el último cuadrante cuando el precio falla en
   completar el draw on liquidity de HTF. Target conservador 1R-2R, salida
   rápida al cumplir objetivo.

Filosofía general: operar primer y último cuadrante del movimiento, evitar
entradas en zona media/retroceso.

## Gestión de riesgo — definido parcialmente con Rafa (09 sep 2026)

- [x] **Riesgo máximo por operación**: % de la cuenta, pero el VALOR queda
      abierto/configurable — no hay un número fijo decidido. Implementar
      como parámetro (ej. variable de entorno o config), no hardcodear un
      porcentaje. Rafa decide el valor concreto más adelante o lo ajusta
      caso a caso.
- [x] **Tamaño de posición**: **fijo en lotes**, no calculado según distancia
      al SL — mismo tamaño siempre, el riesgo en $ varía por operación según
      dónde quede el SL.
- [x] **Ratio mínimo R:R**: **sin piso fijo** — se le presenta el setup a
      Rafa igual aunque el R:R sea bajo, y él decide caso a caso en el
      momento de la confirmación humana. No filtrar señales por R:R antes
      de proponerlas.
- [x] **Pares/instrumentos habilitados** (09 sep 2026): se proponen entradas
      **solo en NAS100 (`#USNDAQ100`) y DAX** — son los únicos instrumentos
      donde los modelos WS pueden generar una señal accionable. Como
      **análisis de apoyo/contexto** (confluencia, correlación, no para
      proponer entradas) se incluyen además **los majors de forex, NYSE y
      Dow Jones (US30)**. El dashboard de sentimiento ya cubre NAS100/SPX500
      (≈NYSE)/US30/DAX/BTC/EURUSD — si Rafa quiere cobertura de forex más
      allá de EURUSD (resto de majors) como apoyo, eso es una extensión
      pendiente de `compute-sentiment.mjs`, no hecha todavía.
- [ ] Riesgo máximo diario/semanal (circuit breaker) — sigue sin definir.
- [ ] Sesiones horarias habilitadas (Londres/NY/Asia — central para los
      modelos WS, no opcional) — sigue sin definir.
- [ ] Máximo de operaciones simultáneas — sigue sin definir.

## Pendiente de definir (no asumir)

- Qué indicadores exactos de TradingView no están migrados a cTrader (¿R
  Previa/Pendiente/Reiniciada, marcadores de Turtle Soup/CISD, otros?).
- Si se lleva un log de cada señal detectada + decisión (aprobada/rechazada/
  resultado) para auditar y mejorar — recomendado, pero confirmar con Rafa
  el formato antes de implementarlo.

## Próximos pasos técnicos (orden sugerido)

1. ✅ Configurar y verificar conexión al MCP local de cTrader — hecho
   (09 sep 2026): `get_balance` funciona, cuenta demo FxPro confirmada.
2. Configurar y verificar conexión al MCP de TradingView elegido — sigue
   pendiente, sin arrancar (Fase 2b, ver `SETUP-VPS.md`).
3. ✅ Implementar la lógica de los 3 modelos contra datos históricos
   (backtesting) — hecho, v1 de los 3 modelos corridos con datos reales
   del MCP (ver `backtest-results/*.md` y sección de abajo).
4. Codear el flujo de confirmación humana en terminal antes de cualquier
   llamada de ejecución real — sigue pendiente.
5. Recién ahí conectar la ejecución real contra la cuenta demo — sigue
   pendiente.

## Estado actual (09 sep 2026) — qué se hizo en la última sesión

- **Backtests v1 de los 3 modelos WS**, con datos reales de `#USNDAQ100`
  (27 días, MCP de cTrader), scripts en `scripts/backtest-*.mjs`:
  - Time-Based Entry: 23 señales, 43.5% win rate, +0.16R promedio.
  - Continuation: 32 señales, 37.5% win rate, +0.13R promedio.
  - Last Quarter: solo 2 señales (n muy chica, no concluyente), -1R promedio.
  - Edge débil en los 3 — cada `.md` de resultado tiene su sección
    "Decisiones propias" con los supuestos que hice por ambigüedad de la
    regla. **Confirmado con Rafa (09 sep 2026): los horarios de
    Continuation/Last Quarter son SIEMPRE hora de Nueva York** — no hace
    falta rehacer esos backtests por este motivo.
- **`compute-sentiment.mjs`** (nuevo): calcula un score de sentimiento
  -1..+1 (medias móviles + osciladores + una heurística propia de
  estructura SMC/ICT) para 6 símbolos (NAS100/SPX500/US30/DAX/BTC/EURUSD)
  en H4 y D1, y lo escribe a Supabase de Tower (`trading_sentiment`). Es
  DISTINTO de los 3 modelos WS — es un indicador de contexto tipo
  TradingView Technical Rating, no un modelo de entrada.
- **`sentiment-watcher.mjs`** (nuevo): proceso de larga duración que vigila
  pedidos de refresh desde Tower (tabla `trading_sentiment_refresh`) y
  corre `compute-sentiment.mjs` cuando hay uno, más un auto-refresh cada
  30 min. Probado end-to-end y funciona, pero **no quedó registrado en el
  Programador de tareas de Windows** — hoy hay que arrancarlo a mano
  (`node scripts/sentiment-watcher.mjs`) para que el botón "Actualizar" de
  Tower tenga efecto. Formalizar eso (Task Scheduler) quedó pendiente.
- **Tower ya tiene una sección de Trading real**, ver "Conexión con Tower"
  abajo — esto es aparte del pipeline de setups/posiciones en vivo descrito
  arriba, que sigue sin arrancar (pasos 2/4/5 de la lista de arriba).

## Conexión con Tower

**Parcialmente hecho** (09 sep 2026) — dos cosas separadas:

1. **Contenido de referencia** (`trading_glossary`, `trading_strategies`,
   `trading_backtests`, migraciones `0005`/`0006`/`0007` en
   `tower/supabase/migrations/`): glosario SMC/ICT/CRT/WS, los 3 modelos
   documentados con diagrama de flujo (`@xyflow/react`), y los resultados
   de los backtests de arriba — todo visible en Tower, pestaña Trading.
2. **Sentimiento de mercado** (`trading_sentiment` + `trading_sentiment_refresh`):
   descrito en la sección de arriba — visible en Tower (pestaña Sentimiento
   + card en Home), con botón "Actualizar" real.

**Todavía NO está hecho:** lo que describía este párrafo originalmente —
`trading_setups`/`trading_positions` (schema ya existe desde antes, migración
`0004` en Tower) siguen vacíos, porque el pipeline de análisis+confirmación
humana (pasos 2/4/5 de arriba) no arrancó. Eso es lo que haría que el P&L
real de trading empiece a aparecer en Tower y sea consultable desde el
asesor financiero (`PROY Project/FINANZAS/CLAUDE.md`).
