# Backtest — Time-Based Entry / CRT v1 (`#USNDAQ100`)

Generado: 2026-09-07T21:06:37.266Z

## Rango de datos real disponible
H1: 2026-08-09T22:00:00Z → 2026-09-07T16:00:00Z (479 velas)

No es un rango elegido de antemano — es lo que el MCP de cTrader realmente devolvió al pedir los últimos 30 días desde hoy.

## Resultado agregado
- Sesiones analizadas (Londres + NY, un intento por día calendario cubierto por los datos): **52**
- Señales detectadas (barrido + confirmación completos): **23**
- Win rate: **43.5%**
- R promedio: **0.16**
- Ganadoras / perdedoras: 10 / 13

### Desglose de por qué NO hubo señal (la mayoría de sesiones)
- `sin_datos_h1`: 10
- `setup`: 23
- `sin_confirmacion`: 16
- `sin_barrido`: 3

## Ejemplos concretos de setups detectados

### 1. Londres · 2026-08-10 · LONG
- Vela H1 de referencia: 2026-08-10T06:00:00Z (high 29863.15, low 29807.65)
- Barrido: 2026-08-10T07:02:00Z
- Confirmación (rechazo_mecha): 2026-08-10T07:02:00Z
- Entry: 29809.65 · SL: 29804.76 · TP: 29824.33 (objetivo 3.00R, nivel H4)
- Salida: 29804.76 el 2026-08-10T07:10:00Z (motivo: sl)
- Resultado: **-1R**


### 2. Londres · 2026-08-11 · LONG
- Vela H1 de referencia: 2026-08-11T06:00:00Z (high 29730.9, low 29636.4)
- Barrido: 2026-08-11T07:23:00Z
- Confirmación (rechazo_mecha): 2026-08-11T07:23:00Z
- Entry: 29640.9 · SL: 29632.23 · TP: 29662.70 (objetivo 2.51R, nivel H4)
- Salida: 29662.70 el 2026-08-11T07:27:00Z (motivo: tp)
- Resultado: **+2.515R**


### 3. NY · 2026-08-12 · SHORT
- Vela H1 de referencia: 2026-08-12T11:00:00Z (high 29755.6, low 29715.1)
- Barrido: 2026-08-12T12:00:00Z
- Confirmación (rechazo_mecha): 2026-08-12T12:00:00Z
- Entry: 29754.85 · SL: 29757.33 · TP: 29747.41 (objetivo 3.00R, nivel H4)
- Salida: 29757.33 el 2026-08-12T12:01:00Z (motivo: sl)
- Resultado: **-1R**


### 4. NY · 2026-08-13 · LONG
- Vela H1 de referencia: 2026-08-13T11:00:00Z (high 29804.4, low 29765.75)
- Barrido: 2026-08-13T12:01:00Z
- Confirmación (cambio_caracter): 2026-08-13T13:00:00Z
- Entry: 29799.4 · SL: 29760.18 · TP: 29879.35 (objetivo 2.04R, nivel H4)
- Salida: 29819.65 el 2026-08-13T13:29:00Z (motivo: tiempo_90min)
- Resultado: **+0.516R**


### 5. NY · 2026-08-14 · SHORT
- Vela H1 de referencia: 2026-08-14T11:00:00Z (high 30177.2, low 30147.2)
- Barrido: 2026-08-14T12:00:00Z
- Confirmación (rechazo_mecha): 2026-08-14T12:00:00Z
- Entry: 30174.2 · SL: 30178.38 · TP: 30161.67 (objetivo 3.00R, nivel H4)
- Salida: 30178.38 el 2026-08-14T12:02:00Z (motivo: sl)
- Resultado: **-1R**


## Decisiones propias (por ambigüedad remanente en la regla — no asumidas en silencio)
1. **ATR**: se usó ATR(14) simple en M1 (no especificado en la regla original).
2. **Definición de "swing" M1** para el cambio de carácter: fractal de 1 vela a cada lado. Para swings H4/D1 (niveles DOL): fractal de 2 velas a cada lado (más exigente, para no tomar micro-máximos como niveles institucionales).
3. **"Rechazo de mecha limpio"**: se interpretó como que la misma vela del barrido cierra de vuelta al menos 50% del rango de su propia mecha, y el cierre queda del lado correcto del rango H1 de referencia. Si no se cumple, se buscó el "cambio de carácter" clásico (ruptura de swing M1 previo) como confirmación alternativa.
4. **Barrido ambiguo**: si la MISMA vela M1 rompe high Y low del rango de referencia, la sesión se descartó por no poder determinar cuál lado se barrió primero (columna `descartado_ambiguo` arriba).
5. **SL y TP en la misma vela**: si una vela toca ambos niveles, se asumió conservadoramente que el SL se ejecuta primero.
6. **DOL**: se buscó primero en swings H4; solo si ninguno rinde ≥2R se probó en D1, tal como pide la regla.

## Qué NO se hizo
- No se llamó ninguna tool de ejecución de órdenes del MCP de cTrader.
- No se escribió nada a `trading_setups`/`trading_positions` de Supabase — esto es histórico, para revisión antes de conectar nada en vivo.
