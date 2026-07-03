# Módulo de Proyectos — PROY

## Visión General

Gestión de proyectos de desarrollo web. Termómetro visual del estado de cada proyecto: avance, tareas pendientes, próximas entregas, costos, mantenimiento. Cada proyecto se conecta al módulo de **Finanzas** para facturación y control de ingresos.

---

## Proyectos Actuales

| Proyecto | Cliente | Estado | Próxima Entrega | Costo Mensual | Tecnología |
|----------|---------|--------|-----------------|---------------|------------|
| **VitalDent Web** | VitalDent M&M | En desarrollo | — | — | Next.js + Supabase |
| **VitalDent Apps Script** | VitalDent M&M | Producción | — | — | Google Apps Script |
| **Zammy Portal** | Zammy Deportes SAS | Producción | — | — | Next.js + Supabase |
| **LabDent Site** | Dra. Angela Ramirez | Publicado | — | — | Hostinger |
| **Consultorio Site** | Dra. Angela Ramirez | Publicado | — | — | Hostinger |
| **PROY Dashboard** | Personal | En desarrollo | — | — | Next.js + Supabase |

---

## Termómetro de Proyectos

```
PROY ───────────────────────────────────────── 65% ████████████████░░░
VitalDent Web ──────────────────────────────── 40% ██████████░░░░░░░░░
Zammy Portal ───────────────────────────────── 85% ██████████████████░
VitalDent Apps Script ──────────────────────── 95% ███████████████████
LabDent Site ───────────────────────────────── 100% ███████████████████
Consultorio Site ───────────────────────────── 100% ███████████████████
```

---

## Estructura

```
proyectos/
├── config/
│   └── clientes.json             # Datos de contacto, tarifas, plazos
├── vitaldent-web/
│   ├── estado.md                 # Estado actual, blockers
│   ├── tareas.md                 # Backlog, sprint actual
│   ├── entregas.md               # Calendario de entregas
│   ├── costos.md                 # Costos de desarrollo, hosting, dominio
│   └── mantenimiento.md          # Actualizaciones programadas
├── zammy-portal/
│   ├── estado.md
│   ├── tareas.md
│   ├── entregas.md
│   ├── costos.md
│   └── mantenimiento.md
├── vitaldent-scripts/
│   └── estado.md
├── sitios-web/
│   └── angela-ramirez/
│       ├── estado.md
│       └── mantenimiento.md
├── dashboard/
│   ├── calendario.md             # Timeline general de entregas
│   ├── ingresos-proyectados.md   # Proyección de ingresos por proyecto
│   └── termometro.md             # Vista general del termómetro
└── scripts/
    ├── sync-github.py            # Leer estado desde repositorios
    └── gen-reporte.py            # Generar reporte semanal
```

---

## Calendario de Gestión

### Semanal
- Revisar tareas pendientes de cada proyecto
- Actualizar estado del termómetro
- Facturar si aplica

### Mensual
- Reporte de avance a clientes
- Revisar costos (hosting, dominios, servicios)
- Planificar próximas entregas

### Trimestral
- Revisión de presupuesto vs real
- Evaluar ajuste de tarifas
- Mantenimiento programado

---

## Integración con Finanzas

Cada proyecto alimenta automáticamente:
```
proyecto → costo mensual → finanzas/ingresos/freelance.md
proyecto → gastos (hosting, dominio) → finanzas/gastos/
```

---

## Flujo de Trabajo con Claude Code

1. Claude Code trabaja en ramas (`dev-core`, `dev-ui`)
2. Al completar una tarea, actualiza `proyectos/<proyecto>/tareas.md`
3. El termómetro se actualiza reflejando el nuevo avance
4. Calendarización de próximas entregas se ajusta automáticamente
