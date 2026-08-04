# Surf — Trailing + Hedge Freeze [RRHB]

Método de gestión de posición propuesto por el usuario (2026-08-03). A diferencia de `ST 4H + EMA 200 + Fib [RRHB].md` y `RSI & Volumen [RRHB].md`, **esto no es un Pine Script** — es un método discrecional de gestión de la operación, documentado en texto para poder ejecutarlo manualmente en cTrader y, más adelante, evaluar si conviene semi-automatizarlo.

## Idea central

"Surfear" la tendencia estando casi siempre con posición abierta, sin usar un stop loss que saque del mercado:

1. **A favor de la tendencia:** no se cierra con un take profit fijo — se corre el Stop Loss detrás del precio (trailing), dejando correr la ganancia mientras dure el movimiento.
2. **En contra de la tendencia:** en vez de un stop loss que cierre la posición, se abre una posición opuesta del mismo tamaño ("congelar" / hedge lock). El neto queda plano — no se gana ni se pierde más mientras el precio se mueve, porque una pata compensa a la otra.
3. **Cuando el mercado define dirección de nuevo:** se cierra la pata que quedó en contra de esa nueva dirección, y se sigue con la que va a favor, volviendo a correrle el trailing.
4. En la práctica, casi nunca se está flat — siempre hay al menos una posición abierta (o dos, congeladas, cuando el mercado está indeciso). La salida real solo se da en el cierre del mercado (fin de sesión/fin de semana), o queda congelada si el mercado cierra justo en ese estado.

## Punto crítico: el criterio de "descongelar"

Es la única decisión de todo el método que no es mecánica — de ahí depende el resultado completo. El usuario lo definió como discrecional: "me basaría en las tendencias de lo que se ve en TradingView y a la vez en la acción del precio" (no una regla fija programable).

### Checklist propuesto para tomar esa decisión de forma más consistente

1. **Marcar el rango del congelamiento** apenas se abre la pata contraria: el máximo y el mínimo del precio desde ese momento en adelante.
2. **Continuación confirmada** (cerrar la pata que quedó a favor de la tendencia vieja, dejar correr la nueva): el precio rompe **más allá** de ese rango en la dirección de la pata nueva — con cierre de vela ahí, no solo un toque intrabar.
3. **Falsa alarma confirmada** (cerrar la pata nueva, volver a la original): el precio rompe de vuelta el extremo opuesto del rango.
4. Si el precio se queda **dentro** del rango sin romper ningún lado, seguir congelado — no forzar una decisión todavía.
5. **Time-stop de seguridad:** si lleva demasiadas velas sin romper ningún lado, reconsiderar manualmente en vez de dejarlo indefinido. (Referencia exploratoria en H4: la duración mediana de un "congelamiento" en el backtest aproximado rondó 10-14 velas — ver sección de hallazgos abajo.)

**Por qué esto importa más de lo que parece:** en una simulación exploratoria (ver abajo) se usó como sustituto el propio flip del indicador SuperTrend para decidir cuándo descongelar. Con un indicador binario (solo dos estados: arriba/abajo), esa aproximación **únicamente puede detectar "fue una falsa alarma, volvé a la dirección original"** — nunca puede confirmar una reversión real, porque para eso el indicador tendría que "reflipear" dos veces seguidas hacia el mismo lado nuevo, cosa que un estado binario no permite. Ese mismo punto ciego aplica en vivo si el criterio discrecional termina siendo, en la práctica, "espero a que el indicador/tendencia vuelva a marcar como antes" — por eso el checklist prioriza **ruptura de estructura de precio**, no solo la lectura del indicador.

## Riesgos identificados (antes de operar en real)

1. **Congelar no elimina el riesgo, lo pospone.** El riesgo de la pata original sigue latente — la sensación de "estoy protegido" mientras está congelado es parcial: estás plano en P&L, no en riesgo de decisión.
2. **Todo el resultado depende de un único momento discrecional** (cuál pata cerrar y cuándo) — no es reproducible de forma idéntica entre una operación y la siguiente, a diferencia de un sistema con stop fijo.
3. **Exposición casi permanente al mercado:** gaps de fin de semana, noticias, swap corriendo en ambas patas mientras está congelado, y uso de margen en las dos posiciones aunque el neto sea cero.
   - **Pendiente de confirmar con FxPro:** cómo calculan el margen en cuenta Hedged cuando hay dos posiciones opuestas abiertas en el mismo símbolo — si no lo netean, puede consumir margen libre en momentos de mucha volatilidad.
4. **Congelamientos en cascada:** si el mercado queda lateral/picado (varios flips seguidos antes de definir), en teoría se podría terminar abriendo una tercera posición al descongelar y volver a congelar rápido. Falta una regla explícita para este caso.
5. Cuenta confirmada en modo **Hedged** (FxPro, login 8176757) — no hay impedimento técnico de la plataforma para tener las dos patas abiertas simultáneamente.

## Hallazgos de una simulación exploratoria (H4, NAS100, oct 2025 – ago 2026)

**Importante:** esta simulación usó el flip del SuperTrend como proxy del criterio discrecional, con la limitación descrita arriba (solo detecta falsas alarmas, no reversiones reales). No es una medición válida de "qué tan exitoso sería el método tal como lo describe el usuario" — se incluye solo como referencia de orden de magnitud, no como base para decidir.

- Congelar mejoró el resultado frente a "cerrar y revertir sin congelar" en H4 y Diario (en H4 con multiplicador 0.5, el que ya usa el usuario: +3,206 pts vs +2,694 pts cerrando y revirtiendo, con drawdown de -1,906 pts sobre 43 congelamientos).
- En H1 el resultado fue negativo en todos los multiplicadores probados — el ruido intradía de NAS100 es demasiado alto para este enfoque en ese timeframe.
- Con la lógica de flip binario, el sistema cerró la pata "hedge" en el 100% de los casos observados (nunca cerró la pata original) — consistente con el punto ciego explicado arriba, no con que el mercado nunca haya revertido de verdad en ese período.

**Pendiente:** si se quiere una medición más fiel, habría que rehacer la simulación con la lógica de ruptura de estructura del checklist (no con el flip del indicador) — no se hizo todavía a pedido del usuario.

## Estado y próximos pasos

- [ ] Confirmar con FxPro cómo se calcula el margen en hedge para este símbolo/cuenta.
- [ ] Definir la regla explícita para congelamientos en cascada (¿se permite una tercera pata? ¿se cierra todo y se reinicia?).
- [ ] Operar en cuenta demo antes de real, aplicando el checklist de descongelamiento tal cual está escrito arriba, y anotar cada decisión para revisar consistencia.
- [ ] Si se valida en demo, evaluar si conviene una simulación con ruptura de estructura (más fiel que el flip binario) antes de considerar cualquier automatización parcial.

Ver también `CHECKLIST-TRADING.md` (sección 6, Modos de Operación) y `ST 4H + EMA 200 + Fib [RRHB].md` (el SuperTrend HTF que se usó como referencia de trailing/multiplicador en la simulación exploratoria).
