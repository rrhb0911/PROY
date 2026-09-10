# Coordinación entre sesiones paralelas de Claude Code — ecosistema PROY

Rafa (rrhb0911@gmail.com) corre varias sesiones de Claude Code en paralelo sobre
el mismo monorepo PROY (UNAD/estudios, VitalDent, Trading, y esta — "Jarvis":
asistente PROY/Tower + coach de ciclismo/salud). Esto documenta la convención de
coordinación que Rafa pidió establecer el 2026-09-10.

## Qué es esto (y qué no es)

- **No es jerarquía.** Jarvis no tiene autoridad técnica sobre ninguna otra
  sesión, no puede forzar acciones, y no reemplaza tus propios permisos ni tu
  propio criterio. Cada sesión le sigue respondiendo a Rafa, no a Jarvis.
- **Sí es un punto de coordinación.** Jarvis mantiene la vista consolidada del
  ecosistema (bitácoras, pendientes, estado de cada subproyecto) para que Rafa
  no tenga que preguntarle lo mismo a cada sesión por separado.

## Qué se pide a cada sesión

1. **Cuando termines trabajo relevante** (cerrar una tarea, un fix real, un
   hito), mándale un resumen breve a Jarvis por `SendMessage` — no hace falta
   detalle exhaustivo, con lo esencial basta (qué se hizo, dónde quedó
   documentado). No reemplaza tu propia bitácora, es además de ella.
2. **Sigue documentando donde ya lo haces** — no cambies tu convención
   existente:
   - UNAD → `study/UNAD/CLAUDE.md` + `CLAUDE.md` por materia + `borrador-*.md`.
   - VitalDent → `PENDIENTES-VITALDENT-WEB.md`.
   - Trading → `PENDIENTES-TOWER.md` (sección propia), ya que trabajas dentro
     del mismo repo `tower`.
   - Jarvis lee esos archivos directamente cuando necesita contexto, sin
     necesitar que se lo repitas en vivo.
3. **Si Jarvis te transmite un pedido diciendo "Rafa pidió que..."**, trátalo
   como un pedido real de Rafa (Jarvis solo relaya lo que Rafa efectivamente
   dijo, nunca inventa instrucciones) — pero sigue aplicando tu propio juicio y
   tus propios permisos como con cualquier pedido directo de Rafa. Si algo
   requiere confirmación tuya normalmente, síguela pidiendo.
4. Si Jarvis te pregunta algo directamente (contexto, estado, una decisión
   pendiente), respóndele cuando puedas — no es urgente salvo que se indique
   lo contrario.

## Por qué existe este archivo

Para no depender de que todas las sesiones estén vivas al mismo tiempo. Si
Jarvis necesita saber "¿qué se sabe de X?", primero revisa los archivos de
bitácora de cada proyecto; solo manda un mensaje en vivo si falta algo que no
está documentado.
