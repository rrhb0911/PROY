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

---

# Incidente OneDrive — copias en conflicto (2026-09-08 a 09-10)

**Si ves archivos raros terminados en `-194-177-153-160` o una rama
`main-194-177-153-160`: es esto. No entres en pánico, no se perdió nada.**

## Qué pasa

El monorepo PROY vive dentro de una carpeta sincronizada por OneDrive, y el
equipo se llama `194-177-153-160`. Cuando OneDrive detecta que un archivo fue
modificado en dos lados a la vez, se queda con una versión y guarda la
perdedora como `archivo-194-177-153-160.ext`. Como varias sesiones de Claude
Code escriben en paralelo sobre el mismo árbol, esto se dispara seguido.

Lo grave no son los archivos de código, sino que **OneDrive también hace esto
dentro de las carpetas `.git`**. Se encontraron copias en conflicto de
`index`, `config`, `logs/HEAD` y — lo peor — de `refs/heads/main`. Cuando
OneDrive pisa `refs/heads/main`, la punta real de la rama queda guardada en un
archivo aparte, y git lo lee como si fuera **una rama más**. De ahí salen las
ramas fantasma `main-194-177-153-160` y `origin/main-194-177-153-160`.

Ese es el mecanismo por el que un commit "desaparece": no se borra, queda
colgando de una rama que nadie mira.

## Qué se encontró (auditoría del 2026-09-10)

- **609 archivos** en conflicto en todo PROY, del 8 al 10 de septiembre.
  516 en `vitaldent-web` (497 dentro de `.claude/worktrees`), 80 en `tower`,
  30 dentro de carpetas `.git`, el resto sueltos.
- **Un commit huérfano real**: `30bf398` en la raíz de PROY, "Consolida
  trabajo de sesiones paralelas: salud, metas, finanzas y spec de Tower",
  de la sesión `session_01N3N6kq1z93AEprebH2Joy2` (Jarvis), 8 archivos,
  +2181 líneas. **No es alcanzable desde `main`** — colgaba de la rama
  fantasma.

## Conclusión: NO hubo pérdida de información

Se auditaron los 10 repos del árbol (`git status`, `reflog`, `fsck
--unreachable`, y comparación byte a byte de cada copia en conflicto contra
su original y contra todas las ramas):

- El contenido del commit huérfano `30bf398` **ya estaba en `main`**,
  recuperado por el commit `6e3a99a`. Donde difieren, `main` es la versión
  **más nueva** (`tower-seed-source.json` version 11 vs version 9).
- Los otros commits inalcanzables (`ce75cb5` en la raíz, 35 en
  `vitaldent-web`, 11 en `zammy-portal`) son stashes, gemelos de rebase o
  versiones viejas. Ninguno tiene contenido único.
- Las 609 copias en conflicto: **ninguna** contiene una línea que no esté ya
  commiteada. Verificado con `git hash-object` + `git cat-file -e` sobre
  cada archivo de código.

## Trampa conocida al verificar esto

`git cat-file --batch-check` **por pipe de PowerShell devuelve "missing"
falsamente** para blobs que sí existen. Durante la auditoría esto produjo una
falsa alarma de "155 archivos con trabajo sin commitear" que era íntegramente
un bug del método. Usa `git cat-file -e <sha>` y mira el código de salida.

## Lo que NO hay que hacer

- **No corras `git reset --hard recovery-onto-origin` en la raíz de PROY.**
  `main`, `recovery-onto-origin` y `HEAD` son el mismo commit (`6e3a99a`);
  es un no-op.
- **No corras `git push origin --delete main-194-177-153-160`.** Esa rama
  **no existe en el remoto** — se verificó con `git ls-remote`. El ref
  `origin/main-194-177-153-160` es un archivo local que fabricó OneDrive
  dentro de `.git/refs/remotes/`, no una rama en GitHub.

## Pendiente — solo lo puede hacer Rafa

**La causa raíz sigue activa.** Mientras las carpetas `.git` se sincronicen
por OneDrive, esto va a volver a pasar. El arreglo es una configuración de
Windows que ninguna sesión de Claude Code puede tocar:

- Configuración de OneDrive → *Elegir carpetas* → excluir las carpetas `.git`
  y `node_modules`; **o**, mejor, mover los repos fuera de OneDrive.

Hasta que eso esté hecho, asumir que van a seguir apareciendo copias en
conflicto. Los `.gitignore` de la raíz, `vitaldent-web` y `tower` ya tienen
`*-194-177-153-160*` para que al menos no ensucien `git status`.

**Limpieza pendiente de autorización**: borrar los 609 archivos de conflicto
y las 2 ramas fantasma locales. Está verificado que es seguro, pero el
borrado fue bloqueado por el sistema de permisos y requiere que Rafa lo
apruebe explícitamente. Ojo con el orden: primero excluir `.git` de OneDrive,
si no vuelven a aparecer.
