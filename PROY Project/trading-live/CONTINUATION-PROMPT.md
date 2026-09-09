# Prompt de continuación — Trading + Tower (generado 09 sep 2026)

Copiá y pegá todo lo que sigue como primer mensaje en una sesión nueva de Claude Code.

---

Sos Claude Code trabajando para Rafael Herrera (Rafa) en su monorepo personal
"PROY". Este mensaje es continuación directa de una sesión anterior — leé los
archivos que te indico abajo ANTES de hacer cualquier cosa, no asumas nada
del contenido por el resumen que sigue, son solo punteros.

## Dónde estás parado

- **Raíz del monorepo:** `C:\Users\ilbici\OneDrive - ilbici.godaddylogin.com\PROY\PROY Project\`
  (nota el espacio en "OneDrive - ilbici..." y en "PROY Project" — hay que
  citar la ruta entre comillas en shell).
- **Máquina:** esta sesión corre en el VPS Windows Server 2019 donde vive
  cTrader Desktop (`http://127.0.0.1:9876/mcp/`, local, requiere cTrader
  Desktop abierto). Verificalo con `Get-Process` o similar si algo del MCP
  falla — cTrader Desktop se puede haber cerrado.
- **Carpetas relevantes para esto**, todas dentro de la raíz de arriba:
  - `trading-live/` — el proyecto de trading activo (modelos WS, backtests,
    scripts). `trading/` (sin "-live") es una versión VIEJA, congelada,
    NO se hereda su código — leé `trading-live/CLAUDE.md` primero, ahí
    explica por qué.
  - `tower/` — app Next.js/Supabase/Vercel de Rafa (su dashboard personal),
    con secciones de Estudios, Finanzas, Calendario, Deporte, y ahora
    Trading. Repo git propio (`github.com/rrhb0911/tower`), deploy
    automático a Vercel (team `rrhb`) en cada push a `main`.
  - `trading/` — la versión vieja/congelada (cTrader FIX API, cBots C#,
    Binance) — solo mirar si hace falta una referencia puntual, nunca copiar
    por default.

## Archivos a leer, en este orden, antes de tocar nada

1. `trading-live/CLAUDE.md` — el documento vivo del proyecto de trading:
   objetivo, guardrails NO NEGOCIABLES (nunca ejecutar sin confirmación
   humana, cuenta demo hasta que Rafa diga lo contrario, etc.), los 3
   modelos WS, y una sección **"Estado actual (09 sep 2026)"** al final que
   resume exactamente qué se hizo en la sesión anterior — léela entera.
2. `trading-live/scripts/` — mirá qué scripts existen ya
   (`backtest-time-based-entry.mjs`, `backtest-continuation.mjs`,
   `backtest-last-quarter.mjs`, `compute-sentiment.mjs`,
   `sentiment-watcher.mjs`, `ctrader-client.mjs`, `dst.mjs`) antes de
   escribir nada nuevo — es muy probable que lo que necesitás ya exista o
   se pueda extender.
3. `trading-live/backtest-results/*.md` — resultados reales de los 3
   backtests, con sus "Decisiones propias" (supuestos que se hicieron por
   ambigüedad de la regla original — revisalos con Rafa si vas a tocar la
   lógica de los modelos).
4. `tower/CLAUDE.md` → apunta a `tower/AGENTS.md`, que es autogenerado por
   `next dev` (reglas de Next.js) — no es documentación de proyecto, es
   normal que esté casi vacío.
5. `PROY Project/TOWER-MIGRACION.md` — spec de cómo se armó Tower
   (Next.js/Supabase/Vercel, team `rrhb`), incluye la regla **"hablale a
   Rafa siempre de 'tú', nunca de 'vos'"**.
6. `tower/supabase/migrations/` — TODAS las migraciones son el historial
   real del schema. Las últimas 3 (`0005_trading_content.sql`,
   `0006_trading_sentiment.sql`, `0007_trading_sentiment_refresh.sql`) son
   de esta sesión. Mismo patrón en todas: RLS con policy "solo rafa"
   (`auth.jwt() ->> 'email' = 'rrhb0911@gmail.com'`).
7. `tower/.env.local` — credenciales de Supabase (URL, anon key,
   service_role key) que usan tanto Tower como los scripts de
   `trading-live/scripts/` (leen este mismo archivo cruzado, ver el header
   de `compute-sentiment.mjs` para el patrón).

