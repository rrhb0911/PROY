# Módulo de Ciclismo — PROY

## Visión General

Sistema integral de entrenamiento ciclista que unifica datos de **smart trainer**, **Strava**, **TrainingPeaks** y **WKO5** en una bitácora central para analizar evolución, planificar entrenamientos por zonas, y optimizar rendimiento con métricas avanzadas.

---

## Conexiones

### Smart Trainer
- **Protocolo**: ANT+ / Bluetooth FTMS
- **Dispositivos compatibles**: Wahoo, Tacx, Garmin, Elite, Zwift Hub
- **Datos en tiempo real**: potencia (watts), cadencia (rpm), velocidad, frecuencia cardíaca (HR)

### Strava (API v3)
| Recurso | Endpoint | Propósito |
|---------|----------|-----------|
| Subir actividades | `POST /uploads` | Subir .fit/.tcx desde el trainer |
| Leer actividades | `GET /athlete/activities` | Sincronizar entrenos completados |
| Obtener streams | `GET /activities/{id}/streams` | Potencia, HR, cadencia, altitud |
| Stats del atleta | `GET /athletes/{id}/stats` | Resumen de métricas |

### TrainingPeaks (Partners API v2)
| Recurso | Endpoint | Propósito |
|---------|----------|-----------|
| Planificar entrenos | `POST /v2/workouts/plan` | Crear workouts estructurados |
| Subir archivos | `POST /v3/file` | Upload de .fit finalizado |
| Obtener métricas | `GET /v2/metrics/{start}/{end}` | Peso, HRV, sueño, estrés |
| Zonas del atleta | `GET /v1/athlete/zones` | FTP, HR zones |

### WKO5
- Software de análisis (independiente, no tiene API pública)
- Las métricas se consultan desde la app y se referencian en esta bitácora
- **Vinculación**: TrainingPeaks → WKO5 (sincronización automática)

---

## Estructura de Archivos

```
ciclismo/
├── config/
│   ├── strava.json             # API tokens Strava
│   ├── trainingpeaks.json      # OAuth credentials TP
│   └── trainer.json            # Configuración del trainer
├── atleta/
│   ├── perfil.md               # FTP, peso, zonas, umbrales
│   └── historial.md            # Evolución de métricas clave
├── planificacion/
│   ├── periodo-actual.md       # Mesociclo en curso
│   └── temporada.md            # Plan anual
├── entrenos/
│   ├── sesiones/               # Workouts planificados (.fit o estructurados)
│   ├── completados/            # Archivos .fit subidos
│   └── library/                # Biblioteca de intervalos y workouts
├── metricas/
│   ├── power-curve.md          # Curva potencia-duración
│   ├── wko5-metrics.md         # Métricas WKO5 referenciadas
│   └── evolucion.md            # Progresión semanal/mensual
├── analisis/
│   ├── oportunidades.md        # Debilidades y áreas de mejora
│   └── estrategias.md          # Decisiones de entrenamiento
├── scripts/
│   ├── sync-strava.py          # Sincronización con Strava
│   ├── upload-tp.py            # Subir entrenos a TrainingPeaks
│   └── analyze-workout.py      # Análisis post-entreno
└── logs/
    ├── diario.md               # Bitácora diaria
    └── semanal.md              # Resumen semanal
```

---

## Métricas Clave (WKO5)

### Power Duration Curve (PDC)
| Rango | Duración | Sistema Energético | Objetivo de Entreno |
|-------|----------|--------------------|---------------------|
| **AWC** | 1s–30s | Anaeróbico / Neuromuscular | Sprint, arranques |
| **FRC** | 30s–15min | Anaeróbico láctico | VO2max, ataques |
| **mFTP** | 15–70min | Umbral funcional | FTP, tempo |
| **eFTP** | 70min–4h+ | Resistencia aeróbica | Fondo, resistencia |

### Métricas de Rendimiento
| Métrica | Descripción | Cómo se usa |
|---------|-------------|-------------|
| **FTP** | Functional Threshold Power | Base de todas las zonas |
| **mFTP** | Modeled FTP (WKO5) | FTP estimado por modelo PDC |
| **eFTP** | Extended FTP | Potencia sostenible > 70 min |
| **FRC** | Functional Reserve Capacity | Capacidad de trabajo supra-umbral |
| **AWC** | Anaerobic Work Capacity | Trabajo anaeróbico total |
| **TTE** | Time to Exhaustion @ FTP | Tiempo máximo sostenible a FTP |
| **PDC** | Power Duration Curve | Curva completa potencia-tiempo |
| **TIS** | Training Impact Score | Impacto del entreno en fatiga |
| **dFRC** | Dynamic FRC | FRC disponible en tiempo real |
| **CTL** | Chronic Training Load | Carga de entrenamiento crónica (forma) |
| **ATL** | Acute Training Load | Carga aguda (fatiga) |
| **TSB** | Training Stress Balance | Frescura (CTL - ATL) |

### Zonas de Entrenamiento (basadas en FTP)
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
├── Duración: 4–6 semanas de bloque
└── Indicador: PDC en rango 3–8 min mejora

FASE 2: EMPUJAR FTP
├── Objetivo: Traducir el techo alto en FTP sostenible
├── Trabajo: 8–20min @ 91–105% FTP, descansos 1:0.5
├── Duración: 4–6 semanas de bloque
└── Indicador: TTE @ FTP aumenta

