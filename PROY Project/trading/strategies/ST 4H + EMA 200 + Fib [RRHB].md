//@version=5

// ---------------------------------------------------------------------------------------
// ?? ESTRATEGIA COMPLETA: SuperTrend HTF/LTF + FRAMA Channel + ICT Sessions
// ---------------------------------------------------------------------------------------

strategy('Estrategia Completa - SuperTrend HTF/LTF + FRAMA + ICT Sessions [RRHB]', 
         'Estrategia Completa [RRHB]', 
         overlay = true, 
         default_qty_type = strategy.percent_of_equity, 
         default_qty_value = 10)

// ---------------------------------------------------------------------------------------
// ??? INPUTS PRINCIPALES ORGANIZADOS POR COMPONENTES
// ---------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------
// 1. CONFIGURACIÓN GENERAL (FIBONACCI)
// ---------------------------------------------------------------------------------------
group_fib        = "?? Fibonacci - Último Impulso"
enable_fibonacci = input.bool (false , "?? Activar Fibonacci"      , group = group_fib, tooltip = "Activa/desactiva el módulo completo")
fib_lookback     = input.int  (50   , "Períodos Búsqueda Impulso" , group = group_fib, inline="fib1", minval = 5, maxval = 100)
fib_min_impulse  = input.float(1.0 , "Impulso Mínimo %"          , group = group_fib, inline="fib1", minval = 0.1, step = 0.1)
fib_extend_right = input.bool (true , "Extender Niveles"         , group = group_fib, inline="fib2")
fib_show_labels  = input.bool (true , "Mostrar Etiquetas"        , group = group_fib, inline="fib2")

// ?? 1. CONFIGURACIÓN GENERAL
group_general = "?? Configuración General"
src = input(close, "Source", group = group_general, tooltip = "Fuente de datos para todos los cálculos")
timezone_input = input.string("America/New_York", "?? Zona Horaria", options = ["America/New_York","UTC","Europe/London","Asia/Tokyo","America/Chicago","America/Los_Angeles","Europe/Berlin","Asia/Hong_Kong","Australia/Sydney"], group = group_general, tooltip = "Zona horaria global para horarios y sesiones")
TIMEZONE_FIJA = timezone_input

// ?? 2. SUPERTREND HTF (HIGH TIME FRAME) - ACTIVACIÓN Y PARÁMETROS
group_st_htf = "?? SuperTrend HTF (High Time Frame)"
enable_supertrend_htf = input.bool(true, "?? Activar SuperTrend HTF", group = group_st_htf, tooltip = "Activa/desactiva el SuperTrend de High Time Frame")
mav = input.string("HULL", "Tipo Media Móvil", 
      options = ['SMA','EMA','WMA','DEMA','TMA','VAR','WWMA','ZLEMA','TSF','HULL','TILL'],
      group = group_st_htf, inline="mv")
length = input.int(38, "Longitud", 1, group = group_st_htf, inline="mv")
Periods = input.int(10, "ATR Períodos", group = group_st_htf, inline="atr")
Multiplier = input.float(0.5, "ATR Multiplicador", step = .1, group = group_st_htf, inline="atr")
changeATR = input.bool(true, "Usar ATR Clásico", group = group_st_htf)
T3a1 = input.float(0.7, "Factor T3 Tillson", step = .1, group = group_st_htf)
supertrend_htf_tf = input.timeframe("", "? Temporalidad SuperTrend HTF", group = group_st_htf)
showsignals = input.bool(false, "Mostrar Señales", group = group_st_htf, inline="vis")
highlighting = input.bool(true, "Resaltar Tendencia", group = group_st_htf, inline="vis")

// ?? 2C. COLORES SUPERTREND - PERSONALIZACIÓN
group_st_colors = "?? Colores SuperTrend"
// SuperTrend HTF
st_htf_up_color = input.color(color.rgb(1, 179, 255), "ST HTF Alcista", group = group_st_colors, inline="st_htf")
st_htf_dn_color = input.color(color.rgb(223, 39, 226), "ST HTF Bajista", group = group_st_colors, inline="st_htf")
st_htf_transparency = input.int(0, "Transparencia HTF", 0, 100, group = group_st_colors, inline="st_htf")

// ?? 3. TRADING - GESTIÓN DE RIESGO
group_trading = "?? Trading y Riesgo"
enable_trading = input.bool(false, "?? Activar Trading Automático", group = group_trading, tooltip = "Activa/desactiva la ejecución automática de operaciones")
operating_hours = input.session("0200-1600", "Horario de Trading", group = group_trading)
tp = input.float(20, "Take Profit", group = group_trading, inline="risk")
sl = input.float(20, "Stop Loss", group = group_trading, inline="risk")
EMA_tendencia = input.int(50, "Períodos EMA Tendencia", group = group_trading)

// ?? 4. FRANJAS HORARIAS DE OPERACIÓN
group_trading_sessions = "?? Franjas Horarias de Operación"
enable_trading_sessions = input.bool(true, "?? Activar Franjas Horarias", group = group_trading_sessions, tooltip = "Activa/desactiva las franjas horarias específicas para operar")

// Franja de Londres
enable_london_session = input.bool(true, "???? Activar Sesión Londres", group = group_trading_sessions, inline="london")
london_trading_hours = input.session("0300-1200", "Horarios Londres", group = group_trading_sessions, inline="london")

// Franja de Nueva York
enable_ny_session = input.bool(true, "???? Activar Sesión Nueva York", group = group_trading_sessions, inline="ny")
ny_trading_hours = input.session("0830-1700", "Horarios Nueva York", group = group_trading_sessions, inline="ny")

// Configuración de cierre
close_on_session_end = input.bool(false, "?? Cerrar en Fin de Sesión Londres", group = group_trading_sessions, tooltip = "Si está activado, cierra posiciones al final de la sesión de Londres")
close_only_ny_session = input.bool(true, "?? Cerrar Solo en Fin de NY", group = group_trading_sessions, tooltip = "Las posiciones solo se cierran al final de la sesión de Nueva York")

