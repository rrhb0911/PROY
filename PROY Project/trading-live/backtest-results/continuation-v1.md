# Backtest — WS Continuation v1 (`#USNDAQ100`)

Generado: 2026-09-09T03:23:07.282Z

## Rango de datos real disponible
H1: 2026-08-10T04:00:00Z → 2026-09-09T02:00:00Z (501 velas)

## Resultado agregado
- Días analizados: **27**
- Señales de Continuation detectadas (excluye la entrada inicial de Time-Based Entry): **32**
- Win rate: **37.5%**
- R promedio: **0.13**
- Ganadoras / perdedoras: 12 / 20

## Ejemplos concretos

### 1. 2026-08-10 · hora NY 2:00 · SHORT
- Vela H1 de referencia: 2026-08-10T05:00:00Z (high 29831.65, low 29782.15)
- Raid: 2026-08-10T06:00:00Z
- Entry: 29835.9 · SL: 29838.11 · TP: 29831.47 (objetivo 2.00R, nivel H4)
- Salida: 29838.11 el 2026-08-10T06:01:00Z (motivo: sl)
- Resultado: **-1R**


### 2. 2026-08-10 · hora NY 5:00 · SHORT
- Vela H1 de referencia: 2026-08-10T08:00:00Z (high 29882.4, low 29841.4)
- Raid: 2026-08-10T09:11:00Z
- Entry: 29880.15 · SL: 29887.41 · TP: 29865.64 (objetivo 2.00R, nivel H4)
- Salida: 29865.64 el 2026-08-10T09:19:00Z (motivo: tp)
- Resultado: **+2R**


### 3. 2026-08-11 · hora NY 2:00 · LONG
- Vela H1 de referencia: 2026-08-11T05:00:00Z (high 29757.9, low 29692.65)
- Raid: 2026-08-11T06:00:00Z
- Entry: 29694.65 · SL: 29688.71 · TP: 29706.52 (objetivo 2.00R, nivel H4)
- Salida: 29706.52 el 2026-08-11T06:01:00Z (motivo: tp)
- Resultado: **+2R**


### 4. 2026-08-13 · hora NY 7:00 · SHORT
- Vela H1 de referencia: 2026-08-13T10:00:00Z (high 29794.9, low 29772.9)
- Raid: 2026-08-13T11:00:00Z
- Entry: 29798.9 · SL: 29801.26 · TP: 29794.17 (objetivo 2.00R, nivel H4)
- Salida: 29801.26 el 2026-08-13T11:01:00Z (motivo: sl_y_tp_misma_vela_asume_sl)
- Resultado: **-1R**


### 5. 2026-08-13 · hora NY 9:00 · SHORT
- Vela H1 de referencia: 2026-08-13T12:00:00Z (high 29795.5, low 29722.9)
- Raid: 2026-08-13T13:00:00Z
- Entry: 29799.4 · SL: 29805.59 · TP: 29787.03 (objetivo 2.00R, nivel H4)
- Salida: 29805.59 el 2026-08-13T13:02:00Z (motivo: sl)
- Resultado: **-1R**


## Decisiones propias (interpretación de la regla que dio Rafa el 2026-09-08 — no asumidas en silencio)
1. **Zona horaria de sesión**: se interpretaron los horarios (1am-5am Londres, 5am-9am London Lunch, 9am-1pm NY) como **hora local de Nueva York** (America/New_York, DST-aware vía `isUsDst`) — convención estándar ICT/SMC. **Confirmado por Rafa el 09 sep 2026: siempre hora de Nueva York.**
2. **Ventana de raid unificada**: el "raid en los primeros 15 min de la vela nueva" y el "Failure Swing en los últimos 5 min de la vela anterior" se implementaron como una sola ventana continua [apertura-5min, apertura+15min] en vez de dos rutas de detección separadas.
3. **Buffer de SL**: ATR14(M1) × 0.4 (vs 0.1 del Time-Based Entry) — "más holgado" no vino con un número, este multiplicador es una elección propia a validar/ajustar.
4. **TP de continuation = mismo DOL del movimiento del día**, no un nuevo nivel HTF más cercano por hora — se interpretó "sumarse al movimiento" como perseguir el mismo objetivo original, acotado a 1R-2R.
5. **"Día"**: se usó el calendario UTC de las velas H1 devueltas por el MCP como agrupador de días, no el calendario de Nueva York — puede generar un desfasaje de hasta unas horas en el límite del día.
6. **Salida por tiempo**: se implementó como "la vela H1 inmediatamente anterior a la hora candidata hace un extremo adverso respecto a la vela H1 anterior a ESA" — es una lectura de la frase de Rafa, no una cita textual de una regla ya codificada.
7. **Fin de ventana del día**: si queda una posición abierta al llegar a la última hora candidata (12pm NY) sin TP/SL/salida por tiempo, se cierra técnicamente al último precio M1 disponible (`fin_ventana_dia`) — esto es un cierre de backtest, no una regla de Rafa.

## Qué NO se hizo
- No se llamó ninguna tool de ejecución de órdenes del MCP de cTrader.
- No se escribió nada a Supabase — esto es histórico, para revisión antes de conectar nada en vivo.
