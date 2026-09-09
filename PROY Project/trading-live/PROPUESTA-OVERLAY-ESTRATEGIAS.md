# Propuesta — overlay de lógica de estrategias en el gráfico de Live

Estado: **v1 construida y pusheada (09 sep 2026)** — selector Ninguno/Time-Based
Entry/Continuation/Last Quarter en Live, marca la vela H1 de referencia de
cada hora operativa de hoy (`tower/src/lib/trading/wsOverlay.ts`). **Todavía
NO marca la entrada/salida real detectada** — eso necesita velas M1 de hoy
(no se traen todavía, ver sección "Qué falta" al final). Las cajas
semitransparentes de zonas (entrada/gestión) tampoco están — se dibujaron
solo las dos rayas horizontales (alto/bajo de la vela de referencia), no un
rectángulo relleno, porque `lightweight-charts` no soporta líneas
verticales/rellenos sin escribir un plugin de canvas propio (evaluado, no
se hizo por tiempo — ver "Qué falta").

Resto de este documento: la propuesta original completa, como referencia.

---

Pedida por Rafa el 09 sep 2026 para
decidir el enfoque antes de construir. Es visualización de la lógica ya
backtesteada (`trading-live/backtest-results/*.md`) — no propone ni ejecuta
operaciones, no toca los guardrails de `CLAUDE.md`.

## Qué pidió Rafa

Poder elegir un modelo WS (Time-Based Entry / Continuation / Last Quarter) y
ver, superpuesto en el gráfico de Live, **para la sesión de hoy únicamente**:
- Líneas verticales en cada hora operativa candidata del modelo (aperturas de
  Londres / London Lunch / NY).
- El high/low de la vela H1 de referencia que ese modelo usa para detectar el
  barrido en cada una de esas horas.

## Selector propuesto

Un tercer grupo de pills, junto a Símbolo y Timeframe, con 4 opciones:
`Ninguno` (default) · `Time-Based Entry` · `Continuation` · `Last Quarter`.
Elegir uno activa el overlay correspondiente; solo uno a la vez.

## Qué dibuja cada modelo (mismas reglas que sus backtests v1)

**Time-Based Entry**
- Vertical punteada en cada apertura candidata de hoy: Londres
  (07:00/08:00 UTC según DST) y NY (12:00/13:00 UTC según DST).
- Por cada una: el high/low de la vela H1 inmediatamente anterior (la
  "referencia") como dos líneas horizontales cortas, acotadas solo al tramo
  de esa hora — no todo el día — para no ensuciar el gráfico.
- Si ya hay barrido+confirmación detectados en los datos de hoy, marcar el
  punto de entrada real (mismo criterio que `backtest-time-based-entry.mjs`).

**Continuation / Last Quarter**
- Verticales en cada apertura horaria de la grilla NY 1am-12pm (más densa que
  Time-Based Entry).
- El nivel de referencia acá no es una vela sino el DOL del día (el mismo
  concepto que ya usa el snapshot de soporte/resistencia) — se reutilizaría
  ese cálculo en vez de duplicarlo.
- Continuation exige que ya haya un Time-Based Entry disparado hoy; Last
  Quarter exige además estar en el último 25% del rango — si no se cumple la
  precondición, el overlay lo indica ("sin precondición hoy") en vez de
  dibujar líneas que no aplican.

## Alcance: solo sesión actual

Las verticales y niveles se calculan y dibujan **solo para las velas de HOY**
(mismo corte de "día" que ya usa el snapshot: calendario NY) — no para todo
el histórico cargado en el gráfico. Si se cambia de día (o de símbolo), el
overlay se recalcula.

## Cómo se implementaría (sin tocar guardrails)

1. Extraer a un módulo compartido la detección de barrido/confirmación que
   ya vive en `scripts/backtest-*.mjs` (hoy duplicada entre los 3 scripts),
   para no reescribir la lógica una tercera vez en el overlay.
2. Ese módulo corre **client-side en Tower**, sobre las velas que ya trae el
   snapshot (`bars_h1`/`bars_h4`) — no hace falta otra llamada al MCP ni otro
   campo en Supabase, es puro cálculo sobre datos que ya están ahí.
3. Se dibuja con la misma técnica que soporte/resistencia: `LineSeries` de
   `lightweight-charts` (verticales = dos puntos con el mismo tiempo, precios
   min/max del rango visible).

## Actualización (09 sep 2026) — cajas en vez de solo líneas

Rafa pidió, además de las verticales, poder marcar **franjas/cajas
semitransparentes** para las zonas que manejan los modelos: zona de posible
entrada, zona de posible salida, etc. — no solo una raya en el momento
exacto, sino el RANGO (de tiempo y/o de precio) donde esa zona aplica.

Técnicamente `lightweight-charts` no tiene una primitiva de "caja" nativa
como `LineSeries`, pero se puede lograr con **una `AreaSeries` o `LineSeries`
de 2 puntos con `fillColor`/relleno semitransparente entre dos niveles de
precio** (alto/bajo de la caja) sobre el rango de tiempo que dure esa zona —
misma técnica de "nace/muere" que ya usan los niveles de soporte/resistencia,
solo que en vez de una raya plana son dos rayas (techo/piso de la caja) con
el área entre ambas rellena a baja opacidad. Ejemplos concretos por modelo:

- **Time-Based Entry**: una caja desde la apertura de la hora candidata hasta
  la confirmación, con el techo/piso siendo el high/low de la vela de
  referencia (la "zona de manipulación" donde se espera el barrido).
- **Continuation/Last Quarter**: una caja más angosta marcando la ventana de
  raid (apertura ±5/+15 min), y otra (opcional) desde la entrada hasta el
  TP/SL marcando la "zona de gestión" del trade.

Esto no cambia la propuesta de fondo (sigue siendo solo visualización, solo
sesión de hoy, mismo módulo compartido de detección) — solo enriquece CÓMO
se dibuja cada zona. Sigue sin construirse.

## Decisiones ya cerradas (09 sep 2026)

- Convive con soporte/resistencia/máximo-mínimo — no los reemplaza. Esos ya
  tienen sus propios checks de "Capas" para apagarlos si satura.
- Es solo visualización, no propone ni ejecuta — confirmado.

## Qué falta (siguiente paso, no construido todavía)

1. **Velas M1 de hoy**: hace falta para detectar el barrido/confirmación real
   y marcar la entrada, no solo la vela de referencia. Requiere una llamada
   MCP nueva en `compute-sentiment.mjs` (solo NAS100/DAX) + guardar
   `bars_m1_today` en `trading_market_snapshot` (migración nueva).
2. **Módulo de detección compartido**: extraer el barrido/confirmación/SL/TP
   de `scripts/backtest-*.mjs` (hoy triplicado) a algo reusable — o portarlo
   directo a TypeScript en `wsOverlay.ts` una vez haya M1.
3. **Cajas rellenas de verdad**: dibujar un rectángulo semitransparente (no
   solo dos rayas horizontales) necesita un plugin/primitive de
   `lightweight-charts` (dibuja directo en canvas) — la librería no lo
   soporta con las series normales. Evaluado, no se hizo por tiempo en esta
   ronda.
