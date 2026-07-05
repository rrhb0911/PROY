# Algoritmos Extraídos de GoldenCheetah

## Fuente

Repositorio: https://github.com/GoldenCheetah/GoldenCheetah
Licencia: GPL v2 — podemos usar como referencia para implementación propia.

Archivos clave:
- `src/Metrics/` — implementación de todas las métricas
- `src/Metrics/AerobicPower.*` — CP, W', modelos aeróbicos
- `src/Metrics/PMC.*` — Performance Manager (CTL/ATL/TSB)
- `src/Metrics/RideMetrics.*` — TSS, NP, IF, VI

---

## 1. Critical Power (CP) — Modelo 3 Parámetros

**Archivo:** `src/Metrics/AerobicPower.cpp`

### Modelo Monod-Scherrer extendido:

```
P(t) = W' / t + CP
```

Donde:
- `P(t)` = potencia máxima sostenible para duración `t`
- `CP` = Critical Power (asíntota de la curva)
- `W'` = trabajo anaeróbico disponible (joules sobre CP)

### Implementación en GC:

1. Recopila mejores potencias medias para duraciones: 1s, 5s, 10s, 15s, 20s, 30s, 1min, 2min, 3min, 5min, 10min, 15min, 20min, 30min, 40min, 60min, 90min, 120min
2. Aplica regresión no lineal para ajustar CP y W'
3. Usa el modelo de 3 parámetros (CP, W', PMAX) para mejor precisión:

```
P(t) = PMAX  (para t → 0)
P(t) = W' / (t - t_offset) + CP  (para t > t_offset)
```

### Cálculo en GC:

```cpp
// Pseudocódigo basado en src/Metrics/AerobicPower.cpp
struct CriticalPowerResult {
    double cp;     // Critical Power en watts
    double w_;     // W' en kJ
    double pmax;   // Potencia máxima instantánea
};

CriticalPowerResult calculateCP(const std::vector<double>& bestPowers,
                                 const std::vector<double>& durations) {
    // Ajuste por mínimos cuadrados no lineales
    // Modelo: P = W'/t + CP
    // Transformación lineal: P · t = W' + CP · t
    // Regresión lineal de (P·t) vs t → pendiente = CP, intercepto = W'
    
    // Para 3 parámetros (CP, W', PMAX):
    // P(t) = min(PMAX, W'/t + CP)
    
    // GC usa Levenberg-Marquardt para optimizar
}
```

---

## 2. W' y W'bal (Anaeróbico en Tiempo Real)

**Archivo:** `src/Metrics/AerobicPower.cpp`

### W'bal — Modelo de balance W':

```
W'bal(t) = W' - ∫(P - CP)dt  (cuando P > CP)
W'bal(t) = W' - ∫(P - CP) · exp((t - t0) / τ)dt  (recuperación)
```

Donde `τ` es la constante de tiempo de recuperación:
- `τ = 300s` (defecto en GC, configurable)

### Implementación:

```cpp
// Pseudocódigo W'bal
double calculateWbal(double cp, double w_, const std::vector<double>& power, double tau = 300) {
    double w_bal = w_;
    double last_time_over = 0;
    
    for (int i = 0; i < power.size(); i++) {
        double p = power[i];
        double dt = 1.0;  // asumiendo datos 1s
        
        if (p > cp) {
            // Gasto de W'
            w_bal -= (p - cp) * dt;
            last_time_over = i;
        } else {
            // Recuperación exponencial
            double time_since_over = (i - last_time_over) * dt;
            double recovery = (w_ - w_bal) * (1 - exp(-time_since_over / tau));
            w_bal += recovery;
        }
        
        w_bal = std::min(w_bal, w_);  // No exceder W' original
        w_bal = std::max(w_bal, 0.0); // No negativo
    }
    
    return w_bal;
}
```

---

## 3. PMC — Performance Manager (CTL / ATL / TSB)

**Archivo:** `src/Metrics/PMC.*`

### Fórmulas:

```
CTL = EMA(TSS, 42)   → Exponencialmente ponderado, 42 días
ATL = EMA(TSS, 7)    → Exponencialmente ponderado, 7 días
TSB = CTL - ATL      → Forma (balance)
```

### EMA (Exponential Moving Average):

```
EMA(t) = EMA(t-1) + (TSS(t) - EMA(t-1)) * (1 - exp(-dt / τ))

Donde:
τ = período en días (42 para CTL, 7 para ATL)
dt = tiempo desde última muestra (en días)
```

### Implementación en GC:

```cpp
// Pseudocódigo PMC
double ema(double previous, double tss, double days_constant, double dt = 1.0) {
    double k = 1.0 - exp(-dt / days_constant);
    return previous + k * (tss - previous);
}

// Cálculo diario
ctl = ema(ctl_yesterday, tss_today, 42);
atl = ema(atl_yesterday, tss_today, 7);
tsb = ctl - atl;
```

---

## 4. TSS — Training Stress Score

**Archivo:** `src/Metrics/RideMetrics.cpp`

### Fórmula estándar (Coggan):

```
TSS = (segundos × NP × IF) / (FTP × 3600) × 100

Donde:
NP = Normalized Power
IF = NP / FTP
FTP = Functional Threshold Power
```

### Implementación:

```cpp
double calculateTSS(double seconds, double np, double ftp) {
    double if_ = np / ftp;
    return (seconds * np * if_) / (ftp * 3600.0) * 100.0;
}
```

---

## 5. NP — Normalized Power

### Fórmula:

```
1. Media móvil 30 segundos de la potencia
2. Elevar cada valor a la 4ª potencia
3. Media de esos valores
4. Raíz 4ª del resultado
```

### Implementación:

```cpp
double calculateNP(const std::vector<double>& power, int window = 30) {
    // Paso 1: media móvil 30s
    std::vector<double> rolling;
    for (int i = window - 1; i < power.size(); i++) {
        double sum = 0;
        for (int j = i - window + 1; j <= i; j++) {
            sum += power[j];
        }
        rolling.push_back(sum / window);
    }
    
    // Paso 2: elevar a 4ª potencia
    double sum4 = 0;
    for (double val : rolling) {
        double v4 = val * val * val * val;
        sum4 += v4;
    }
    
    // Paso 3: media
    double mean4 = sum4 / rolling.size();
    
    // Paso 4: raíz 4ª
    return pow(mean4, 0.25);
}
```

**Optimización de GC:** usa un algoritmo de ventana deslizante O(n) en lugar del O(n×w) ingenuo.

---

## 6. IF — Intensity Factor

```
IF = NP / FTP
```

Rango típico: 0.55 (recuperación) a 1.05 (contrarreloj).

---

## 7. VI — Variability Index

```
VI = NP / AP (Average Power)
```

- VI > 1.15 → potencia muy variable (mucho drafting o esfuerzos entrecortados)
- VI ~ 1.0 → esfuerzo constante (contrarreloj)

---

## 8. BikeStress / TRIMP

GC implementa métricas alternativas:
- **BikeStress**: similar a TSS pero usando potencia absoluta (no normalizada)
- **TRIMP**: Training Impulse basado en HR (zona × minutos)

---

## 9. Zonas de Potencia (Coggan)

```cpp
enum class PowerZone {
    Z1 = 1,  // < 55% FTP — Recuperación activa
    Z2 = 2,  // 56-75% FTP — Resistencia aeróbica
    Z3 = 3,  // 76-90% FTP — Tempo
    Z4 = 4,  // 91-105% FTP — Umbral funcional
    Z5 = 5,  // 106-120% FTP — VO2max
    Z6 = 6   // > 120% FTP — Anaeróbico
};
```

---

## Resumen de Archivos en GC

| Archivo | Métricas |
|---------|----------|
| `src/Metrics/AerobicPower.cpp` | CP, W', W'bal, PMAX, modelo 3 parámetros |
| `src/Metrics/PMC.cpp` | CTL, ATL, TSB, LTS, STS |
| `src/Metrics/RideMetrics.cpp` | TSS, NP, IF, VI, AP, kJ |
| `src/Metrics/BikeStress.cpp` | BikeStress, TRIMP |
| `src/Metrics/PeakPower.cpp` | Mejores potencias para cada duración (PDC) |
| `src/Metrics/Zones.cpp` | Zonas FTP, tiempo en zonas |

---

## Notas para Implementación Propia

1. **CP + W'**: El modelo lineal (P·t vs t) es suficientemente preciso para empezar. Mejorar con 3 parámetros después.
2. **W'bal**: La constante de recuperación τ por defecto es 300s. Se puede calibrar individualmente (rangos reportados: 200-600s).
3. **TSS**: Requiere NP, que requiere datos segundo a segundo. Si solo hay datos promediados (ej. cada 30s), el NP será menos preciso.
4. **PMC**: Solo necesita TSS diario. Se puede empezar desde 0 (CTL=ATL=TSB=0) y acumular datos progresivamente.
5. **PDC**: Requiere al menos 6-8 semanas de datos para una curva confiable.
