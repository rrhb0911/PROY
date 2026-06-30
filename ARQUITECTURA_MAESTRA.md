# ARQUITECTURA MAESTRA - Centro de Control Personal

## Regla de Oro: Separación Total

```
PROY/                          ← Repositorio Padre (Dashboard)
├── frontend/                  ← Next.js (Vercel)
├── supabase/                  ← Esquemas SQL
├── aplicaciones-web/          ← Git repos independientes
├── sitios-web/                ← Git repos independientes
├── scripts-automatizacion/    ← Sin Git (carpetas sueltas)
├── CLAUDE.md / OPENCODE.md    ← Reglas de orquestación
└── README.md                  ← Estado global
```

**El Dashboard es SOLO LECTURA** sobre los proyectos. No modifica su código.

## Flujo de Trabajo

### Cuando trabajas en el Dashboard (PROY/)
1. Abres terminal en `PROY/`
2. Lees `README.md` → sabes el estado
3. Lees `CLAUDE.md` o `OPENCODE.md` según qué IA uses
4. Trabajas en rama `dev-core` (Claude) o `dev-ui` (Open Code)
5. Haces commit y actualizas `README.md`

### Cuando trabajas en un Proyecto de Cliente
1. `cd PROY/aplicaciones-web/vitaldent-web/` (o el que sea)
2. Abres Claude Code o Open Code **ahí adentro**
3. El código del cliente NO se mezcla con el Dashboard

### Relevo Automático entre IAs
- **Claude Code dice:** "Esto es para Open Code. Dale este prompt: [texto]"
- **Open Code dice:** "Esto es para Claude Code. Dale este prompt: [texto]"
- Siempre incluir el prompt EXACTO que la otra IA debe ejecutar

## Prompts de Inicio

### Para Claude Code (cuando abras sesión en PROY/):
```
Lee CLAUDE.md. Lee el README.md. Ejecuta git log --oneline -5 para ver el historial. Dime cuál es el estado actual y qué debería hacer ahora según la prioridad del README. Si necesitas algo de UI, indícame que cambie a Open Code y dame el prompt exacto.
```

### Para Open Code (cuando abras sesión en PROY/):
```
Lee OPENCODE.md. Lee el README.md. Revisa el estado actual del proyecto. Si Claude te dejó tareas pendientes o si el README indica que hay trabajo de UI/frontend, dime exactamente qué prompt debería darle a Claude cuando necesite lógica compleja.
```

## Prioridades (definidas por el usuario)
1. **Termómetro de Proyectos/Trabajo** ← Prioridad #1
2. Finanzas personales
3. Trading (Binance + DAX)
4. Ciclismo (entrenamientos)