// ?? 5. FRAMA CHANNEL - ACTIVACIÓN Y CONFIGURACIÓN
group_frama = "?? FRAMA Channel"
enable_frama = input.bool(true, "?? Activar FRAMA Channel", group = group_frama, tooltip = "Activa/desactiva el componente FRAMA Channel completo")
N = input.int(26, "Longitud FRAMA", minval=2, step = 2, group = group_frama, inline="fr1")
distance = input.float(1, "Distancia Bandas", step = 0.01, minval = 0.3, group = group_frama, inline="fr1")
price_vol = input.string("Price", "Datos Señales", ["Price", "Average Volume"], group = group_frama)
labl_size = input.string("Normal", "Tamaño Etiquetas", ["Small", "Normal", "Large"], group = group_frama)

// ?? 6. COLORES GENERALES
group_colors = "?? Colores"
colorup = input.color(color.new(#01B3FF, 90), "Color Alcista", group = group_colors, inline="col1")
colordown = input.color(color.new(#DF27E2, 90), "Color Bajista", group = group_colors, inline="col1")
frama_color1 = input.color(color.new(#01B3FF, 50), "FRAMA Alcista", group = group_colors, inline="col2")
frama_color2 = input.color(color.new(#DF27E2, 50), "FRAMA Bajista", group = group_colors, inline="col2") 
frama_color3 = input.color(#a2b5ca, "FRAMA Neutral", group = group_colors)
candles = input.bool(false, "Colorear Velas FRAMA", group = group_colors)

// ?? 7. SESIONES BÁSICAS
group_sessions_basic = "?? Sesiones Básicas"
enable_basic_sessions = input.bool(true, "?? Activar Sesiones Básicas", group = group_sessions_basic, tooltip = "Activa/desactiva el sombreado básico de sesiones")
showNY = input.bool(true, "NY", group = group_sessions_basic, inline="ses1")
showASIA = input.bool(true, "Asia", group = group_sessions_basic, inline="ses1")
showLONDON = input.bool(true, "London", group = group_sessions_basic, inline="ses1")
showPreNY = input.bool(false, "Pre-NY", group = group_sessions_basic, inline="ses2")
showCBDR = input.bool(false, "CBDR", group = group_sessions_basic, inline="ses2")

// Horarios sesiones básicas
NY_session = input.session("0930-1600", "NY", group = group_sessions_basic, inline="hr1")
ASIA_session = input.session("1800-0300", "Asia", group = group_sessions_basic, inline="hr1")
LONDON_session = input.session("0300-0930", "London", group = group_sessions_basic, inline="hr2")
preNY_session = input.session("0600-0930", "Pre-NY", group = group_sessions_basic, inline="hr2")
CBDR_session = input.session("1600-1800", "CBDR", group = group_sessions_basic, inline="hr3")

// Colores sesiones básicas
cNY = input.color(color.new(#60fcf4, 99), "NY", group = group_sessions_basic, inline="clr1")
cASIA = input.color(color.new(#000000, 80), "Asia", group = group_sessions_basic, inline="clr1")
cLONDON = input.color(color.new(#fa7aef, 99), "London", group = group_sessions_basic, inline="clr2")
cPreNY = input.color(color.new(#434651, 80), "Pre-NY", group = group_sessions_basic, inline="clr2")
cCBDR = input.color(color.new(#0064ff, 85), "CBDR", group = group_sessions_basic, inline="clr3")

show_separators = input.bool(false, "?? Líneas Separadoras", group = group_sessions_basic)
separator_color = input.color(color.new(color.white, 50), "Color Separadores", group = group_sessions_basic)

// ---------------------------------------------------------------------------------------
// ?? FUNCIONES AUXILIARES PARA MEDIAS MÓVILES
// ---------------------------------------------------------------------------------------

// Función VAR (Variable Index Dynamic Average)
Var_Func(src_param, length_param) =>
    valpha = 2 / (length_param + 1)
    vud1 = src_param > src_param[1] ? src_param - src_param[1] : 0
    vdd1 = src_param < src_param[1] ? src_param[1] - src_param : 0
    vUD = math.sum(vud1, 9)
    vDD = math.sum(vdd1, 9)
    vCMO = nz((vUD - vDD) / (vUD + vDD))
    VAR_result = 0.0
    VAR_result := nz(valpha * math.abs(vCMO) * src_param) + (1 - valpha * math.abs(vCMO)) * nz(VAR_result[1])
    VAR_result

// Función WWMA (Welles Wilder Moving Average)
Wwma_Func(src_param, length_param) =>
    wwalpha = 1 / length_param
    WWMA_result = 0.0
    WWMA_result := wwalpha * src_param + (1 - wwalpha) * nz(WWMA_result[1])
    WWMA_result

// Función ZLEMA (Zero Lag Exponential Moving Average)
Zlema_Func(src_param, length_param) =>
    zxLag = length_param / 2 == math.round(length_param / 2) ? length_param / 2 : (length_param - 1) / 2
    zxEMAData = src_param + src_param - src_param[zxLag]
    ZLEMA_result = ta.ema(zxEMAData, length_param)
    ZLEMA_result

// Función TSF (Time Series Forecast)
Tsf_Func(src_param, length_param) =>
    lrc = ta.linreg(src_param, length_param, 0)
    lrc1 = ta.linreg(src_param, length_param, 1)
    lrs = lrc - lrc1
    TSF_result = ta.linreg(src_param, length_param, 0) + lrs
    TSF_result

// Función selectora de media móvil
getMA(src_param, length_param) =>
    VAR_local = Var_Func(src_param, length_param)
    DEMA_local = 2 * ta.ema(src_param, length_param) - ta.ema(ta.ema(src_param, length_param), length_param)
    WWMA_local = Wwma_Func(src_param, length_param)
    ZLEMA_local = Zlema_Func(src_param, length_param)
    TSF_local = Tsf_Func(src_param, length_param)
    HMA_local = ta.wma(2 * ta.wma(src_param, length_param / 2) - ta.wma(src_param, length_param), math.round(math.sqrt(length_param)))
    
    T3e1_local = ta.ema(src_param, length_param)
    T3e2_local = ta.ema(T3e1_local, length_param)
    T3e3_local = ta.ema(T3e2_local, length_param)
    T3e4_local = ta.ema(T3e3_local, length_param)
    T3e5_local = ta.ema(T3e4_local, length_param)
    T3e6_local = ta.ema(T3e5_local, length_param)
    T3c1_local = -T3a1 * T3a1 * T3a1
    T3c2_local = 3 * T3a1 * T3a1 + 3 * T3a1 * T3a1 * T3a1
    T3c3_local = -6 * T3a1 * T3a1 - 3 * T3a1 - 3 * T3a1 * T3a1 * T3a1
    T3c4_local = 1 + 3 * T3a1 + T3a1 * T3a1 * T3a1 + 3 * T3a1 * T3a1
    T3_local = T3c1_local * T3e6_local + T3c2_local * T3e5_local + T3c3_local * T3e4_local + T3c4_local * T3e3_local
    
    ma_result = 0.0
    if mav == 'SMA'
        ma_result := ta.sma(src_param, length_param)
    if mav == 'EMA'
        ma_result := ta.ema(src_param, length_param)
    if mav == 'WMA'
        ma_result := ta.wma(src_param, length_param)
    if mav == 'DEMA'
        ma_result := DEMA_local
    if mav == 'TMA'
        ma_result := ta.sma(ta.sma(src_param, math.ceil(length_param / 2)), math.floor(length_param / 2) + 1)
    if mav == 'VAR'
        ma_result := VAR_local
    if mav == 'WWMA'
        ma_result := WWMA_local
    if mav == 'ZLEMA'
        ma_result := ZLEMA_local
    if mav == 'TSF'
        ma_result := TSF_local
    if mav == 'HULL'
        ma_result := HMA_local
    if mav == 'TILL'
        ma_result := T3_local
    ma_result

// ---------------------------------------------------------------------------------------
// ?? CÁLCULO DEL SUPERTREND HTF
// ---------------------------------------------------------------------------------------

// Función principal con la lógica del SuperTrend HTF
get_supertrend_data() =>
    MA_local = getMA(src, length)
    
    // Cálculo del SuperTrend
    atr2_local = ta.sma(ta.tr, Periods)
    atr_local = changeATR ? ta.atr(Periods) : atr2_local
    up_local = MA_local - Multiplier * atr_local
    up1_local = nz(up_local[1], up_local)
    up_local := close[1] > up1_local ? math.max(up_local, up1_local) : up_local
    dn_local = MA_local + Multiplier * atr_local
    dn1_local = nz(dn_local[1], dn_local)
    dn_local := close[1] < dn1_local ? math.min(dn_local, dn1_local) : dn_local
    trend_local = 1
    trend_local := nz(trend_local[1], trend_local)
    trend_local := trend_local == -1 and close > dn1_local ? 1 : trend_local == 1 and close < up1_local ? -1 : trend_local
    
    // Señales
    buySignal_local = trend_local == 1 and trend_local[1] == -1
    sellSignal_local = trend_local == -1 and trend_local[1] == 1
    
    // EMA de tendencia
    tendencia_local = ta.ema(close, EMA_tendencia)
    
    // Retornar todos los valores necesarios
    [buySignal_local, sellSignal_local, up_local, dn_local, trend_local, tendencia_local]

// ---------------------------------------------------------------------------------------

// DECLARACIONES DE VARIABLES CON TIPOS ESPECÍFICOS PARA SUPERTREND HTF
var bool buySignal_htf = false
var bool sellSignal_htf = false
var float up_htf = na
var float dn_htf = na
var int trend_htf = 1
var float tendencia_htf = na

// Obtener datos del SuperTrend HTF
[buySignal_htf_temp, sellSignal_htf_temp, up_htf_temp, dn_htf_temp, trend_htf_temp, tendencia_htf_temp] = request.security(syminfo.tickerid, supertrend_htf_tf, get_supertrend_data())

// Usar los datos solo si SuperTrend HTF está activado
if enable_supertrend_htf
    buySignal_htf := buySignal_htf_temp
    sellSignal_htf := sellSignal_htf_temp
    up_htf := up_htf_temp
    dn_htf := dn_htf_temp
    trend_htf := trend_htf_temp
    tendencia_htf := tendencia_htf_temp
else
    buySignal_htf := false
    sellSignal_htf := false
    up_htf := na
    dn_htf := na
    trend_htf := 1
    tendencia_htf := na

// ---------------------------------------------------------------------------------------
// ?? VISUALIZACIÓN DEL SUPERTREND HTF (CON COLORES CONFIGURABLES)
// ---------------------------------------------------------------------------------------

// Plots del SuperTrend HTF con colores personalizables
upPlot_htf = plot(enable_supertrend_htf and trend_htf == 1 ? up_htf : na, title = 'Up Trend HTF', color = color.new(st_htf_up_color, st_htf_transparency), linewidth = 3, style = plot.style_linebr)
dnPlot_htf = plot(enable_supertrend_htf and trend_htf == -1 ? dn_htf : na, title = 'Down Trend HTF', style = plot.style_linebr, linewidth = 3, color = color.new(st_htf_dn_color, st_htf_transparency))

// Señales visuales SuperTrend HTF - FILTRADAS PARA MOSTRAR SOLO UNA VEZ
plotshape(enable_supertrend_htf and buySignal_htf and barstate.isconfirmed ? up_htf : na, title = 'UpTrend HTF Begins', location = location.absolute, style = shape.circle, size = size.tiny, color = color.new(st_htf_up_color, st_htf_transparency))
plotshape(enable_supertrend_htf and buySignal_htf and showsignals and barstate.isconfirmed ? up_htf : na, title = 'Buy HTF', text = 'BUY', location = location.belowbar, style = shape.labelup, size = size.small, color = color.new(st_htf_up_color, st_htf_transparency + 50), textcolor = color.new(color.white, 0))
plotshape(enable_supertrend_htf and sellSignal_htf and barstate.isconfirmed ? dn_htf : na, title = 'DownTrend HTF Begins', location = location.absolute, style = shape.circle, size = size.tiny, color = color.new(st_htf_dn_color, st_htf_transparency))
plotshape(enable_supertrend_htf and sellSignal_htf and showsignals and barstate.isconfirmed ? dn_htf : na, title = 'Sell HTF', text = 'SELL', location = location.abovebar, style = shape.labeldown, size = size.small, color = color.new(st_htf_dn_color, st_htf_transparency + 50), textcolor = color.new(color.white, 0))

// Rellenos SuperTrend HTF
mPlot_htf = plot(ohlc4, title = '', style = plot.style_circles, linewidth = 0, color = color.new(color.white, 100))
longFillColor_htf = enable_supertrend_htf and highlighting ? trend_htf == 1 ? colorup : color.new(color.white, 100) : color.new(color.white, 100)
shortFillColor_htf = enable_supertrend_htf and highlighting ? trend_htf == -1 ? colordown : color.new(color.white, 100) : color.new(color.white, 100)
fill(mPlot_htf, upPlot_htf, title = 'UpTrend HTF Highlighter', color = longFillColor_htf)
fill(mPlot_htf, dnPlot_htf, title = 'DownTrend HTF Highlighter', color = shortFillColor_htf)

// EMA de tendencia HTF
plot(enable_supertrend_htf ? tendencia_htf : na, color = color.new(color.white, 50), linewidth = 1, title = "EMA Tendencia HTF")

// ---------------------------------------------------------------------------------------
// ?? FRAMA CHANNEL - CÁLCULOS Y VISUALIZACIÓN
// ---------------------------------------------------------------------------------------

// Variables FRAMA con tipos específicos - CORREGIDO
var color frama_color = color(na)
var float Filt = na
var float Filt1 = na
var float Filt2 = na
var int count1 = na
var int count2 = na

// Tipo de datos para FRAMA
type vars 
    float N1
    float N2
    float N3
    float HH
    float LL
    float Dimen 
    float alpha

// Variables FRAMA inicializadas correctamente
v = enable_frama ? vars.new(0., 0., 0., 0., 0., 0., 0.) : na

// Cálculos FRAMA (solo si está activado)
if enable_frama
    series float price = hl2
    series float volatility = ta.sma(high - low, 200)
    series float p_vol = switch price_vol
        "Price" => close
        "Average Volume" => math.round(math.sum(volume, 10) / 10, 2)

    // Cálculos de dimensión fractal
    v.N3 := (ta.highest(high, N) - ta.lowest(low, N)) / N

    v.HH := high
    v.LL := low

    for count = 0 to N / 2 - 1
        if high[count] > v.HH
            v.HH := high[count]
        if low[count] < v.LL
            v.LL := low[count]

    v.N1 := (v.HH - v.LL) / (N / 2)

    v.HH := high[N / 2]
    v.LL := low[N / 2]

    for count = N / 2 to N - 1
        if high[count] > v.HH
            v.HH := high[count]
        if low[count] < v.LL
            v.LL := low[count]

    v.N2 := (v.HH - v.LL) / (N / 2)

    if (v.N1 > 0 and v.N2 > 0 and v.N3 > 0)
        v.Dimen := (math.log(v.N1 + v.N2) - math.log(v.N3)) / math.log(2)

    v.alpha := math.exp(-4.6 * (v.Dimen - 1))
    v.alpha := math.max(math.min(v.alpha, 1), 0.01)

    Filt := na(Filt) ? price : v.alpha * price + (1 - v.alpha) * Filt[1]
    Filt := ta.sma((bar_index < N + 1) ? price : Filt, 5)

    Filt1 := Filt + volatility * distance
    Filt2 := Filt - volatility * distance

// Señales FRAMA inicializadas correctamente
var bool break_up = false
var bool break_dn = false

if enable_frama
    break_up := ta.crossover(hlc3, Filt1) and barstate.isconfirmed
    break_dn := ta.crossunder(hlc3, Filt2) and barstate.isconfirmed
    
    if ta.cross(close, Filt)
        frama_color := frama_color3
else
    break_up := false
    break_dn := false

switch 
    break_up => frama_color := frama_color1
    break_dn => frama_color := frama_color2

// Visualización FRAMA (solo si está activado)
p0 = plot(enable_frama ? Filt : na, color = color.new(frama_color, frama_color == frama_color3 ? 100 : 85), editable = false, title = "FRAMA Line")
p1 = plot(enable_frama ? Filt1 : na, color = color.new(frama_color, 85), linewidth = 0, editable = false, title = "FRAMA Upper Band")
p2 = plot(enable_frama ? Filt2 : na, color = color.new(frama_color, 85), linewidth = 0, editable = false, title = "FRAMA Lower Band")

fill(p1, p0, title = "FRAMA Upper Fill", color = enable_frama ? color.new(frama_color, candles ? 98 : 90) : na, editable = false)
fill(p0, p2, title = "FRAMA Lower Fill", color = enable_frama ? color.new(frama_color, candles ? 98 : 90) : na, editable = false)

// Etiquetas FRAMA
size = switch labl_size
    "Small" => size.small
    "Normal" => size.normal
    "Large" => size.large

if enable_frama and break_up
    count2 := 0
    count1 += 1 
    if count1 == 1
        label.new(x = bar_index, y = Filt2, text = "??\nBuy", style = label.style_label_up, textcolor = frama_color1, color = color(na), size = size)

if enable_frama and break_dn
    count1 := 0 
    count2 += 1
    if count2 == 1
        label.new(x = bar_index, y = Filt1, text = "Sell\n??", style = label.style_label_down, textcolor = frama_color2, color = color(na), size = size)

// ---------------------------------------------------------------------------------------
// ?? SESIONES BÁSICAS
// ---------------------------------------------------------------------------------------

// Detección de sesiones básicas (solo si está activado)
inNY = enable_basic_sessions ? not na(time(timeframe.period, NY_session, TIMEZONE_FIJA)) : false
inASIA = enable_basic_sessions ? not na(time(timeframe.period, ASIA_session, TIMEZONE_FIJA)) : false
inLONDON = enable_basic_sessions ? not na(time(timeframe.period, LONDON_session, TIMEZONE_FIJA)) : false
inPreNY = enable_basic_sessions ? not na(time(timeframe.period, preNY_session, TIMEZONE_FIJA)) : false
inCBDR = enable_basic_sessions ? not na(time(timeframe.period, CBDR_session, TIMEZONE_FIJA)) : false

// Aplicación de colores de fondo (solo si está activado)
bgcolor(enable_basic_sessions and showNY and inNY ? cNY : na, title="NY Background")
bgcolor(enable_basic_sessions and showASIA and inASIA ? cASIA : na, title="ASIA Background")
bgcolor(enable_basic_sessions and showLONDON and inLONDON ? cLONDON : na, title="LONDON Background")
bgcolor(enable_basic_sessions and showPreNY and inPreNY ? cPreNY : na, title="PreNY Background")
bgcolor(enable_basic_sessions and showCBDR and inCBDR ? cCBDR : na, title="CBDR Background")

// Líneas separadoras (solo si está activado)
newNY = enable_basic_sessions ? inNY and not inNY[1] : false
newASIA = enable_basic_sessions ? inASIA and not inASIA[1] : false
newLONDON = enable_basic_sessions ? inLONDON and not inLONDON[1] : false
newPreNY = enable_basic_sessions ? inPreNY and not inPreNY[1] : false
newCBDR = enable_basic_sessions ? inCBDR and not inCBDR[1] : false

if enable_basic_sessions and show_separators
    if newNY and showNY
        line.new(bar_index, low, bar_index, high, extend=extend.both, color=separator_color, style=line.style_dashed)
    if newASIA and showASIA
        line.new(bar_index, low, bar_index, high, extend=extend.both, color=separator_color, style=line.style_dashed)
    if newLONDON and showLONDON
        line.new(bar_index, low, bar_index, high, extend=extend.both, color=separator_color, style=line.style_dashed)
    if newPreNY and showPreNY
        line.new(bar_index, low, bar_index, high, extend=extend.both, color=separator_color, style=line.style_dashed)
    if newCBDR and showCBDR
        line.new(bar_index, low, bar_index, high, extend=extend.both, color=separator_color, style=line.style_dashed)


// ---------------------------------------------------------------------------------------
// ?? LÓGICA DE TRADING CON FRANJAS HORARIAS
// ---------------------------------------------------------------------------------------

// Detección de horario de trading original
dentro_horario = enable_trading ? not na(time(timeframe.period, operating_hours, TIMEZONE_FIJA)) : false

// Detección de franjas horarias (OR lógico - independientes)
en_franja_london = enable_trading_sessions and enable_london_session ? not na(time(timeframe.period, london_trading_hours, TIMEZONE_FIJA)) : false
en_franja_ny = enable_trading_sessions and enable_ny_session ? not na(time(timeframe.period, ny_trading_hours, TIMEZONE_FIJA)) : false

// Franja combinada (OR - cualquiera de las dos)
dentro_franja_operativa = enable_trading_sessions ? (en_franja_london or en_franja_ny) : true

// Detección de fin de sesiones
fin_session_london = enable_london_session and en_franja_london and not en_franja_london[1]
fin_session_ny = enable_ny_session and en_franja_ny and not en_franja_ny[1]

// Condiciones de entrada CON FILTRO DE POSICIÓN ÚNICA
condicion_entrada_long = enable_trading and enable_supertrend_htf and buySignal_htf and dentro_franja_operativa and strategy.position_size == 0
condicion_entrada_short = enable_trading and enable_supertrend_htf and sellSignal_htf and dentro_franja_operativa and strategy.position_size == 0


// Variables para tracking de precio de entrada
var float precio_entrada_long = na
var float precio_entrada_short = na

// Ejecutar operaciones
if condicion_entrada_long
    strategy.close("Short")
    strategy.entry("Long", strategy.long)
    precio_entrada_long := close
    strategy.exit("SL Long", from_entry="Long", loss=sl)  // Solo Stop Loss de emergencia

if condicion_entrada_short
    strategy.close("Long") 
    strategy.entry("Short", strategy.short)
    precio_entrada_short := close
    strategy.exit("SL Short", from_entry="Short", loss=sl)  // Solo Stop Loss de emergencia

// ---------------------------------------------------------------------------------------
// ?? ALERTAS
// ---------------------------------------------------------------------------------------

// Alertas SuperTrend HTF (solo si está activado)
alertcondition(enable_supertrend_htf and buySignal_htf, title = 'SuperTrend HTF Buy', message = 'SuperTrend HTF Buy!')
alertcondition(enable_supertrend_htf and sellSignal_htf, title = 'SuperTrend HTF Sell', message = 'SuperTrend HTF Sell!')
changeCond_htf = enable_supertrend_htf ? trend_htf != trend_htf[1] : false
alertcondition(changeCond_htf, title = 'SuperTrend HTF Direction Change', message = 'SuperTrend HTF has changed direction!')

// Alertas FRAMA (solo si está activado)
alertcondition(enable_frama and break_up, title="FRAMA - Buy Alert", message="?? FRAMA Channel: Buy Signal Detected!")
alertcondition(enable_frama and break_dn, title="FRAMA - Sell Alert", message="?? FRAMA Channel: Sell Signal Detected!")
alertcondition(enable_frama and (break_up or break_dn), title="FRAMA Channel - Any Break Alert", message="?? FRAMA Channel: Breakout Detected (Buy or Sell)!")

// ---------------------------------------------------------------------------------------
// ?? FIN DE LA ESTRATEGIA COMPLETA - TODOS LOS ERRORES CORREGIDOS
// ---------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------
// ??  FIBONACCI – ÚLTIMO IMPULSO Y RETROCESOS  (VERSIÓN CORREGIDA)
// ---------------------------------------------------------------------------------------




// Niveles de Fibonacci (valores)
fib_level_0   = input.float(0.0 , "Nivel 0%"   , group = group_fib, inline="lv1")
fib_level_236 = input.float(23.6, "Nivel 23.6%", group = group_fib, inline="lv1")
fib_level_382 = input.float(38.2, "Nivel 38.2%", group = group_fib, inline="lv2")
fib_level_50  = input.float(50.0, "Nivel 50%"  , group = group_fib, inline="lv2")
fib_level_618 = input.float(61.8, "Nivel 61.8%", group = group_fib, inline="lv3")
fib_level_786 = input.float(78.6, "Nivel 78.6%", group = group_fib, inline="lv3")
fib_level_100 = input.float(100.0,"Nivel 100%" , group = group_fib, inline="lv4")

// Colores y estilo global
fib_text_color = input.color(color.new(color.black, 0), "Color texto etiquetas", group = group_fib)
fib_line_style = input.string("Solid", "Estilo por defecto", options = ["Solid","Dashed","Dotted"], group = group_fib)

// --------- CONTROLES INDIVIDUALES POR NIVEL ---------
// (0 %, 23.6 %, 38.2 %, 50 %, 61.8 %, 78.6 %, 100 %)
fib_show_0           = input.bool(true , "Mostrar 0%"   , group=group_fib, inline="0s")
fib_level_0_color    = input.color(color.white         , "Color 0%"     , group=group_fib, inline="0c")
fib_level_0_width    = input.int (1 , "Ancho 0%" , 1,5  , group=group_fib, inline="0c")
fib_level_0_style    = input.string("Solid","Estilo 0%",["Solid","Dashed","Dotted"], group=group_fib, inline="0c")
fib_show_0_price     = input.bool(true  ,"Precio 0%" , group=group_fib, inline="0p")
fib_show_0_percent   = input.bool(false ,"Porc 0%"   , group=group_fib, inline="0p")

fib_show_236         = input.bool(false,"Mostrar 23.6%", group=group_fib, inline="236s")
fib_level_236_color  = input.color(color.new(color.green,70), "Color 23.6%", group=group_fib, inline="236c")
fib_level_236_width  = input.int (1 , "Ancho 23.6%",1,5 , group=group_fib, inline="236c")
fib_level_236_style  = input.string("Solid","Estilo 23.6%",["Solid","Dashed","Dotted"], group=group_fib, inline="236c")
fib_show_236_price   = input.bool(true ,"Precio 23.6%", group=group_fib, inline="236p")
fib_show_236_percent = input.bool(false,"Porc 23.6%"  , group=group_fib, inline="236p")

fib_show_382         = input.bool(false,"Mostrar 38.2%", group=group_fib, inline="382s")
fib_level_382_color  = input.color(color.new(color.green,70), "Color 38.2%", group=group_fib, inline="382c")
fib_level_382_width  = input.int (1 , "Ancho 38.2%",1,5 , group=group_fib, inline="382c")
fib_level_382_style  = input.string("Solid","Estilo 38.2%",["Solid","Dashed","Dotted"], group=group_fib, inline="382c")
fib_show_382_price   = input.bool(true ,"Precio 38.2%", group=group_fib, inline="382p")
fib_show_382_percent = input.bool(false,"Porc 38.2%"  , group=group_fib, inline="382p")

fib_show_50         = input.bool(false,"Mostrar 50%"  , group=group_fib, inline="50s")
fib_level_50_color  = input.color(color.new(color.green,70), "Color 50%", group=group_fib, inline="50c")
fib_level_50_width  = input.int (2 , "Ancho 50%",1,5  , group=group_fib, inline="50c")
fib_level_50_style  = input.string("Solid","Estilo 50%",["Solid","Dashed","Dotted"], group=group_fib, inline="50c")
fib_show_50_price   = input.bool(true ,"Precio 50%"   , group=group_fib, inline="50p")
fib_show_50_percent = input.bool(false,"Porc 50%"     , group=group_fib, inline="50p")

fib_show_618         = input.bool(true ,"Mostrar 61.8%", group=group_fib, inline="618s")
fib_level_618_color  = input.color(color.new(color.green,0), "Color 61.8%", group=group_fib, inline="618c")
fib_level_618_width  = input.int (1 , "Ancho 61.8%",1,5 , group=group_fib, inline="618c")
fib_level_618_style  = input.string("Solid","Estilo 61.8%",["Solid","Dashed","Dotted"], group=group_fib, inline="618c")
fib_show_618_price   = input.bool(true ,"Precio 61.8%", group=group_fib, inline="618p")
fib_show_618_percent = input.bool(false,"Porc 61.8%"  , group=group_fib, inline="618p")

fib_show_786         = input.bool(true ,"Mostrar 78.6%", group=group_fib, inline="786s")
fib_level_786_color  = input.color(color.new(color.green,0), "Color 78.6%", group=group_fib, inline="786c")
fib_level_786_width  = input.int (1 , "Ancho 78.6%",1,5 , group=group_fib, inline="786c")
fib_level_786_style  = input.string("Solid","Estilo 78.6%",["Solid","Dashed","Dotted"], group=group_fib, inline="786c")
fib_show_786_price   = input.bool(true ,"Precio 78.6%", group=group_fib, inline="786p")
fib_show_786_percent = input.bool(false,"Porc 78.6%"  , group=group_fib, inline="786p")

fib_show_100         = input.bool(true ,"Mostrar 100%", group=group_fib, inline="100s")
fib_level_100_color  = input.color(color.white               , "Color 100%", group=group_fib, inline="100c")
fib_level_100_width  = input.int (1 , "Ancho 100%",1,5 , group=group_fib, inline="100c")
fib_level_100_style  = input.string("Solid","Estilo 100%",["Solid","Dashed","Dotted"], group=group_fib, inline="100c")
fib_show_100_price   = input.bool(true ,"Precio 100%"  , group=group_fib, inline="100p")
fib_show_100_percent = input.bool(false,"Porc 100%"    , group=group_fib, inline="100p")

// Línea de impulso
show_impulse_line  = input.bool(true,"Mostrar línea impulso", group=group_fib)
impulse_line_width = input.int (3   ,"Grosor impulso"       , group=group_fib, minval=1, maxval=5)


// ---------------------------------------------------------------------------------------
// 2. DETECCIÓN DEL ÚLTIMO IMPULSO  (corregido con valuewhen)
// ---------------------------------------------------------------------------------------
var float impulse_start_price = na
var float impulse_end_price   = na
var int   impulse_start_bar   = na
var int   impulse_end_bar     = na
var bool  is_bullish_impulse  = false
var bool  impulse_detected    = false

if enable_fibonacci
    highest_price = ta.highest(high, fib_lookback)
    lowest_price  = ta.lowest (low , fib_lookback)

    high_bar = ta.valuewhen(high == highest_price, bar_index, 0)
    low_bar  = ta.valuewhen(low  == lowest_price , bar_index, 0)

    price_range         = highest_price - lowest_price
    impulse_percentage  = (price_range / lowest_price) * 100
    significant_impulse = impulse_percentage >= fib_min_impulse

    if significant_impulse
        if high_bar > low_bar
            // impulso alcista
            impulse_start_price := lowest_price
            impulse_end_price   := highest_price
            impulse_start_bar   := low_bar
            impulse_end_bar     := high_bar
            is_bullish_impulse  := true
            impulse_detected    := true
        else if low_bar > high_bar
            // impulso bajista
            impulse_start_price := highest_price
            impulse_end_price   := lowest_price
            impulse_start_bar   := high_bar
            impulse_end_bar     := low_bar
            is_bullish_impulse  := false
            impulse_detected    := true
        else
            impulse_detected := false
    else
        impulse_detected := false
else
    impulse_detected := false


// ---------------------------------------------------------------------------------------
// 3. FUNCIÓN DE CÁLCULO DE RETROCESOS
// ---------------------------------------------------------------------------------------
calc_fib_price(float start_p, float end_p, float level, bool bull) =>
    bull ? end_p - (end_p - start_p) * (level/100)
         : end_p + (start_p - end_p) * (level/100)


// ---------------------------------------------------------------------------------------
// 4. OBJETOS (líneas y etiquetas) – variables persistentes
// ---------------------------------------------------------------------------------------
var line  fib_line_0   = na
var line  fib_line_236 = na
var line  fib_line_382 = na
var line  fib_line_50  = na
var line  fib_line_618 = na
var line  fib_line_786 = na
var line  fib_line_100 = na

var label fib_label_0   = na
var label fib_label_236 = na
var label fib_label_382 = na
var label fib_label_50  = na
var label fib_label_618 = na
var label fib_label_786 = na
var label fib_label_100 = na
var label impulse_range_label = na


// ---------------------------------------------------------------------------------------
// 5. TRAZADO PRINCIPAL
// ---------------------------------------------------------------------------------------
if enable_fibonacci and impulse_detected and not na(impulse_start_price) and not na(impulse_end_price)
    // ¦¦ Precios de los niveles
    price_0   = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_0  , is_bullish_impulse)
    price_236 = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_236, is_bullish_impulse)
    price_382 = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_382, is_bullish_impulse)
    price_50  = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_50 , is_bullish_impulse)
    price_618 = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_618, is_bullish_impulse)
    price_786 = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_786, is_bullish_impulse)
    price_100 = calc_fib_price(impulse_start_price, impulse_end_price, fib_level_100, is_bullish_impulse)

    // ¦¦ Magnitud del impulso
    impulse_range = math.abs(impulse_end_price - impulse_start_price)
    extend_side   = fib_extend_right ? extend.right : extend.none

    // ¦¦ Elimina objetos previos
    for l in array.from(fib_line_0,fib_line_236,fib_line_382,fib_line_50,fib_line_618,fib_line_786,fib_line_100)
        if not na(l)
            line.delete(l)
    for lb in array.from(fib_label_0,fib_label_236,fib_label_382,fib_label_50,fib_label_618,fib_label_786,fib_label_100,impulse_range_label)
        if not na(lb)
            label.delete(lb)

    // ¦¦ Crea cada línea
    fib_line_0   := fib_show_0  ? line.new(impulse_start_bar, price_0  , bar_index, price_0  , xloc = xloc.bar_index, extend = extend_side, color = fib_level_0_color  , style = fib_level_0_style  =="Solid"?line.style_solid:fib_level_0_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_0_width  ) : na
    fib_line_236 := fib_show_236? line.new(impulse_start_bar, price_236, bar_index, price_236, xloc = xloc.bar_index, extend = extend_side, color = fib_level_236_color , style = fib_level_236_style =="Solid"?line.style_solid:fib_level_236_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_236_width ) : na
    fib_line_382 := fib_show_382? line.new(impulse_start_bar, price_382, bar_index, price_382, xloc = xloc.bar_index, extend = extend_side, color = fib_level_382_color , style = fib_level_382_style =="Solid"?line.style_solid:fib_level_382_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_382_width ) : na
    fib_line_50  := fib_show_50 ? line.new(impulse_start_bar, price_50 , bar_index, price_50 , xloc = xloc.bar_index, extend = extend_side, color = fib_level_50_color  , style = fib_level_50_style  =="Solid"?line.style_solid:fib_level_50_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_50_width  ) : na
    fib_line_618 := fib_show_618? line.new(impulse_start_bar, price_618, bar_index, price_618, xloc = xloc.bar_index, extend = extend_side, color = fib_level_618_color , style = fib_level_618_style =="Solid"?line.style_solid:fib_level_618_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_618_width ) : na
    fib_line_786 := fib_show_786? line.new(impulse_start_bar, price_786, bar_index, price_786, xloc = xloc.bar_index, extend = extend_side, color = fib_level_786_color , style = fib_level_786_style =="Solid"?line.style_solid:fib_level_786_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_786_width ) : na
    fib_line_100 := fib_show_100? line.new(impulse_start_bar, price_100, bar_index, price_100, xloc = xloc.bar_index, extend = extend_side, color = fib_level_100_color , style = fib_level_100_style =="Solid"?line.style_solid:fib_level_100_style=="Dashed"?line.style_dashed:line.style_dotted, width = fib_level_100_width ) : na

    // ¦¦ Etiquetas desplazadas 10 barras a la derecha
    if fib_show_labels
        impulse_type = is_bullish_impulse ? " ??" : " ??"
        fib_label_0   := fib_show_0  ? label.new(bar_index+8, price_0  , (fib_show_0_price ? str.tostring(price_0 ,format.volume)+" " : "") + (fib_show_0_percent  ? "0%"+impulse_type : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na
        fib_label_236 := fib_show_236? label.new(bar_index+8, price_236, (fib_show_236_price? str.tostring(price_236,format.volume)+" ": "") + (fib_show_236_percent? "23.6%" : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na
        fib_label_382 := fib_show_382? label.new(bar_index+8, price_382, (fib_show_382_price? str.tostring(price_382,format.volume)+" ": "") + (fib_show_382_percent? "38.2%" : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na
        fib_label_50  := fib_show_50 ? label.new(bar_index+8, price_50 , (fib_show_50_price ? str.tostring(price_50 ,format.volume)+" ": "") + (fib_show_50_percent ? "50%"  : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na
        fib_label_618 := fib_show_618? label.new(bar_index+8, price_618, (fib_show_618_price? str.tostring(price_618,format.volume)+" ": "") + (fib_show_618_percent? "61.8%" : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na
        fib_label_786 := fib_show_786? label.new(bar_index+8, price_786, (fib_show_786_price? str.tostring(price_786,format.volume)+" ": "") + (fib_show_786_percent? "78.6%" : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na
        fib_label_100 := fib_show_100? label.new(bar_index+8, price_100, (fib_show_100_price? str.tostring(price_100,format.volume)+" ": "") + (fib_show_100_percent? "100%" : ""), xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.normal) : na

        middle_price        = (price_0 + price_100)/2
        impulse_range_label := label.new(bar_index+8, middle_price, "?" + str.tostring(impulse_range,format.volume),
                                         xloc=xloc.bar_index, style=label.style_none, color=color.black, textcolor=color.white, size=size.large)


// ---------------------------------------------------------------------------------------
// 6. LÍNEA DE IMPULSO (visual)
// ---------------------------------------------------------------------------------------
var line impulse_line = na
if enable_fibonacci and impulse_detected and not na(impulse_start_bar) and not na(impulse_end_bar)
    if show_impulse_line
        if not na(impulse_line)
            line.delete(impulse_line)
        impulse_color = is_bullish_impulse ? color.green : color.red
        impulse_line  := line.new(impulse_start_bar, impulse_start_price, impulse_end_bar, impulse_end_price,
                                  xloc = xloc.bar_index, color = impulse_color, style = line.style_dashed, width = impulse_line_width)
    else
        if not na(impulse_line)
            line.delete(impulse_line)
        impulse_line := na


// ---------------------------------------------------------------------------------------
// 7. ALERTAS
// ---------------------------------------------------------------------------------------
new_impulse_detected = enable_fibonacci and impulse_detected and not impulse_detected[1]
alertcondition(new_impulse_detected and is_bullish_impulse,      title="Fibonacci - Impulso Alcista",  message="?? Nuevo impulso ALCISTA detectado")
alertcondition(new_impulse_detected and not is_bullish_impulse,  title="Fibonacci - Impulso Bajista",  message="?? Nuevo impulso BAJISTA detectado")
alertcondition(new_impulse_detected,                             title="Fibonacci - Cualquier Impulso",message="?? Nuevo impulso detectado – revisa niveles")

// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © HoanGhetti - Adaptado y Unificado por Gemini para estilo [RRHB]

// ---------------------------------------------
// INCISO RRHB · RSI TRENDLINES + VOLUMEN OVERLAY
// ---------------------------------------------

// === CONFIGURACIÓN DE COLORES (RENOMBRADOS) ===
rrhb_purpura = input.color(color.rgb(223, 39, 226))  // Soporte / Compra
rrhb_azul    = input.color(color.rgb(1, 179, 255))   // Resistencia / Venta

// === GRUPOS ===
rrhb_g_trendlines = 'RRHB · Trendlines'
rrhb_g_conditions = 'RRHB · Conditions'
rrhb_g_styling    = 'RRHB · Styling'
rrhb_g_timeframe  = 'RRHB · Timeframe'
rrhb_g_volume     = 'RRHB · Volumen'

// === INPUTS RSI ===
rrhb_tf        = input.timeframe('', 'RSI Timeframe', group = rrhb_g_timeframe)
rrhb_pLen      = input.int(4, 'Pivot Lookback', minval = 1, group = rrhb_g_trendlines)
rrhb_rLen      = input.int(14, 'RSI Length', minval = 1, group = rrhb_g_trendlines)
rrhb_rSrc      = input.source(close, 'RSI Source', group = rrhb_g_trendlines)
rrhb_repaint   = input.string('On', 'Repainting', options = ['On', 'Off: Bar Confirmation'], group = rrhb_g_conditions)
rrhb_rsiDiff   = input.int(3, 'RSI Difference', group = rrhb_g_conditions)

// === ESTILO ===
rrhb_rsiCol    = input.color(color.new(color.white, 40), 'RSI Line Color', group = rrhb_g_styling)
rrhb_width     = input.int(2, 'Line Width', minval = 1, group = rrhb_g_styling)
rrhb_lblType   = input.string('Simple', 'Label Type', options = ['Simple', 'Full'], group = rrhb_g_styling)
rrhb_lblSize   = input.string(size.small, 'Label Size', options = [size.huge, size.large, size.normal, size.small, size.tiny], group = rrhb_g_styling)

rrhb_lowCol    = input.color((color.rgb(223, 39, 226)), 'Pivot Low Color', group = rrhb_g_styling)
rrhb_highCol   = input.color((color.rgb(1, 179, 255)), 'Pivot High Color', group = rrhb_g_styling)

rrhb_override  = input.bool(false, 'Override Text Color', group = rrhb_g_styling)
rrhb_textCol   = input.color(color.white, '', group = rrhb_g_styling)

// === INPUTS VOLUMEN ===
rrhb_showVol = input.bool(true, 'Mostrar Volumen', group = rrhb_g_volume)
rrhb_volOp  = input.int(90, 'Transparencia Volumen', minval = 0, maxval = 100, group = rrhb_g_volume)
rrhb_volMA  = input.int(20, 'Media Móvil Volumen', minval = 1, group = rrhb_g_volume)

// === LÓGICA RSI ===
rrhb_lblText = rrhb_lblType == 'Simple' ? 'Br' : 'Break'
rrhb_rsiRaw  = ta.rsi(rrhb_rSrc, rrhb_rLen)

rrhb_rsi =
     rrhb_tf == '' ?
     rrhb_rsiRaw :
     request.security(syminfo.tickerid, rrhb_tf, rrhb_rsiRaw, lookahead = barmerge.lookahead_on)

// === ZONA INFERIOR ===
rrhb_floor = ta.lowest(low, 100)
rrhb_priceHigh = ta.highest(high, 100)
rrhb_bandHeight = (rrhb_priceHigh - rrhb_floor) * 0.10

// === RSI ESCALADO ===
rrhb_rsiScaled = rrhb_floor + (rrhb_rsi / 100) * rrhb_bandHeight

// === VOLUMEN ESCALADO ===
rrhb_maxVol = ta.highest(volume, 100)
rrhb_volScaled = rrhb_floor + (volume / rrhb_maxVol) * rrhb_bandHeight * 0.6

// === LÍNEAS (NO AFECTAN ESCALA) ===
var line rrhb_rsiLine = na
var line rrhb_volLine = na

line.delete(rrhb_rsiLine)
line.delete(rrhb_volLine)

rrhb_rsiLine := line.new(bar_index - 1, rrhb_rsiScaled[1], bar_index, rrhb_rsiScaled, color = rrhb_rsiCol, width = 1)

rrhb_volLine := line.new(bar_index, rrhb_floor, bar_index, rrhb_volScaled, color = close > open ? color.new(rrhb_azul, rrhb_volOp) : color.new(rrhb_purpura, rrhb_volOp), width = 2)
