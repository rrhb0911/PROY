# Módulo: Documentos — PROY

## Visión General

Repositorio centralizado de documentos personales importantes: identificación, financieros, contractuales, garantías. Control de fechas de vencimiento y alertas.

---

## Categorías

| Categoría | Documentos | Vencimiento |
|-----------|-----------|-------------|
| **Identificación** | Cédula, pasaporte, licencia conducción | Pasaporte: renovar |
| **Vehicular** | SOAT, tecnomecánica, seguro moto | SOAT anual |
| **Financiero** | Estados de cuenta, facturas, recibos | — |
| **Contractual** | Contratos laborales, acuerdos con clientes | Según contrato |
| **Garantías** | Laptop, bici, sensores, dispositivos | 1–2 años |
| **Salud** | EPS, citas, resultados exámenes | — |
| **Vivienda** | Contrato arriendo, recibos servicios | — |

---

## Estructura

```
documentos/
├── identificacion/
│   ├── cedula.md
│   ├── pasaporte.md        # Número, fecha vencimiento, renovación
│   └── licencia.md
├── vehiculo/
│   ├── soat.md             # Fecha vencimiento, aseguradora
│   ├── tecnomecanica.md
│   └── seguro.md
├── financieros/
│   ├── extractos/          # Bancarios mensuales
│   ├── facturas/           # Facturas electrónicas
│   └── recibos/            # Servicios, arriendo
├── contractuales/
│   ├── transcom.md         # Contrato laboral
│   ├── vitaldent.md        # Acuerdo con VitalDent
│   ├── zammy.md            # Acuerdo con Zammy
│   └── angela.md           # Acuerdo con Dra. Angela
├── garantias/
│   ├── laptop.md
│   ├── bici.md
│   └── sensores.md
├── dashboard/
│   └── vencimientos.md     # Próximos vencimientos ordenados
└── templates/
    └── documento.md        # Template para nuevo documento
```

---

## Template de Documento

```markdown
# [Nombre del Documento]

- **Tipo**: [Identificación / Contractual / Financiero / Garantía / Salud]
- **Número / Referencia**: —
- **Emisor**: —
- **Fecha de emisión**: —
- **Fecha de vencimiento**: —
- **Alerta**: [30 días antes / 15 días antes]
- **Ubicación física**: —
- **Copia digital**: [link a Google Drive]
- **Notas**: —
```

---

## Calendario de Vencimientos

| Fecha | Documento | Acción Requerida |
|-------|-----------|------------------|
| — | SOAT | Renovar |
| — | Pasaporte | Renovar |
| — | Tarjeta de crédito | Pago |
| — | Contrato arriendo | Revisión |
