# Formato FIT — Workouts Estructurados

## Referencias

- **FIT SDK oficial Garmin**: https://developer.garmin.com/fit/
- **FIT SDK Python (community)**: https://github.com/therunninghub/FIT-SDK
- **structured-workout-format** (Python): `pip install structured-workout-format`
- **Documentación FIT**: https://developer.garmin.com/fit/cookbook/encoding-workout-files/

---

## ¿Qué es FIT?

FIT (Flexible and Interchangeable Data) es el formato binario estándar de Garmin para intercambio de datos de fitness. Un archivo .FIT contiene mensajes tipados con campos definidos por el perfil FIT.

---

## Tipos de Mensajes para Workouts

| Tipo de Mensaje | Descripción |
|----------------|-------------|
| `file_id` | Metadatos del archivo (tipo, fabricante, producto, número de serie) |
| `workout` | Define el workout: nombre, deporte, número de pasos |
| `workout_step` | Cada paso del workout: duración, tipo, objetivo de intensidad |

### Workout Steps — Tipos

| Tipo | Descripción |
|------|-------------|
| `step` | Paso individual (calentamiento, intervalo, descanso, enfriamiento) |
| `repeat` | Repite un conjunto de pasos N veces |
| `repeat_until` | Repite hasta que se cumpla una condición |

### Workout Steps — Duración

| Duración | Uso |
|----------|-----|
| `time` | Segundos |
| `distance` | Metros |
| `repetition` | Número de repeticiones (para `repeat`) |

### Workout Steps — Objetivos de Intensidad

| Objetivo | Descripción |
|----------|-------------|
| `heartrate` | Frecuencia cardíaca |
| `power` | Potencia en watts |
| `speed` | Velocidad |
| `pace` | Ritmo (min/km) |
| `percent_max_hr` | % FC máxima |
| `percent_ftp` | % FTP |

---

## Ejemplo: Workout en C# (FIT SDK Oficial)

```csharp
using Dynastream.Fit;

// Crear archivo FIT
FileEncoder encoder = new FileEncoder("vo2max.fit", FileType.Workout);

// File ID
FileIdMesg fileId = new FileIdMesg();
fileId.SetType(FileType.Workout);
fileId.SetManufacturer(Manufacturer.Development);
fileId.SetProduct(0);
fileId.SetSerialNumber(12345);
fileId.SetTimeCreated(new Dynastream.Fit.DateTime(System.DateTime.UtcNow));
encoder.Write(fileId);

// Workout
WorkoutMesg workout = new WorkoutMesg();
workout.SetSport(Sport.Cycling);
workout.SetNumValidSteps(7); // warmup + 5×(interval+rest) + cooldown → aplanado
workout.SetWktName("VO2max: 5x3min @ 115%");
encoder.Write(workout);

// Paso 1: Warmup 15min @ 55% FTP
WorkoutStepMesg step1 = new WorkoutStepMesg();
step1.SetDurationType(WktStepDuration.Time);
step1.SetDurationValue(900); // 15 min en segundos
step1.SetTargetType(WktStepTarget.Power);
step1.SetTargetValue(55); // 55% FTP
step1.SetIntensity(Intensity.Warmup);
encoder.Write(step1);

// Pasos 2-11: 5 repeticiones (interval + rest)
for (int i = 0; i < 5; i++) {
    // Intervalo: 3min @ 115% FTP
    WorkoutStepMesg interval = new WorkoutStepMesg();
    interval.SetDurationType(WktStepDuration.Time);
    interval.SetDurationValue(180);
    interval.SetTargetType(WktStepTarget.PercentFtp);
    interval.SetTargetValue(115);
    interval.SetIntensity(Intensity.Active);
    encoder.Write(interval);
    
    // Descanso: 3min @ 50% FTP
    WorkoutStepMesg rest = new WorkoutStepMesg();
    rest.SetDurationType(WktStepDuration.Time);
    rest.SetDurationValue(180);
    rest.SetTargetType(WktStepTarget.PercentFtp);
    rest.SetTargetValue(50);
    rest.SetIntensity(Intensity.Rest);
    encoder.Write(rest);
}

// Paso final: Cooldown 10min @ 50% FTP
WorkoutStepMesg cooldown = new WorkoutStepMesg();
cooldown.SetDurationType(WktStepDuration.Time);
cooldown.SetDurationValue(600);
cooldown.SetTargetType(WktStepTarget.PercentFtp);
cooldown.SetTargetValue(50);
cooldown.SetIntensity(Intensity.Cooldown);
encoder.Write(cooldown);

encoder.Close();
```

