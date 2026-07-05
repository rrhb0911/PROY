# Módulo de Ciclismo — PROY

## Visión General

Sistema integral de entrenamiento ciclista que unifica datos de **Strava**, **GoldenCheetah**, **TrainingPeaks** y **WKO5** para analizar evolución, planificar entrenamientos por zonas y optimizar rendimiento con métricas avanzadas. El objetivo es tener un sistema propio que calcule las mismas métricas que WKO5 sin depender de software de terceros.

---

## Fuentes de Datos

### 1. Strava API v3 — Actividades y Streams

**Autenticación:** OAuth 2.0, scopes `activity:read_all`, `read`, `activity:write`

| Endpoint | Devuelve |
|----------|----------|
| `GET /athlete/activities` | Lista de actividades (paginado, filtro fecha) |
| `GET /activities/{id}` | Detalle completo: distancia, potencia, HR, cadencia, elevación, calorías, gear, segmentos |
| `GET /activities/{id}/streams` | Datos segundo a segundo (watts, HR, cadencia, altitud, velocidad, temperatura, GPS) |
| `GET /activities/{id}/laps` | Parciales por vuelta |
| `GET /activities/{id}/zones` | Tiempo en zonas HR y potencia |
| `GET /athletes/{id}/stats` | Totales: rides, distance, ytd, recent |
| `GET /athlete/zones` | Zonas FC y potencia configuradas |
| `GET /gear/{id}` | Bici: nombre, distancia total |
| `POST /uploads` | Subir .fit/.tcx/.gpx |

**Streams disponibles (segundo a segundo):**
`time`, `distance`, `latlng`, `altitude`, `heartrate`, `cadence`, `watts`, `temp`, `velocity_smooth`, `grade_smooth`, `moving`

**Rate limits:** 100 req/15min, 1000 req/día. SDK recomendado: `stravalib` (Python).

### 2. GoldenCheetah — Open Source (GPL v2)

Repositorio: https://github.com/GoldenCheetah/GoldenCheetah

GoldenCheetah es un **WKO5 gratuito** con todo el código disponible. Tiene implementado:

| Modelo | Descripción |
|--------|-------------|
| **Critical Power (CP)** | Modelo Monod-Scherrer para curva potencia-duración |
| **W' y W'bal** | Trabajo anaeróbico disponible y en tiempo real |
| **PMC** (Performance Manager) | CTL / ATL / TSB |
| **TSS / NP / IF** | Fórmulas estándar Coggan-Allen |
| **BikeStress / TRIMP** | Métricas alternativas de carga |
| **Scripting** | Python + R integrados para métricas propias |
| **Strava sync** | Subida y bajada de actividades |

**Podemos usar su código** para calcular métricas sin depender de WKO5.

### 3. WKO5 — Software de Análisis (Propietario, $169)

- Se sincroniza automáticamente con TrainingPeaks
- NO tiene API pública
- NO podemos replicar legalmente: `mFTP`, `eFTP`, `TIS`, `dFRC`, `Phenotyping`

### 4. TrainingPeaks Partners API v2 — Planificación

| Endpoint | Propósito |
|----------|-----------|
| `POST /v2/workouts/plan` | Crear workouts estructurados |
| `POST /v3/file` | Upload de .fit finalizado |
| `GET /v2/metrics/{start}/{end}` | Peso, HRV, sueño, estrés |

---

## Arquitectura Propuesta

```
Strava API
    │
    ▼
Python script ───→ Descarga actividades + streams
    │
    ├──→ GoldenCheetah algorithms (CP, W', PMC)
    │
    ▼
Cálculo de métricas propias:
    ├── PDC (curva potencia-duración)
    ├── FTP (mejor 20min × 0.95)
    ├── CP (Critical Power desde modelo 3 parámetros)
    ├── W' (trabajo anaeróbico)
    ├── NP, IF, TSS, kJ
    ├── CTL, ATL, TSB (PMC)
    ├── Zonas Z1-Z6
    ├── VI, AWC, FRC
    │
    ▼
Base de datos local (SQLite)
    │
    ▼
Dashboard con:
    ├── Power Duration Curve
    ├── Performance Manager Chart (CTL/ATL/TSB)
    ├── Tabla evolución semanal
    └── Análisis post-entreno
```

