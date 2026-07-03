# Módulo: Calendario — PROY

## Visión General

Calendario personal integrado con **Google Calendar API**. Unifica entregas de proyectos, pagos, entrenos, citas, vencimientos de documentos y sesiones de estudio en una vista única.

---

## Integración con Google Calendar

### API
- **Google Calendar API v3**
- Autenticación OAuth 2.0
- Scopes: `https://www.googleapis.com/auth/calendar` (read/write)

### Flujo
1. Eventos creados en cualquier módulo de PROY se sincronizan con Google Calendar
2. Eventos creados en Google Calendar aparecen en el dashboard
3. Bidireccional: cambios en un lado se reflejan en el otro

---

## Categorías de Eventos

| Categoría | Color | Origen | Sincronización |
|-----------|-------|--------|----------------|
| **Entregas Proyectos** | 🔴 Rojo | `PROYECTOS/` | Push → Google Calendar |
| **Pagos / Facturas** | 🟢 Verde | `FINANZAS/` | Push → Google Calendar |
| **Entrenos** | 🔵 Azul | `CICLISMO/` | Push → Google Calendar |
| **Estudio** | 🟡 Amarillo | `ESTUDIOS/` | Push → Google Calendar |
| **Vencimientos** | 🟠 Naranja | `DOCUMENTOS/` | Push → Google Calendar |
| **Citas / Personales** | 🟣 Morado | Google Calendar | Pull → Dashboard |
| **Trading** | ⚪ Gris | `TRADING/` | Push → Google Calendar |

---

## Estructura

```
calendario/
├── config/
│   └── google-calendar.json    # OAuth tokens, calendar ID
├── eventos/
│   ├── proyectos.md            # Hitos y entregas
│   ├── finanzas.md             # Pagos, facturas, vencimientos
│   ├── ciclismo.md             # Entrenos planificados
│   ├── estudios.md             # Sesiones de estudio
│   └── documentos.md           # Renovaciones, vencimientos
├── dashboard/
│   ├── timeline.md             # Timeline semanal
│   └── recordatorios.md        # Alertas próximas
└── scripts/
    ├── sync-google-calendar.py # Sincronización bidireccional
    └── gen-semana.py           # Generar resumen semanal
```

---

## Eventos Recurrentes

| Evento | Frecuencia | Día | Recordatorio |
|--------|-----------|-----|-------------|
| Revisión semanal de proyectos | Semanal | Domingo 10:00 | 1h antes |
| Pago deudas | Mensual | 5 de cada mes | 2 días antes |
| Revisión finanzas mensual | Mensual | 1 de cada mes | 1 día antes |
| Entreno planificado | Según plan | Variable | 30min antes |
| Sesión de estudio | Lun/Mie/Vie | 20:00 | 15min antes |

---

## Setup Google Calendar API

1. Ir a https://console.cloud.google.com → crear proyecto
2. Habilitar Google Calendar API
3. Crear OAuth 2.0 Client ID (tipo: Desktop app)
4. Guardar `credentials.json`
5. Usar el script `sync-google-calendar.py` para autenticar y sincronizar
