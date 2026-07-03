# Módulo de Finanzas Personales — PROY

## Visión General

Control unificado de ingresos, gastos, deudas y patrimonio. Vincula tu trabajo actual (Transcom), trabajos alternos (proyectos freelance), y todos los egresos categorizados del archivo `GASTOS.xlsx`.

---

## Fuente de Datos

### GASTOS.xlsx (archivo maestro)
Ubicación: `PROY/GASTOS .xlsx`

| Categoría | Subcategorías | Periodo |
|-----------|--------------|---------|
| **Ingresos** | Transcom (trabajo), Moto (side), Otros | May 2025 – Ene 2027 |
| **Egresos** | Alimentos, Servicios, Deudas, Sarah, Moto, Apto Fusa | Mensual |
| **Deudas** | Sony, Cartera, TDC Master, Streaming, Ceci, Parqueadero, etc. | Saldo + cuota mensual |
| **Ahorro** | Neto mensual acumulado | Histórico + proyectado |

---

## Estructura

```
finanzas/
├── config/
│   └── cuentas.json            # Categorías, cuentas bancarias
├── ingresos/
│   ├── transcom.md             # Nómina, bonos, prestaciones
│   └── freelance.md            # Proyectos externos (VitalDent, Zammy, Angela)
├── gastos/
│   ├── fijos/                  # Servicios, deudas, suscripciones
│   ├── variables/              # Alimentos, gasolina, extras
│   └── anuales/                # Seguros, impuestos, mantenimientos
├── deudas/
│   ├── cartera.md              # Plan de pago
│   ├── tdc-master.md           # Estado de cuenta
│   └── calendario-pagos.md     # Próximos vencimientos
├── dashboard/
│   ├── flujo-efectivo.md       # Ingresos vs egresos mensual
│   └── patrimonio.md           # Evolución de activos/pasivos
└── scripts/
    ├── import-excel.py         # Importar GASTOS.xlsx a Supabase
    └── sync-ingresos.py        # Actualizar ingresos desde proyectos
```

---

## Conexiones

### Proyectos → Finanzas
Cada proyecto en PROY puede generar ingresos. El módulo de **Proyectos** alimenta `finanzas/ingresos/freelance.md` con:
- Costo del proyecto
- Entregas facturadas
- Fechas de cobro

### Trading → Finanzas
Las ganancias/pérdidas de trading se reflejan en el flujo de caja mensual.

---

## Indicadores Clave

| Métrica | Cálculo | Frecuencia |
|---------|---------|------------|
| **Ingreso mensual** | Transcom + freelance | Mensual |
| **Gasto mensual** | Suma de todas las categorías | Mensual |
| **Neto mensual** | Ingresos - Egresos | Mensual |
| **Tasa de ahorro** | Neto / Ingresos × 100 | Mensual |
| **Deuda total** | Suma de saldos de todas las deudas | Mensual |
| **Relación deuda/ingreso** | Deuda total / Ingreso anual | Trimestral |
| **Patrimonio neto** | Activos - Pasivos | Trimestral |

---

## Deudas Actuales

| Deuda | Saldo | Cuota Mensual | Tasa | Estrategia |
|-------|-------|---------------|------|------------|
| Sony | $1,724,039 | — | — | Prioridad alta |
| Cartera | $19,862,400 | $413,800 | — | Pago mínimo + abonos |
| TDC Master | $2,643,945 | ~$500,000 | — | Pagar antes de intereses |
| Conciliación | $2,812,000 | $82,000 | — | Pago puntual |
| Otras | ~$1,082,900 | ~$240,000 | — | Streaming, Ceci, Gafas, Google One, Parqueadero |

---

## Proyección

El Excel proyecta hasta Ene 2027. Los ingresos de Transcom aparecen hasta Feb 2026, con ceros después (por actualizar). La tendencia actual muestra déficit a partir de Mar 2026, indicando necesidad de ajustar gastos o aumentar ingresos freelance.

**Objetivos:**
1. Mantener neto mensual positivo
2. Reducir deuda de cartera en 30% antes de Dic 2026
3. Tasa de ahorro > 15%
4. Separar fondo de emergencia (3 meses de gastos)