---

## Métricas — Qué Podemos Calcular vs Qué es Propietario

### ✅ Replicable (código público o ciencia abierta)

| Métrica | Fórmula / Fuente |
|---------|-----------------|
| **FTP** | Mejor media 20min × 0.95 (Coggan-Allen) |
| **CP** (Critical Power) | Modelo Monod-Scherrer: `P = W'/t + CP` |
| **W'** (anaerobic work) | Integral de (potencia - CP) sobre tiempo |
| **PDC** | Mejor potencia media para cada duración: 1s, 5s, 30s, 1min, 3min, 5min, 10min, 20min, 60min |
| **NP** (Normalized Power) | Media móvil 30s → ^4 → media → ^0.25 |
| **IF** (Intensity Factor) | `NP / FTP` |
| **TSS** (Training Stress Score) | `(seg × NP × IF) / (FTP × 3600) × 100` |
| **kJ** | `potencia media × seg / 1000` |
| **CTL** (fitness) | EMA 42 días del TSS diario |
| **ATL** (fatiga) | EMA 7 días del TSS diario |
| **TSB** (forma) | `CTL - ATL` |
| **VI** (variabilidad) | `NP / AP` |
| **TTE** | Mejor duración sostenida a ~FTP |
| **AWC** | Trabajo total > FTP en sprints < 30s |
| **FRC** | Trabajo total > FTP en esfuerzos 30s-15min |
| **Zonas** | Z1 <55%, Z2 56-75%, Z3 76-90%, Z4 91-105%, Z5 106-120%, Z6 >120% |

### ❌ Propietario de WKO5 (no replicable)

| Métrica | Alternativa |
|---------|-------------|
| **mFTP** (modeled FTP) | Usar CP o mejor 20min×0.95 |
| **eFTP** (extended FTP) | Estimación desde PDC en duraciones largas |
| **TIS** (Training Impact Score) | Usar TSS + PMC |
| **dFRC** (dynamic FRC) | Usar W'bal de GoldenCheetah |
| **Phenotyping** | No replicable (datos de miles de atletas) |
| **VLamax** | Modelo público de Kolie Moore (implementable) |

---

## Estructura de Archivos

```
ciclismo/
├── config/
│   ├── strava.json             # API tokens Strava (pendiente)
│   ├── trainingpeaks.json      # OAuth credentials TP (pendiente)
│   └── trainer.json            # Configuración del trainer
├── atleta/
│   ├── perfil.md               # FTP, peso, zonas, umbrales
│   └── historial.md            # Evolución de métricas clave
├── planificacion/
│   ├── periodo-actual.md       # Mesociclo en curso
│   └── temporada.md            # Plan anual
├── entrenos/
│   ├── sesiones/               # Workouts planificados (.fit estructurados)
│   ├── completados/            # Archivos .fit subidos
│   └── library/                # Biblioteca de intervalos y workouts
├── metricas/
│   ├── power-curve.md          # Curva potencia-duración
│   ├── evolucion.md            # Progresión semanal/mensual
│   └── wko5-metrics.md         # Referencia de métricas
├── analisis/
│   ├── oportunidades.md        # Debilidades y áreas de mejora
│   └── estrategias.md          # Decisiones de entrenamiento
├── scripts/
│   ├── sync-strava.py          # Sincronización con Strava
│   ├── calcula-metricas.py     # Cálculo de PDC, CP, W', NP, TSS, CTL/ATL/TSB
│   ├── genera-workout.py       # Generador de .fit estructurados
│   └── analyze-workout.py      # Análisis post-entreno
├── logs/
│   ├── diario.md               # Bitácora diaria
│   └── semanal.md              # Resumen semanal
└── research/                   # Investigación de algoritmos
    ├── goldencheetah-algos.md  # Algoritmos extraídos de GoldenCheetah
    ├── fit-format.md           # Especificación FIT para generar workouts
    └── ciclocomputadores.md    # Cómo subir workouts a dispositivos
```

---

## Planificación de Entrenos

