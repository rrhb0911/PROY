# Subida de Workouts a Ciclocomputadores

## Flujo General

```
Coach crea workout estructurado
    │
    ├──→ Garmin Connect (sync automático TrainingPeaks)
    │       └──→ Garmin Edge (sync WiFi/BT/USB)
    │
    ├──→ Wahoo ELEMNT Companion App (sync automático TrainingPeaks)
    │       └──→ Wahoo ELEMNT/BOLT (sync WiFi)
    │
    └──→ Export .FIT manual
            └──→ Copiar a Garmin NewFiles/ vía USB
```

---

## 1. Garmin Edge — Automático (recomendado)

1. Crear workout estructurado en TrainingPeaks
2. Vincular TrainingPeaks → Garmin Connect (Settings → Apps & Devices → Garmin)
3. Workouts aparecen automáticamente en el calendario de Garmin Connect (hasta 15 días)
4. Cuando el dispositivo Garmin Edge sincroniza (WiFi/BT/USB), el workout aparece en Training → Workouts

## 2. Garmin Edge — Manual (vía USB)

1. Exportar workout como `.FIT` (desde TrainingPeaks o generado por nosotros)
2. Conectar Garmin Edge por USB
3. Copiar el .fit a la carpeta `NewFiles/` o `Workouts/` del dispositivo
4. Aparece en Training → Workouts

## 3. Wahoo ELEMNT — Automático

1. Crear workout en TrainingPeaks
2. Vincular TrainingPeaks en la **Wahoo ELEMNT Companion App** (no Wahoo Fitness)
3. Profile → Linked Accounts → TrainingPeaks → autorizar
4. Workouts se sincronizan automáticamente al dispositivo por WiFi

## 4. Formatos de Archivo

| Formato | Para qué |
|---------|----------|
| **.FIT** | Universal: Garmin, Wahoo, Karoo (potencia, HR, ritmo, cadencia, RPE) |
| **.ERG** | Solo potencia, para entrenadores smart (TrainerRoad, Zwift, Wahoo KICKR) |
| **.MRC** | Solo potencia, para TrainerRoad, Rouvy |
| **.ZWO** | Zwift |

## 5. Implementación Propia (sin TrainingPeaks)

### Herramientas existentes:

- **`structured-workout-format`** (Python) — genera .FIT para Garmin desde JSON
  `pip install structured-workout-format`
- **Garmin FIT SDK** (C# oficial) — https://developer.garmin.com/fit/cookbook/encoding-workout-files/
- **FIT SDK Python** — https://github.com/therunninghub/FIT-SDK
- **fitfileforge.com** — genera workouts desde lenguaje natural y los empuja a Garmin

### Enfoque propuesto:

1. Definir workout como JSON estructurado (warmup, intervalos, descanso, cooldown)
2. Usar `structured-workout-format` o FIT SDK para generar archivo .FIT válido
3. Copiar .fit al dispositivo por USB, o subir a Garmin Connect / Wahoo mediante API

### Código conceptual (Python):

```python
from structured_workout_format.formats import workout_file
from structured_workout_format.formats.fit import FitWorkoutBuilder

workout = {
    "name": "VO2max: 5x3min @ 115%",
    "sport": "bike",
    "steps": [
        {"type": "warmup", "duration": 900, "target": {"type": "power", "zone": 1}},
        {"type": "repeat", "count": 5, "steps": [
            {"type": "interval", "duration": 180, "target": {"type": "power", "zone": 5}},
            {"type": "rest", "duration": 180, "target": {"type": "power", "zone": 1}},
        ]},
        {"type": "cooldown", "duration": 600, "target": {"type": "power", "zone": 1}},
    ]
}

builder = FitWorkoutBuilder(workout)
with open("workout.fit", "wb") as f:
    f.write(builder.build())
```

## 6. APIs de Terceros

| Plataforma | API | Endpoint |
|------------|-----|----------|
| **Garmin Connect** | No oficial (reverse-engineered) | `POST /wellness-api/...` |
| **Wahoo** | Wahoo Fitness API (partners) | Limitada a partners |
| **TrainingPeaks** | Partners API v2 | `POST /v2/workouts/plan` |

> Para un sistema propio, lo más práctico es generar .FIT y copiarlo por USB, o usar TrainingPeaks como puente si se obtienen credenciales.

## 7. Conclusión

- **Sin credenciales de TrainingPeaks**: generar .FIT directamente con `structured-workout-format` y copiar a `NewFiles/` del Garmin Edge por USB.
- **Con TrainingPeaks**: crear workout vía Partners API y sincronización automática a Garmin/Wahoo.
- **Wahoo**: requiere la Companion App vinculada a TrainingPeaks; no hay API pública directa para subir workouts.
- **Garmin**: acepta .FIT por USB sin necesidad de API.