---

## Ejemplo: Workout en Python (FIT SDK Community)

```python
from fit_tool.fit_file import FitFile
from fit_tool.profile.messages.file_id_message import FileIdMessage
from fit_tool.profile.messages.workout_message import WorkoutMessage
from fit_tool.profile.messages.workout_step_message import WorkoutStepMessage
from fit_tool.profile.profile_type import Sport, WorkoutStepDurationType, WorkoutStepTargetType, Intensity, FileType

# Crear archivo
fit_file = FitFile()

# File ID
file_id = FileIdMessage()
file_id.type = FileType.WORKOUT
file_id.manufacturer = 1  # Development
file_id.product = 0
fit_file.messages.append(file_id)

# Workout header
workout = WorkoutMessage()
workout.sport = Sport.CYCLING
workout.num_valid_steps = 7  # flat count
workout.wkt_name = "VO2max: 5x3min @ 115%"
fit_file.messages.append(workout)

# Steps
def add_step(fit_file, duration_type, duration_value, target_type, target_value, intensity):
    step = WorkoutStepMessage()
    step.duration_type = duration_type
    step.duration_value = duration_value
    step.target_type = target_type
    step.target_value = target_value
    step.intensity = intensity
    fit_file.messages.append(step)

# Warmup
add_step(fit_file, WorkoutStepDurationType.TIME, 900, WorkoutStepTargetType.PERCENT_FTP, 55, Intensity.WARMUP)

# 5 intervals
for _ in range(5):
    add_step(fit_file, WorkoutStepDurationType.TIME, 180, WorkoutStepTargetType.PERCENT_FTP, 115, Intensity.ACTIVE)
    add_step(fit_file, WorkoutStepDurationType.TIME, 180, WorkoutStepTargetType.PERCENT_FTP, 50, Intensity.REST)

# Cooldown
add_step(fit_file, WorkoutStepDurationType.TIME, 600, WorkoutStepTargetType.PERCENT_FTP, 50, Intensity.COOLDOWN)

# Guardar
with open('workout.fit', 'wb') as f:
    f.write(fit_file.to_bytes())
```

---

## structured-workout-format (Python, más simple)

```python
from structured_workout_format.formats.fit import FitWorkoutBuilder

# Definir workout como diccionario
workout_def = {
    "name": "VO2max: 5x3min @ 115%",
    "sport": "bike",
    "author": "PROY Coach",
    "description": "5 intervales VO2max con descanso 1:1",
    "steps": [
        {"type": "warmup", "duration": 900, "target": {"type": "power", "zone": 1}},
        {"type": "repeat", "count": 5, "steps": [
            {"type": "interval", "duration": 180, "target": {"type": "power", "zone": 5}},
            {"type": "rest", "duration": 180, "target": {"type": "power", "zone": 1}},
        ]},
        {"type": "cooldown", "duration": 600, "target": {"type": "power", "zone": 1}},
    ]
}

# Generar .FIT
builder = FitWorkoutBuilder(workout_def)
fit_bytes = builder.build()

with open("vo2max.fit", "wb") as f:
    f.write(fit_bytes)
```

---

## Notas Importantes

1. **Aplanar repeticiones**: Los dispositivos Garmin no entienden `repeat` steps en todos los modelos. Para máxima compatibilidad, aplanar (flat) todas las repeticiones como steps individuales.

2. **Duración máxima**: Garmin Edge tiene un límite de ~40 steps totales por workout. Para entrenos con muchas repeticiones, considerar agrupar.

3. **Target types**: 
   - `PercentFtp` (valor 0-255 como % de FTP) — ideal para potencia
   - `PercentMaxHr` (valor 0-255 como % de FC máx) — ideal para HR
   - `Power` (watts absolutos) — si el FTP de la persona cambia, el workout queda desfasado

4. **Orden de carga al dispositivo**:
   - Garmin Edge: copiar .fit a `GARMIN/NewFiles/`
   - Wahoo: solo vía Companion App (no directo por USB)
   - Karoo: copiar a `Workouts/` por USB

5. **Test**: Subir el .fit y verificar que aparece correctamente en Training → Workouts con los pasos y targets esperados.