## Qué existe hoy (no lo reconstruyas, extendelo)

**Backtests (trading-live/scripts/):** los 3 modelos WS (Time-Based Entry,
Continuation, Last Quarter) tienen v1 backtesteada con datos reales del MCP
de cTrader. Resultados débiles (edge chico, Last Quarter con muestra
insuficiente). Antes de tocar la lógica, leé las "Decisiones propias" de
cada reporte — hay ambigüedades de la regla original sin resolver con Rafa
(la más importante: zona horaria de Continuation/Last Quarter).

**Tower — sección Trading (`tower/src/components/views/Trading.tsx`):**
5 pestañas: Live (setups/posiciones — sigue vacío, el pipeline de
confirmación humana no arrancó), Sentimiento (dashboard nuevo, ver abajo),
Estrategias (los 3 modelos con diagrama de flujo `@xyflow/react`),
Terminología (glosario SMC/ICT/CRT), Resultados (backtests de arriba).
Todo el contenido de referencia vive en Supabase (`trading_glossary`,
`trading_strategies`, `trading_backtests`), sembrado con
`tower/scripts/seed-trading-content.mjs`.

**Sentimiento de mercado (lo más nuevo):** score -1..+1 (medias móviles +
osciladores + heurística propia de estructura SMC/ICT) para 6 símbolos
(NAS100/SPX500/US30/DAX/BTC/EURUSD) en H4 y D1. Diseño visual (gauge tipo
"pin neón" sobre barra de 5 zonas) fue iterado en un canvas de Claude
Design antes de construirse — el canvas sigue existiendo si necesitás
referencia visual, pero el código real ya está en:
- `trading-live/scripts/compute-sentiment.mjs` — calcula y escribe a
  Supabase (`trading_sentiment`). Exporta `runOnce()`.
- `trading-live/scripts/sentiment-watcher.mjs` — proceso de larga duración
  que vigila pedidos de refresh (`trading_sentiment_refresh`, tabla cola de
  1 fila) desde Tower + auto-refresh cada 30 min. **Probado y funciona,
  pero NO está registrado en el Programador de tareas de Windows — hoy
  hay que arrancarlo a mano.** Si Rafa pide dejarlo persistente, esa es la
  tarea: un `.bat` + tarea programada de Windows que lo arranque al iniciar
  el VPS y lo reinicie si se cae.
- `tower/src/components/trading/SentimentPanel.tsx` (dashboard completo,
  con selector de símbolo/timeframe y botón "Actualizar") y
  `SentimentHomeCard.tsx` (card compacta en Home).

**Deploy:** todo lo de arriba de Tower ya está commiteado y pusheado a
`main`, deployado en producción (Vercel, team `rrhb`). Los cambios de
`trading-live/` (scripts) NO se pushean a ningún lado — esa carpeta no
tiene remoto configurado según lo que se vio, confirmá antes de asumir.

## Guardrails que se mantienen SIEMPRE (no son negociables, ver trading-live/CLAUDE.md completo)

1. Nunca ejecutar una orden real sin confirmación humana explícita de Rafa.
2. Cuenta demo hasta que Rafa pida explícitamente pasar a live.
3. Ningún cambio a lógica de entrada corre en vivo (ni demo) sin backtest
   previo.
4. Esto no es asesoría financiera.
5. Cualquier ambigüedad en las reglas de trading se documenta como
   "decisión propia" y se pregunta a Rafa antes de asumir en silencio — es
   el estilo de todo este proyecto, no te lo saltees.

## Pendientes conocidos (no es una lista completa, revisá el "Estado actual" de trading-live/CLAUDE.md)

- Registrar `sentiment-watcher.mjs` en Task Scheduler de Windows.
- MCP de TradingView (Fase 2b) — nunca arrancó.
- Definir gestión de riesgo con Rafa (sección completa en
  `trading-live/CLAUDE.md`, todo sin definir).
- Flujo de confirmación humana en terminal antes de cualquier ejecución
  real — no está codeado.
- El Grupo C (estructura SMC/ICT) del score de sentimiento es una
  heurística simplificada mía, documentada al final de
  `compute-sentiment.mjs` — no reusa la lógica real de los 3 modelos WS
  backtesteados, es más simple a propósito.

Antes de arrancar a construir algo nuevo, preguntale a Rafa qué necesita
específicamente — este documento es contexto, no una lista de tareas a
ejecutar en orden.
