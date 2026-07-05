// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © HoanGhetti - Adaptado y Unificado por Gemini para estilo [RRHB]

//@version=5
indicator("RSI & Volumen Híbrido [RRHB]", precision = 2, max_labels_count = 500, max_lines_count = 500, overlay = false)
import HoanGhetti/SimpleTrendlines/3 as tl

// --- CONFIGURACIÓN DE COLORES [RRHB] ---
colorPurpura    = #9c27b0  // Púrpura para Soporte / Compra / Subida
colorAzul = #00bcd4  // Azul 00bcd4 para Resistencia / Venta / Bajada

// --- GRUPOS DE ENTRADA ---
g_trendlines    = 'Trendline Settings'
g_conditions    = 'Conditions'
g_styling       = 'Styling'
g_timeframe     = 'Timeframe'
g_volume        = 'Configuración Volumen'

// --- INPUTS RSI ---
input_timeframe = input.timeframe(defval = '', title = 'Timeframe RSI', group = g_timeframe)
input_pLen      = input.int(defval = 4, title = 'Lookback Range', minval = 1, group = g_trendlines, tooltip = 'Barras para detectar swing high/low.')
input_rLen      = input.int(defval = 14, title = 'RSI Length' , minval = 1, group = g_trendlines)
input_rSrc      = input.source(defval = close, title = 'RSI Source', group = g_trendlines)
input_repaint   = input.string(defval = 'On', title = 'Repainting', group = g_conditions, options = ['On', 'Off: Bar Confirmation'])
input_rsiDiff   = input.int(defval = 3, title = 'RSI Difference', group = g_conditions)

// --- INPUTS ESTILO RSI ---
input_rsiCol    = input.color(defval = color.rgb(255, 255, 255, 0), title = 'RSI Line Color', group = g_styling)
input_width     = input.int(defval = 3, title = 'Line Width', minval = 1, group = g_styling)
input_lblType   = input.string(defval = 'Simple', title = 'Label Type', group = g_styling, options = ['Full', 'Simple'])
input_lblSize   = input.string(defval = size.small, title = 'Label Size', group = g_styling, options = [size.huge, size.large, size.normal, size.small, size.tiny])
input_pLowCol   = input.color(defval = colorPurpura, title = 'Pivot Low (Soporte)', inline = 'col', group = g_styling)
input_pHighCol  = input.color(defval = colorAzul, title = 'Pivot High (Resistencia)', inline = 'col', group = g_styling)
input_override  = input.bool(defval = false, title = 'Override Text Color', group = g_styling, inline = 'override')
input_overCol   = input.color(defval = color.white, title = ' ', group = g_styling, inline = 'override')

// --- INPUTS VOLUMEN ---
showVolume      = input.bool(true, "Mostrar Volumen en el fondo", group = g_volume)
volOpacity      = input.int(25, "Transparencia Volumen", minval = 0, maxval = 100, group = g_volume)
input_volMA     = input.int(20, "Media Móvil Volumen", minval = 1, group = g_volume)

// --- LÓGICA RSI ---
lblText = switch input_lblType
    'Simple' => 'Br'
    'Full'   => 'Break'
repaint = switch input_repaint
    'On' => true
    'Off: Bar Confirmation' => false

rsi_v = ta.rsi(input_rSrc, input_rLen) 
rsi = input_timeframe == '' ? rsi_v : request.security(syminfo.tickerid, input_timeframe, rsi_v, lookahead = barmerge.lookahead_on)

pl = fixnan(ta.pivotlow(rsi, 1, input_pLen))
ph = fixnan(ta.pivothigh(rsi, 1, input_pLen))

pivot(float pType) =>
    pivot = pType == pl ? pl : ph
    xAxis = ta.valuewhen(ta.change(pivot), bar_index, 0) - ta.valuewhen(ta.change(pivot), bar_index, 1)
    prevPivot = ta.valuewhen(ta.change(pivot), pivot, 1)
    pivotCond = ta.change(pivot) and (pType == pl ? pivot > prevPivot : pivot < prevPivot)
    pData = tl.new(x_axis = xAxis, offset = input_pLen, strictMode = true, strictType = pType == pl ? 0 : 1)
    pData.drawLine(pivotCond, prevPivot, pivot, rsi)
    pData

breakout(tl.Trendline this, float pType) =>
    var bool hasCrossed = false
    if ta.change(this.lines.startline.get_y1())
        hasCrossed := false
    this.drawTrendline(not hasCrossed)
    condType = (pType == pl ? rsi < this.lines.trendline.get_y2() - input_rsiDiff : rsi > this.lines.trendline.get_y2() + input_rsiDiff) and not hasCrossed
    condition = repaint ? condType : condType and barstate.isconfirmed
    if condition
        hasCrossed := true
        this.lines.startline.set_xy2(this.lines.trendline.get_x2(), this.lines.trendline.get_y2())
        this.lines.trendline.set_xy2(na, na)
        this.lines.startline.copy()
        label.new(
             bar_index, 
             this.lines.startline.get_y2(), 
             text = lblText, color = pType == pl ? color.new(input_pLowCol, 50) : color.new(input_pHighCol, 50), 
             size = input_lblSize, style = pType == pl ? label.style_label_lower_left : label.style_label_upper_left, 
             textcolor = pType == pl ? (input_override ? input_overCol : input_pLowCol) : input_override ? input_overCol : input_pHighCol)
    hasCrossed

method style(tl.Trendline this, color col) =>
    this.lines.startline.set_color(col)
    this.lines.startline.set_width(input_width)
    this.lines.trendline.set_color(col)
    this.lines.trendline.set_width(input_width)
    this.lines.trendline.set_style(line.style_dashed)

plData = pivot(pl)
phData = pivot(ph)
plData.style(input_pLowCol)
phData.style(input_pHighCol)
cu = breakout(plData, pl)
co = breakout(phData, ph)

// --- LÓGICA DE VOLUMEN NORMALIZADO ---
// Normalizamos el volumen para que quepa en la escala 0-100 del RSI sin deformarlo
maxVol = ta.highest(volume, 100)
volScaled = (volume / maxVol) * 25 // El volumen ocupará el X% inferior del panel
volMAScaled = ta.sma(volScaled, input_volMA)
volColor = close > open ? color.new(colorAzul, volOpacity) : color.new(colorPurpura, volOpacity)

// --- TRAZADO FINAL (PLOT) ---

// 1. Dibujar Volumen al fondo
plot(showVolume ? volScaled : na, title="Volumen Escalado", style=plot.style_columns, color=volColor)
plot(showVolume ? volMAScaled : na, title="Media Móvil Vol", color=color.new(color.gray, 0), linewidth=1)

// 2. Dibujar RSI y Niveles
hline(70, title = 'Overbought', color = colorPurpura, linestyle = hline.style_dotted)
hline(50, title = 'Overbought', color = color.white, linestyle = hline.style_dotted)
hline(30, title = 'Oversold', color = colorAzul, linestyle = hline.style_dotted)
plot(rsi, title = 'Relative Strength Index', linewidth = 2, color = input_rsiCol)