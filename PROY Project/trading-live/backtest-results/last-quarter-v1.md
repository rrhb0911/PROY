# Backtest — WS Last Quarter v1 (`#USNDAQ100`)

Generado: 2026-09-09T03:23:15.210Z

## Rango de datos real disponible
H1: 2026-08-10T04:00:00Z → 2026-09-09T02:00:00Z (501 velas)

## Resultado agregado
- Días analizados: **27**
- Señales de Last Quarter detectadas: **2**
- Win rate: **0.0%**
- R promedio: **-1.00**
- Ganadoras / perdedoras: 0 / 2

## Ejemplos concretos

### 1. 2026-08-25 · hora NY 5:00 · SHORT
- Vela H1 de referencia: 2026-08-25T08:00:00Z (high 29265.7, low 29154.2)
- Raid: 2026-08-25T09:07:00Z
- Entry: 29270.95 · SL: 29281.79 · TP: 29153.20 (objetivo 10.86R exacto al DOL, nivel H4)
- Salida: 29281.79 el 2026-08-25T09:34:00Z (motivo: sl)
- Resultado: **-1R**


### 2. 2026-09-04 · hora NY 12:00 · SHORT
- Vela H1 de referencia: 2026-09-04T15:00:00Z (high 29514.02, low 29450.15)
- Raid: 2026-09-04T16:12:00Z
- Entry: 29514.9 · SL: 29523.56 · TP: 29440.45 (objetivo 8.593R exacto al DOL, nivel H4)
- Salida: 29523.56 el 2026-09-04T16:20:00Z (motivo: sl)
- Resultado: **-1R**


## Decisiones propias (interpretación de la regla que dio Rafa el 2026-09-08 — no asumidas en silencio)
1. **Zona horaria y ventana de raid**: mismas decisiones que WS Continuation (hora de Nueva York DST-aware, ventana unificada [apertura-5min, apertura+15min]) — ver `continuation-v1.md` puntos 1-2. **Zona horaria confirmada por Rafa el 09 sep 2026: siempre hora de Nueva York.**
2. **"Último cuadrante"**: se definió como el 25% del rango total (origen del movimiento → DOL) más cercano al DOL, midiendo en precio, no en tiempo.
3. **Origen del rango**: precio de entrada de la señal inicial del día (el mismo mecanismo de Time-Based Entry usado para fijar dirección en WS Continuation), no un swing HTF explícito.
4. **"Falla en completar el DOL"**: se interpretó únicamente como que la vela H1 anterior entró en la zona del último cuadrante sin tocar el DOL — no se exigió una confirmación explícita de "rechazo" en esa vela; el propio patrón PO3 de la hora candidata (raid + reversión) se tomó como la evidencia del fallo/retroceso.
5. **Buffer de SL**: ATR14(M1) × 0.8 — el más holgado de los 3 modelos, valor propio no dado por Rafa. Sin piso de R mínimo en el TP (se acepta cualquier R positivo, por bajo que sea).
6. **DOL del día**: se calcula una sola vez con la señal inicial (`minRR: 0`, cualquier distancia positiva sirve) y se reutiliza para todo el día — mismo criterio que en WS Continuation.
7. **Salida por tiempo y cierre de ventana del día**: mismas reglas técnicas que WS Continuation (no vienen de la especificación de Rafa, son cierre de backtest).

## Qué NO se hizo
- No se llamó ninguna tool de ejecución de órdenes del MCP de cTrader.
- No se escribió nada a Supabase — esto es histórico, para revisión antes de conectar nada en vivo.
