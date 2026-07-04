#!/usr/bin/env node
// Importa GASTOS .xlsx (hoja "Gastos") a las tablas de Finanzas en Supabase.
// Uso:
//   node --env-file=.env import-gastos.mjs            (dry-run, no escribe nada)
//   node --env-file=.env import-gastos.mjs --commit    (inserta de verdad)

import XLSX from 'xlsx'
import path from 'node:path'

const COMMIT = process.argv.includes('--commit')
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (COMMIT && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno (usa --env-file=.env)')
  process.exit(1)
}

const XLSX_PATH = path.resolve(import.meta.dirname, '..', '..', 'GASTOS .xlsx')

const MONTH_NAMES = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
const MONTH_COL_START = 4
const MONTH_COL_END = 18 // inclusive: May-25 .. Jul-26 (mes actual). No se importan meses futuros proyectados.

function parseMonthLabel(label) {
  const [mon, yy] = label.split('-')
  return new Date(Date.UTC(2000 + Number(yy), MONTH_NAMES[mon], 1)).toISOString().slice(0, 10)
}

function parseMoney(cell) {
  if (cell === '' || cell == null) return null
  const cleaned = String(cell).replace(/\$/g, '').replace(/,/g, '').trim()
  if (cleaned === '') return null
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

function sumRows(rows, rowIndices, col) {
  let total = null
  for (const r of rowIndices) {
    const v = parseMoney(rows[r][col])
    if (v != null) total = (total ?? 0) + v
  }
  return total
}

function lastNonEmpty(row) {
  for (let c = MONTH_COL_END; c >= MONTH_COL_START; c--) {
    const v = parseMoney(row[c])
    if (v != null) return v
  }
  return null
}

const wb = XLSX.readFile(XLSX_PATH)
const sheet = wb.Sheets['Gastos']
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })

const monthCols = []
for (let c = MONTH_COL_START; c <= MONTH_COL_END; c++) {
  monthCols.push({ col: c, periodo: parseMonthLabel(rows[0][c]) })
}

// ---------- Ingresos ----------
// Omitido por ahora: los montos de la hoja son estimados y varían cuando llega
// el desprendible de nómina real. Se cargará mes a mes desde la UI.
const ingresos = []

// ---------- Gastos variables ----------
const gastosVariables = []
function addGasto(categoria, concepto, rowIndices) {
  for (const { col, periodo } of monthCols) {
    const monto = sumRows(rows, rowIndices, col)
    if (monto != null) gastosVariables.push({ categoria, concepto, monto, periodo })
  }
}

addGasto('Servicios', 'Luz', [14])
addGasto('Servicios', 'Agua', [15])
addGasto('Servicios', 'Gas', [16])
addGasto('Servicios', 'Internet', [17])

addGasto('Alimentación', 'Almuerzos/Comida', [71])

addGasto('Transporte', 'Gasolina', Array.from({ length: 14 }, (_, i) => 50 + i)) // filas 50-63
addGasto('Transporte', 'Llantas', [64, 65])
addGasto('Transporte', 'Kit de Arrastre', [66])
addGasto('Transporte', 'Pastillas', [67, 68])
addGasto('Transporte', 'Aceite', [69])
addGasto('Transporte', 'Extras', [72, 73])

addGasto('Familia', 'Pensión', [33])
addGasto('Familia', 'ASW', [34])
addGasto('Familia', 'Mercado 1', [35])
addGasto('Familia', 'Mercado 2', [36])
addGasto('Familia', 'Pasajes', [37])
addGasto('Familia', 'GYM', [38])
addGasto('Familia', 'Extras', [39, 40, 41, 42])

// ---------- Gastos fijos ----------
const gastosFijos = [
  { row: 26, nombre: 'TV Streaming' },
  { row: 27, nombre: 'Ceci' },
  { row: 28, nombre: 'Gafas Ma' },
  { row: 29, nombre: 'Google One' },
  { row: 30, nombre: 'Parqueadero' },
].map(({ row, nombre }) => ({
  nombre,
  monto: lastNonEmpty(rows[row]),
  tipo: 'indefinido',
  cuotas_totales: null,
  cuotas_pagadas: 0,
  activo: true,
}))

// ---------- Deudas ----------
const deudas = [
  { row: 21, concepto: 'Deuda' },
  { row: 22, concepto: 'Cartera' },
  { row: 23, concepto: 'Conciliación' },
  { row: 24, concepto: 'TDC Master' },
  { row: 25, concepto: 'Cuotas pendientes' },
].map(({ row, concepto }) => ({
  persona: 'Hermana',
  concepto,
  monto_original: parseMoney(rows[row][2]),
  saldo_actual: parseMoney(rows[row][3]),
  pago_mensual: lastNonEmpty(rows[row]),
  activa: true,
}))

// ---------- Resumen ----------
const fmt = (n) => (n == null ? '—' : `$${n.toLocaleString('es-CO')}`)
const sum = (arr, key) => arr.reduce((a, r) => a + (r[key] || 0), 0)

console.log(`=== RESUMEN (${COMMIT ? 'COMMIT' : 'dry-run'}) ===\n`)
console.log(`Ingresos: ${ingresos.length} registros, total ${fmt(sum(ingresos, 'monto'))}`)
console.log(`Gastos variables: ${gastosVariables.length} registros, total ${fmt(sum(gastosVariables, 'monto'))}`)
console.log(`Gastos fijos: ${gastosFijos.length} registros`)
gastosFijos.forEach((g) => console.log(`  - ${g.nombre}: ${fmt(g.monto)}`))
console.log(`Deudas: ${deudas.length} registros`)
deudas.forEach((d) => console.log(`  - ${d.concepto}: saldo ${fmt(d.saldo_actual)}, pago mensual ${fmt(d.pago_mensual)}`))

console.log('\nMuestra de gastos variables (primeros 8):')
gastosVariables.slice(0, 8).forEach((g) => console.log('  ', JSON.stringify(g)))

if (!COMMIT) {
  console.log('\nDry-run — no se escribió nada. Corre con --commit para insertar de verdad.')
  process.exit(0)
}

// ---------- Insertar ----------
async function supabaseInsert(table, records) {
  if (records.length === 0) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(records),
  })
  if (!res.ok) {
    throw new Error(`Error insertando en ${table}: ${res.status} ${await res.text()}`)
  }
}

const catRes = await fetch(`${SUPABASE_URL}/rest/v1/finanzas_categorias_gasto?select=id,nombre`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
})
const categorias = await catRes.json()
const catByName = Object.fromEntries(categorias.map((c) => [c.nombre, c.id]))

const gastosVariablesConCategoria = gastosVariables.map((g) => ({
  categoria_id: catByName[g.categoria],
  concepto: g.concepto,
  monto: g.monto,
  periodo: g.periodo,
}))

console.log('\nInsertando...')
await supabaseInsert('finanzas_ingresos', ingresos)
await supabaseInsert('finanzas_gastos_variables', gastosVariablesConCategoria)
await supabaseInsert('finanzas_gastos_fijos', gastosFijos)
await supabaseInsert('finanzas_deudas', deudas)
console.log('Listo.')