FASE 3: EXTENSIÓN
├── Objetivo: Sostener el nuevo FTP por más tiempo
├── Trabajo: 2–4 series de 20–40min @ 90–100% FTP
├── Duración: 3–5 semanas de bloque
└── Indicador: TTE @ FTP → 70min+
```

### Mesociclos

| Mesociclo | Duración | Enfoque | Métrica Objetivo |
|-----------|----------|---------|-------------------|
| **Base I** | 4–6 sem | Z2, volumen, técnica | eFTP, TTE Z2 |
| **Base II** | 4–6 sem | Tempo, fuerza resistencia | mFTP, TTE Z3 |
| **Construcción I** | 4–6 sem | VO2max, push techo | PDC 3–8min |
| **Construcción II** | 4–6 sem | FTP, push umbral | TTE @ FTP |
| **Extensión** | 3–5 sem | Resistencia a FTP | TTE @ FTP > 70min |
| **Pico** | 2–3 sem | Volumen reducido, intensidad alta | frescura + rendimiento |
| **Transición** | 1–2 sem | Descanso activo | recuperación |

### Periodización Anual
```
ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC
[--Base I--][--Base II--][--Const I--][--Const II--][--Ext--][Pico][Trans]
```

---

## Planificación de Entrenos

### Formato de Workout Estructurado (TrainingPeaks API)
```json
{
  "WorkoutDay": "2026-07-01",
  "WorkoutType": "bike",
  "Title": "VO2max: 5x3min @ 115%",
  "TotalTimePlanned": 1.5,
  "TSSPlanned": 95,
  "IFPlanned": 0.92,
  "Structure": [
    { "IntensityClass": "WarmUp", "Length": { "Unit": "Second", "Value": 900 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 55, "MinValue": 50, "MaxValue": 60 } },
    { "IntensityClass": "Active", "Length": { "Unit": "Second", "Value": 180 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 75 } },
    { "Type": "Repetition", "Length": { "Unit": "Repetition", "Value": 5 }, "Steps": [
      { "IntensityClass": "Active", "Name": "VO2 Interval", "Length": { "Unit": "Second", "Value": 180 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 115 } },
      { "IntensityClass": "Rest", "Name": "Recovery", "Length": { "Unit": "Second", "Value": 180 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 50 } }
    ]},
    { "IntensityClass": "CoolDown", "Length": { "Unit": "Second", "Value": 600 }, "Type": "Step", "IntensityTarget": { "Unit": "PercentOfThresholdFtp", "Value": 50 }, "OpenDuration": true }
  ]
}
```

### Subida a Ciclocomputador / Entrenador
1. **TrainingPeaks** → "Enviar a dispositivo" (Wahoo ELEMNT, Garmin Edge, Karoo)
2. **Exportar .fit estructurado** → cargar manualmente al dispositivo
3. **Zwift / TrainerRoad** → importar .zwo o .erg desde el calendario TP

---

## Dashboard PROY (Tabla de Evolución)

| Semana | CTL | ATL | TSB | TTE | FTP | eFTP | FRC | Peso | kJ | Horas | Notas |
|--------|-----|-----|-----|-----|-----|------|-----|------|-----|-------|-------|
| S1     | 45  | 55  | -10 | 30  | 240 | 210  | 12  | 72   | 850 | 5     | Base I inicio |
| S2     | 48  | 60  | -12 | 32  | 240 | 212  | 12  | 71.5 | 920 | 5.5   | Volumen OK |
| S3     | 52  | 68  | -16 | 35  | 242 | 215  | 13  | 71.5 | 1050| 6     | Semana fuerte |
| ...    | ... | ...  | ...  | ...  | ...  | ...  | ...  | ...  | ...  | ...   | ... |

---

## Estrategias de Nutrición

| Situación | kJ requeridos | Carga por hora | Notas |
|-----------|---------------|----------------|-------|
| Z2 < 2h | Agua + electrolitos | ~300 kcal | Sin carga extra |
| Z2 > 3h | 300–400 kcal/h | 60–90g CHO | Geles, bebida isotónica |
| Z4+ intenso | 200–300 kcal/h | 60–90g CHO + cafeína | Geles cada 20–30 min |
| Post-entreno | Reposición total | 1.0–1.2g CHO/kg + proteína | Ventana 30–60 min |

---

## Carga en Kilojulios (kJ) y Nutrición

- **1 kJ ≈ 1 kcal** gastada (eficiencia ~24%)
- **kJ totales del entreno** → referencia directa para reponer
- **Ejemplo**: 1500 kJ gastados → ~1500 kcal a reponer en el día
- **Ratio**: kJ/h → indicador de intensidad promedio

---

## Análisis Post-Entreno

### Preguntas Guía
1. ¿Cumplí los objetivos de potencia/zona?
2. ¿La cadencia se mantuvo en rango óptimo?
3. ¿Cómo estuvo la percepción de esfuerzo (RPE) vs datos?
4. ¿Qué dice la variabilidad de frecuencia cardíaca (HRV)?
5. ¿El TSS planeado coincide con el real?
6. ¿Hubo algún factor externo (sueño, estrés, alimentación)?

### Oportunidades de Mejora
- **RPM bajas en Z2**: trabajar técnica de pedaleo a 85–95 rpm
- **TTE estancado**: ajustar sesiones de extensión
- **Pico de potencia bajo**: añadir trabajo neuromuscular 1x/sem
- **FRC limitante**: priorizar intervalos de 1–3 min

---

## Referencias
- **WKO5 Guide**: ayuda.trainingpeaks.com
- **TrainingPeaks API**: github.com/TrainingPeaks/PartnersAPI
- **Strava API**: developers.strava.com
- **Google Drive**: documentación de entrenamiento y planes guardados
