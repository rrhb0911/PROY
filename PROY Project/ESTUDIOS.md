# Módulo de Estudios — PROY

## Visión General

Bitácora de aprendizaje personal. Centraliza cursos, notas, recursos y proyectos educativos. Funciona como un **Notebook LM personal** basado en markdown, con capacidad futura de conectar con Google NotebookLM para generar resúmenes, podcasts y material de estudio desde las notas.

---

## Áreas de Estudio

| Área | Temas | Estado | Prioridad |
|------|-------|--------|-----------|
| **Programación** | Next.js, React, TypeScript, Python, algoritmos | Activo | Alta |
| **Trading Algorítmico** | Estrategias, backtesting, cTrader, Binance API | En inicio | Alta |
| **Ciclismo / Entrenamiento** | Fisiología, periodización, WKO5, nutrición | Activo | Media |
| **Finanzas Personales** | Presupuesto, inversión, deudas | Activo | Alta |
| **Data Science / ML** | Análisis de datos, machine learning | Planeado | Baja |
| **Inglés** | Práctica, vocabulario, certificación | Planeado | Media |

---

## Estructura

```
estudios/
├── recursos/
│   ├── libros.md                # Libros leídos / por leer
│   ├── cursos.md                # Cursos en plataformas (Platzi, etc.)
│   ├── articulos.md             # Artículos relevantes guardados
│   └── herramientas.md          # Software, extensiones, utilidades
├── notas/
│   ├── programacion/
│   │   ├── next-js.md
│   │   ├── react.md
│   │   ├── typescript.md
│   │   └── python.md
│   ├── trading/
│   │   ├── estrategias.md
│   │   └── analisis-tecnico.md
│   ├── ciclismo/
│   │   ├── fisiologia.md
│   │   └── periodizacion.md
│   └── finanzas/
│       ├── conceptos.md
│       └── inversion.md
├── proyectos/
│   ├── app-01.md                # Proyecto Platzi
│   └── pds-parser.md            # PDS Parser tool
├── dashboard/
│   ├── progreso.md              # Seguimiento semanal de estudio
│   └── metas.md                 # OKRs trimestrales
└── scripts/
    └── generate-flashcards.py   # Generar flashcards desde notas
```

---

## Integración con Google NotebookLM

NotebookLM permite crear un "notebook" de estudio con los archivos markdown de `estudios/notas/`:

**Flujo propuesto:**
1. Exportar notas markdown a Google Drive
2. Importar a NotebookLM como fuentes
3. NotebookLM genera:
   - Resúmenes automáticos
   - FAQs y guías de estudio
   - Podcasts con discusión de los temas
   - Líneas de tiempo y conexiones entre conceptos
4. Los insights generados se importan de vuelta a `estudios/notas/`

---

## Metas Trimestrales

| Q | Meta | Estado | Notas |
|---|------|--------|-------|
| Q3 2026 | Completar fundamentos de trading algorítmico | — | — |
| Q3 2026 | Leer 2 libros de finanzas/entrenamiento | — | — |
| Q4 2026 | Curso avanzado de Next.js | — | — |
| Q1 2027 | Proyecto práctico de ML aplicado a trading | — | — |

---

## Tiempo de Estudio

| Día | Horas | Actividad |
|-----|-------|-----------|
| Lunes | 1h | Trading / programación |
| Miércoles | 1h | Ciclismo / fisiología |
| Viernes | 1h | Finanzas / lectura |
| Sábado | 2h | Proyecto práctico |