### Formato Workout Estructurado (TrainingPeaks API)
```json
{
  "WorkoutDay": "2026-07-01",
  "WorkoutType": "bike",
  "Title": "VO2max: 5x3min @ 115%",
  "TotalTimePlanned": 1.5,
  "TSSPlanned": 95,
  "IFPlanned": 0.92,
  "Structure": [
    { "IntensityClass": "WarmUp", "Length": { "Unit": "Second", "Value": 900 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 55 } },
    { "Type": "Repetition", "Length": { "Unit": "Repetition", "Value": 5 }, "Steps": [
      { "IntensityClass": "Active", "Length": { "Unit": "Second", "Value": 180 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 115 } },
      { "IntensityClass": "Rest", "Length": { "Unit": "Second", "Value": 180 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 50 } }
    ]},
    { "IntensityClass": "CoolDown", "Length": { "Unit": "Second", "Value": 600 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 50 } }
  ]
}
```

### Subida a Ciclocomputador / Entrenador
1. **TrainingPeaks** → "Enviar a dispositivo" (Wahoo ELEMNT, Garmin Edge, Karoo)
2. **Exportar .fit estructurado** → cargar manualmente al dispositivo
3. **Zwift / TrainerRoad** → importar .zwo o .erg desde el calendario TP
4. **Formato FIT nativo**: generar archivos .fit con estructura de intervalos (FIT SDK)

---

## Zonas de Entrenamiento

| Zona | % FTP | Descripción | TTE |
|------|-------|-------------|-----|
| Z1 | <55% | Recuperación activa | ∞ |
| Z2 | 56–75% | Resistencia aeróbica (base) | 2–8h |
| Z3 | 76–90% | Tempo / ritmo | 1–3h |
| Z4 | 91–105% | Umbral funcional (FTP) | 20–70min |
| Z5 | 106–120% | VO2max | 3–12min |
| Z6 | >120% | Capacidad anaeróbica | 30s–3min |

---

## Metodología de Entrenamiento

### Push Progresivo (VO2 → FTP → Extensión)

```
FASE 1: SUBIR EL TECHO (VO2max)
├── Objetivo: Aumentar la potencia a VO2max (Z5)
├── Trabajo: 3–5min @ 106–120% FTP, descansos 1:1 o 2:1
├── Duración: 4–6 semanas
└── Indicador: PDC en rango 3–8 min mejora

FASE 2: EMPUJAR FTP
├── Objetivo: Traducir techo alto en FTP sostenible
├── Trabajo: 8–20min @ 91–105% FTP, descansos 1:0.5
├── Duración: 4–6 semanas
└── Indicador: TTE @ FTP aumenta

FASE 3: EXTENSIÓN
├── Objetivo: Sostener FTP por más tiempo
├── Trabajo: 2–4 series 20–40min @ 90–100% FTP
├── Duración: 3–5 semanas
└── Indicador: TTE @ FTP → 70min+
```

### Mesociclos y Periodización Anual

| Mesociclo | Duración | Enfoque | Métrica Objetivo |
|-----------|----------|---------|-------------------|
| **Base I** | 4–6 sem | Z2, volumen, técnica | eFTP, TTE Z2 |
| **Base II** | 4–6 sem | Tempo, fuerza resistencia | mFTP, TTE Z3 |
| **Construcción I** | 4–6 sem | VO2max, push techo | PDC 3–8min |
| **Construcción II** | 4–6 sem | FTP, push umbral | TTE @ FTP |
| **Extensión** | 3–5 sem | Resistencia a FTP | TTE @ FTP > 70min |
| **Pico** | 2–3 sem | Vol. reducido, intensidad alta | frescura + rendimiento |
| **Transición** | 1–2 sem | Descanso activo | recuperación |

```
ENE  FEB  MAR  ABR  MAY  JUN  JUL  AGO  SEP  OCT  NOV  DIC
[--Base I--][--Base II--][--Const I--][--Const II--][--Ext--][Pico][Trans]
```

---

## Dashboard PROY (Tabla de Evolución)

| Semana | CTL | ATL | TSB | TTE | FTP | PDC_20 | FRC | Peso | kJ | Horas | Notas |
|--------|-----|-----|-----|-----|-----|--------|-----|------|-----|-------|-------|
| S1     | 45  | 55  | -10 | 30  | 240 | 228   | 12  | 72   | 850 | 5     | Base I inicio |

---

## Estrategias de Nutrición

