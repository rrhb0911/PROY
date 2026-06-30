# Centro de Control Personal - PROY

Dashboard "Termómetro de Proyectos" que unifica: proyectos de clientes, finanzas, trading y ciclismo.

## Infraestructura

| Servicio | Estado | URL |
|----------|--------|-----|
| **GitHub** | Conectado | https://github.com/rrhb0911/PROY |
| **Supabase** | Tablas creadas | `ajepmezimkestxjrwqna.supabase.co` |
| **Vercel** | Desplegado | https://proy-dashboard.vercel.app |

## Estructura

```
PROY/
├── frontend/                  # Next.js 16 + Tailwind (Vercel)
├── supabase/
│   └── schema.sql             # Esquema de base de datos
├── aplicaciones-web/          # Apps Next.js con Vercel + Supabase
│   ├── vitaldent-web/         # Web app VitalDent
│   └── zammy-portal/          # Portal ZammyDeportes (git: rrhb0911/zammy-portal)
├── sitios-web/
│   └── dra-angela-ramirez/    # Sitio web Dra. Angela Ramirez
├── scripts-automatizacion/
│   └── vitaldent/             # Apps Script VitalDent
├── CLAUDE.md                  # Reglas para Claude Code
├── OPENCODE.md                # Reglas para Open Code
├── AGENTS.md                  # Instrucciones de Memstate
├── ARQUITECTURA_MAESTRA.md    # Arquitectura del sistema
└── README.md                  # Este archivo
```

## Orquestación IA

### Claude Code (rama `dev-core`)
- Arquitectura, lógica compleja, SQL, optimización
- Estrategias de trading, backtesting, risk management
- Diseño de esquemas de base de datos

### Open Code (rama `dev-ui`)
- UI, componentes visuales, formularios
- Conexiones a APIs, integraciones
- Dashboard, gráficos, termómetro de proyectos

### Relevo
Cuando una IA llega a su límite o la tarea no es de su competencia, debe indicar:
"Cambia a [CLAUDE | OPEN CODE] y dale este prompt: [prompt]"

## Estado Actual
- [x] Proyectos movidos a PROY
- [x] Dashboard central creado (Next.js 16 + Tailwind)
- [x] Esquema Supabase diseñado y aplicado
- [x] Conexiones: GitHub + Supabase + Vercel
- [x] Componentes base: Sidebar, ProjectCard, Thermometer, StatusBadge, ProjectForm
- [ ] Termómetro de proyectos funcional (con datos reales)
- [ ] Módulo de finanzas personales
- [ ] Módulo de ciclismo
- [ ] Integración con trading
