# DASHBOARD PROY

Panel de control personal integral. Unifica proyectos de desarrollo, finanzas personales, trading, ciclismo y estudios en un solo lugar.

## Infraestructura

| Servicio | Estado | URL |
|----------|--------|-----|
| **GitHub** | Conectado | https://github.com/rrhb0911/PROY |
| **Supabase** | Tablas creadas | `ajepmezimkestxjrwqna.supabase.co` |
| **Vercel** | Desplegado | https://proy-dashboard.vercel.app |

## Módulos

```
PROY/                      ← raíz del monorepo git
├── PROY Project/          ← este proyecto (dashboard), único e independiente
│   ├── frontend/          → Next.js 16 + Tailwind (Vercel)
│   ├── supabase/          → Schema SQL
│   ├── PROYECTOS/         → Termómetro de proyectos + gestión de clientes
│   ├── FINANZAS/          → Ingresos, gastos, deudas, patrimonio
│   ├── TRADING/           → Forex (cTrader MCP) + Crypto (Binance API)
│   ├── CICLISMO/          → Entrenamiento (Strava + TP + WKO5)
│   ├── ESTUDIOS/          → Bitácora de aprendizaje + NotebookLM
│   ├── DOCUMENTOS/        → Documentos personales y vencimientos
│   ├── CALENDARIO/        → Calendario integrado con Google Calendar
│   └── METAS/             → OKRs, hábitos y revisión semanal
├── aplicaciones-web/      → vitaldent-web, zammy-portal (proyectos independientes)
├── sitios-web/            → dra-angela-ramirez (proyecto independiente)
└── scripts-automatizacion/ → vitaldent (Google Apps Script, proyecto independiente)

Docs activos (dentro de PROY Project/):
├── README.md          ← Este archivo
├── PROYECTOS.md       → Gestión de proyectos
├── FINANZAS.md        → Finanzas personales
├── TRADING.md         → Trading
├── CICLISMO.md        → Entrenamiento ciclista
├── ESTUDIOS.md        → Aprendizaje
├── DOCUMENTOS.md      → Documentos personales
├── CALENDARIO.md      → Calendario + Google Calendar
└── METAS.md           → OKRs y hábitos

Docs futuros:
├── SALUD.md           → Salud y bienestar
├── INVENTARIO.md      → Activos y garantías
├── SUSCRIPCIONES.md   → Control de suscripciones
├── FISCAL.md          → Impuestos y declaraciones
├── IDEAS.md           → Backlog de ideas
└── DIARIO.md          → Journaling personal
```

## Conexiones entre Módulos

```
PROYECTOS  ──→ FINANZAS     (ingresos freelance, costos)
TRADING    ──→ FINANZAS     (P&L, flujo de caja)
CICLISMO   ──→ FINANZAS     (gastos equipamiento, nutrición)
ESTUDIOS   ──→ PROYECTOS    (habilidades → nuevos proyectos)
DOCUMENTOS ──→ CALENDARIO   (vencimientos → eventos)
METAS      ──→ CALENDARIO   (deadlines → eventos)
METAS      ──→ TODOS        (KRs conectados a cada módulo)
```

## Estado Actual

- [x] Dashboard base (Next.js 16 + Tailwind)
- [x] Esquema Supabase
- [x] Conexiones: GitHub + Supabase + Vercel
- [x] Autenticación Google OAuth
- [ ] Módulo PROYECTOS (termómetro funcional con datos reales)
- [ ] Módulo FINANZAS (importar GASTOS.xlsx → Supabase)
- [ ] Módulo TRADING (conexión cTrader MCP + Binance API)
- [ ] Módulo CICLISMO (Strava + TrainingPeaks integrados)
- [ ] Módulo ESTUDIOS (bitácora + NotebookLM)
- [ ] Módulo DOCUMENTOS (repositorio + alertas vencimiento)
- [ ] Módulo CALENDARIO (Google Calendar API sincronizada)
- [ ] Módulo METAS (OKRs + hábitos + revisión semanal)