| Situación | kJ requeridos | Carga por hora |
|-----------|---------------|----------------|
| Z2 < 2h | Agua + electrolitos | ~300 kcal |
| Z2 > 3h | 300–400 kcal/h | 60–90g CHO |
| Z4+ intenso | 200–300 kcal/h | 60–90g CHO + cafeína |
| Post-entreno | Reposición total | 1.0–1.2g CHO/kg + proteína |

- 1 kJ ≈ 1 kcal gastada
- kJ totales → referencia directa para reponer

---

## Análisis Post-Entreno

**Preguntas:** ¿Cumplí objetivos? ¿Cadencia óptima? ¿RPE vs datos? ¿HRV? ¿TSS planeado vs real? ¿Factores externos?

**Oportunidades:** RPM bajas en Z2 → técnica 85-95rpm. TTE estancado → ajustar extensión. Pico bajo → neuromuscular 1x/sem. FRC limitante → intervalos 1-3min.

---

## CHECKLIST para Claude Code

Usa esto cuando arranques cada fase:

### Fase 1 — Strava API
- [ ] Crear app en https://www.strava.com/settings/api
- [ ] Obtener Client ID + Client Secret
- [ ] Completar OAuth 2.0 (scopes: activity:read_all, read, activity:write)
- [ ] Probar: `GET /athlete` → perfil
- [ ] Probar: `GET /athlete/activities?per_page=3` → actividades

### Fase 2 — Sincronización
- [ ] Descargar últimas actividades desde Strava
- [ ] Para cada actividad: calcular NP, IF, TSS, kJ
- [ ] Acumular CTL/ATL/TSB diario
- [ ] Generar tabla de evolución semanal

### Fase 3 — Métricas Avanzadas
- [ ] Calcular PDC desde streams de potencia
- [ ] Estimar FTP (mejor 20min × 0.95)
- [ ] Calcular CP + W' (modelo Critical Power)
- [ ] Extraer algoritmos de GoldenCheetah (CP, W'bal, PMC)

### Fase 4 — Workouts
- [ ] Investigar formato FIT SDK para generar entrenos estructurados
- [ ] Probar generación de .fit con intervalos
- [ ] Probar subida a ciclocomputador (Wahoo/Garmin)

---

## 📚 TAREAS PENDIENTES DE INVESTIGACIÓN

### Para Claude Code — Investigar y documentar:

1. **Extraer algoritmos de GoldenCheetah:**
   - Revisar el código fuente en GitHub (C++)
   - Identificar la implementación de: Critical Power, W'bal, PMC, TSS, NP
   - Documentar las fórmulas exactas en `research/goldencheetah-algos.md`

2. **Formato FIT para generación de workouts:**
   - Investigar FIT SDK (https://github.com/therunninghub/FIT-SDK)
   - Cómo crear archivos .fit con estructura de intervalos (course points, lap messages)
   - Documentar en `research/fit-format.md`

3. **Subida a ciclocomputadores:**
   - Investigar protocolos de Wahoo ELEMNT, Garmin Edge, Karoo
   - Cómo subir .fit estructurados a cada dispositivo
   - ¿API de Garmin Connect? ¿Wahoo API?
   - Documentar en `research/ciclocomputadores.md`

4. **Unificar WKO5 + GoldenCheetah:**
   - Comparar métricas de ambos (qué calcula cada uno)
   - Identificar qué algoritmos de GoldenCheetah podemos reutilizar
   - Identificar qué métricas WKO5 NO tienen equivalente open source
   - Proponer la mejor combinación para nuestro sistema propio

5. **Modelo VLamax (público):**
   - Investigar el modelo de Kolie Moore para estimar VLamax desde potencia
   - Evaluar si vale la pena implementarlo

---

## Seguridad

- No subir strava.json con tokens a git
- Usar refresh tokens auto-renovables
- Rate limits: max 100 requests/15min
- Cuidado con coordenadas GPS (datos personales)

## Referencias
- **Strava API**: developers.strava.com
- **GoldenCheetah**: github.com/GoldenCheetah/GoldenCheetah
- **TrainingPeaks API**: github.com/TrainingPeaks/PartnersAPI
- **WKO5 Guide**: help.trainingpeaks.com
- **FIT SDK**: github.com/therunninghub/FIT-SDK
- **Libro**: Training and Racing with a Power Meter (Allen & Coggan)
