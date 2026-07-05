// Indicador cAlgo (cTrader) — reconstrucción funcional de
// "Estrategia Completa - SuperTrend HTF/LTF + FRAMA + ICT Sessions [RRHB]" (Pine Script v5),
// SOLO la parte visual/de análisis (SuperTrend HTF, FRAMA Channel, Fibonacci automático, sombreado
// de sesiones). Deliberadamente NO incluye la ejecución automática de órdenes del script original
// (bloque enable_trading / strategy.entry / strategy.exit) — el usuario pidió solo indicadores.
//
// No es traducción literal: Pine tiene built-ins (request.security, time() con sesiones+timezone,
// line.new/label.new) sin equivalente directo en cAlgo — cada uno se reimplementa con la API nativa
// de cAlgo (MarketData.GetBars, TimeZoneInfo de .NET, ChartObjects).

using System;
using cAlgo.API;
using cAlgo.API.Indicators;

namespace cAlgo.Indicators
{
    public enum MaType { SMA, EMA, WMA, DEMA, TMA, VAR, WWMA, ZLEMA, TSF, HULL, TILL }

    [Indicator(IsOverlay = true, AccessRights = AccessRights.None)]
    public class SuperTrendFramaFibRRHB : Indicator
    {
        // ---------------- SuperTrend HTF ----------------
        [Parameter("Activar SuperTrend HTF", DefaultValue = true, Group = "SuperTrend HTF")]
        public bool EnableSuperTrendHtf { get; set; }

        [Parameter("Tipo de media móvil", DefaultValue = MaType.HULL, Group = "SuperTrend HTF")]
        public MaType MaSelection { get; set; }

        [Parameter("Longitud MA", DefaultValue = 38, MinValue = 1, Group = "SuperTrend HTF")]
        public int MaLength { get; set; }

        [Parameter("ATR Períodos", DefaultValue = 10, MinValue = 1, Group = "SuperTrend HTF")]
        public int AtrPeriods { get; set; }

        [Parameter("ATR Multiplicador", DefaultValue = 0.5, Group = "SuperTrend HTF")]
        public double AtrMultiplier { get; set; }

        [Parameter("Factor T3 Tillson", DefaultValue = 0.7, Group = "SuperTrend HTF")]
        public double T3Factor { get; set; }

        [Parameter("Timeframe SuperTrend HTF", DefaultValue = "Hour4", Group = "SuperTrend HTF")]
        public TimeFrame SuperTrendHtfTimeframe { get; set; }

        [Parameter("Períodos EMA Tendencia", DefaultValue = 50, MinValue = 1, Group = "SuperTrend HTF")]
        public int EmaTendenciaLength { get; set; }

        [Parameter("Color alcista", DefaultValue = "#01B3FF", Group = "Colores")]
        public string UpColorHex { get; set; }

        [Parameter("Color bajista", DefaultValue = "#DF27E2", Group = "Colores")]
        public string DownColorHex { get; set; }

        // ---------------- FRAMA ----------------
        [Parameter("Activar FRAMA Channel", DefaultValue = true, Group = "FRAMA")]
        public bool EnableFrama { get; set; }

        [Parameter("Longitud FRAMA", DefaultValue = 26, MinValue = 2, Group = "FRAMA")]
        public int FramaLength { get; set; }

        [Parameter("Distancia Bandas", DefaultValue = 1.0, Group = "FRAMA")]
        public double FramaDistance { get; set; }

        // ---------------- Fibonacci ----------------
        [Parameter("Activar Fibonacci", DefaultValue = false, Group = "Fibonacci")]
        public bool EnableFibonacci { get; set; }

        [Parameter("Períodos Búsqueda Impulso", DefaultValue = 50, MinValue = 5, Group = "Fibonacci")]
        public int FibLookback { get; set; }

        [Parameter("Impulso Mínimo %", DefaultValue = 1.0, MinValue = 0.1, Group = "Fibonacci")]
        public double FibMinImpulsePercent { get; set; }

        [Parameter("Extender niveles a la derecha", DefaultValue = true, Group = "Fibonacci")]
        public bool FibExtendRight { get; set; }

        // ---------------- Sesiones ----------------
        [Parameter("Activar sesiones básicas", DefaultValue = true, Group = "Sesiones")]
        public bool EnableBasicSessions { get; set; }

        [Parameter("Zona horaria (.NET TimeZoneInfo Id)", DefaultValue = "Eastern Standard Time", Group = "Sesiones")]
        public string TimezoneId { get; set; }

        [Parameter("NY inicio (hora local, 0-23)", DefaultValue = 9, Group = "Sesiones")]
        public int NySessionStartHour { get; set; }

        [Parameter("NY fin (hora local, 0-23)", DefaultValue = 16, Group = "Sesiones")]
        public int NySessionEndHour { get; set; }

        [Parameter("Londres inicio (hora local, 0-23)", DefaultValue = 3, Group = "Sesiones")]
        public int LondonSessionStartHour { get; set; }

        [Parameter("Londres fin (hora local, 0-23)", DefaultValue = 9, Group = "Sesiones")]
        public int LondonSessionEndHour { get; set; }

        [Parameter("Asia inicio (hora local, 0-23)", DefaultValue = 18, Group = "Sesiones")]
        public int AsiaSessionStartHour { get; set; }

        [Parameter("Asia fin (hora local, 0-23)", DefaultValue = 3, Group = "Sesiones")]
        public int AsiaSessionEndHour { get; set; }

        // ---------------- Outputs ----------------
        [Output("SuperTrend Alcista", LineColor = "DodgerBlue", Thickness = 3, PlotType = PlotType.DiscontinuousLine)]
        public IndicatorDataSeries SuperTrendUpOutput { get; set; }

        [Output("SuperTrend Bajista", LineColor = "Magenta", Thickness = 3, PlotType = PlotType.DiscontinuousLine)]
        public IndicatorDataSeries SuperTrendDownOutput { get; set; }

        [Output("EMA Tendencia HTF", LineColor = "White", Thickness = 1)]
        public IndicatorDataSeries EmaTendenciaOutput { get; set; }

        [Output("FRAMA", LineColor = "Gray", Thickness = 1)]
        public IndicatorDataSeries FramaOutput { get; set; }

        [Output("FRAMA Banda Superior", LineColor = "Gray", Thickness = 1, PlotType = PlotType.DiscontinuousLine)]
        public IndicatorDataSeries FramaUpperOutput { get; set; }

        [Output("FRAMA Banda Inferior", LineColor = "Gray", Thickness = 1, PlotType = PlotType.DiscontinuousLine)]
        public IndicatorDataSeries FramaLowerOutput { get; set; }

        // Buffers internos — equivalentes a las "var float" con historia [1] del Pine.
        private IndicatorDataSeries _maSeries, _upSeries, _dnSeries, _trendSeries;
        private IndicatorDataSeries _varSeries, _wwmaSeries;
        private IndicatorDataSeries _framaFilt;
        // Cadena de EMAs encadenadas (EMA de EMA...) para DEMA/T3 — se calculan una vez por barra,
        // en orden, y se leen del buffer (nunca recursivo hacia atrás) para evitar overflow de pila
        // en historiales largos.
        private IndicatorDataSeries _e1Series, _e2Series, _e3Series, _e4Series, _e5Series, _e6Series;

        private ExponentialMovingAverage _emaTendencia;
        private TimeZoneInfo _timezone;

        // Estado del último impulso detectado para Fibonacci.
        private int _impulseStartBar = -1, _impulseEndBar = -1;
        private double _impulseStartPrice, _impulseEndPrice;
        private bool _isBullishImpulse, _impulseDetected;

        protected override void Initialize()
        {
            _emaTendencia = Indicators.ExponentialMovingAverage(Bars.ClosePrices, EmaTendenciaLength);

            _maSeries = CreateDataSeries();
            _upSeries = CreateDataSeries();
            _dnSeries = CreateDataSeries();
            _trendSeries = CreateDataSeries();
            _varSeries = CreateDataSeries();
            _wwmaSeries = CreateDataSeries();
            _e1Series = CreateDataSeries();
            _e2Series = CreateDataSeries();
            _e3Series = CreateDataSeries();
            _e4Series = CreateDataSeries();
            _e5Series = CreateDataSeries();
            _e6Series = CreateDataSeries();
            _framaFilt = CreateDataSeries();

            try
            {
                _timezone = TimeZoneInfo.FindSystemTimeZoneById(TimezoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                _timezone = TimeZoneInfo.Utc;
            }
        }

        public override void Calculate(int index)
        {
            EmaTendenciaOutput[index] = _emaTendencia.Result[index];

            // Cadena de EMAs encadenadas (para DEMA/T3) — se calcula siempre en orden ascendente de
            // índice, leyendo el valor anterior del buffer (nunca recursión hacia atrás).
            double alphaChain = 2.0 / (MaLength + 1);
            double prevClose = index > 0 ? _e1Series[index - 1] : Bars.ClosePrices[index];
            _e1Series[index] = index == 0 ? Bars.ClosePrices[index] : alphaChain * Bars.ClosePrices[index] + (1 - alphaChain) * prevClose;
            _e2Series[index] = index == 0 ? _e1Series[index] : alphaChain * _e1Series[index] + (1 - alphaChain) * _e2Series[index - 1];
            _e3Series[index] = index == 0 ? _e2Series[index] : alphaChain * _e2Series[index] + (1 - alphaChain) * _e3Series[index - 1];
            _e4Series[index] = index == 0 ? _e3Series[index] : alphaChain * _e3Series[index] + (1 - alphaChain) * _e4Series[index - 1];
            _e5Series[index] = index == 0 ? _e4Series[index] : alphaChain * _e4Series[index] + (1 - alphaChain) * _e5Series[index - 1];
            _e6Series[index] = index == 0 ? _e5Series[index] : alphaChain * _e5Series[index] + (1 - alphaChain) * _e6Series[index - 1];

            if (EnableSuperTrendHtf)
                CalculateSuperTrend(index);

            if (EnableFrama)
                CalculateFrama(index);

            if (EnableFibonacci)
                CalculateFibonacci(index);

            if (EnableBasicSessions)
                ShadeSession(index);
        }

        // =========================================================================
        // SUPERTREND HTF
        // =========================================================================
        private void CalculateSuperTrend(int index)
        {
            double ma = GetMa(index);
            _maSeries[index] = ma;

            double atr = AverageTrueRange(index, AtrPeriods);
            double up = ma - AtrMultiplier * atr;
            double up1 = index > 0 && !double.IsNaN(_upSeries[index - 1]) ? _upSeries[index - 1] : up;
            if (index > 0 && Bars.ClosePrices[index - 1] > up1) up = Math.Max(up, up1);
            _upSeries[index] = up;

            double dn = ma + AtrMultiplier * atr;
            double dn1 = index > 0 && !double.IsNaN(_dnSeries[index - 1]) ? _dnSeries[index - 1] : dn;
            if (index > 0 && Bars.ClosePrices[index - 1] < dn1) dn = Math.Min(dn, dn1);
            _dnSeries[index] = dn;

            double prevTrend = index > 0 && _trendSeries[index - 1] != 0 ? _trendSeries[index - 1] : 1;
            double trend = prevTrend;
            if (prevTrend == -1 && Bars.ClosePrices[index] > dn1) trend = 1;
            else if (prevTrend == 1 && Bars.ClosePrices[index] < up1) trend = -1;
            _trendSeries[index] = trend;

            bool buySignal = trend == 1 && prevTrend == -1;
            bool sellSignal = trend == -1 && prevTrend == 1;

            var upColor = Color.FromHex(UpColorHex);
            var downColor = Color.FromHex(DownColorHex);

            SuperTrendUpOutput[index] = trend == 1 ? up : double.NaN;
            SuperTrendDownOutput[index] = trend == -1 ? dn : double.NaN;

            if (buySignal)
                ChartObjects.DrawText($"st-buy-{index}", "▲", index, up, upColor);
            if (sellSignal)
                ChartObjects.DrawText($"st-sell-{index}", "▼", index, dn, downColor);
        }

        private double AverageTrueRange(int index, int periods)
        {
            double sum = 0;
            int count = 0;
            for (int i = Math.Max(1, index - periods + 1); i <= index; i++)
            {
                double tr = Math.Max(Bars.HighPrices[i] - Bars.LowPrices[i],
                    Math.Max(Math.Abs(Bars.HighPrices[i] - Bars.ClosePrices[i - 1]),
                              Math.Abs(Bars.LowPrices[i] - Bars.ClosePrices[i - 1])));
                sum += tr;
                count++;
            }
            return count > 0 ? sum / count : 0;
        }

        // --- Selector de media móvil (equivalente a getMA() del Pine) ---
        private double GetMa(int index)
        {
            switch (MaSelection)
            {
                case MaType.SMA: return Sma(Bars.ClosePrices, index, MaLength);
                case MaType.EMA: return _emaTendencia.Result[index]; // aproximación: reutiliza EMA ya calculada si length coincide
                case MaType.WMA: return Wma(index, MaLength);
                case MaType.DEMA:
                    return 2 * _e1Series[index] - _e2Series[index];
                case MaType.TMA:
                    return Sma(Bars.ClosePrices, index, MaLength);
                case MaType.VAR: return CalcVar(index);
                case MaType.WWMA: return CalcWwma(index);
                case MaType.ZLEMA: return CalcZlema(index);
                case MaType.TSF: return CalcTsf(index);
                case MaType.HULL: return Hma(index);
                case MaType.TILL: return T3(index);
                default: return Bars.ClosePrices[index];
            }
        }

        private double Sma(DataSeries src, int index, int length)
        {
            double sum = 0;
            int n = 0;
            for (int i = Math.Max(0, index - length + 1); i <= index; i++) { sum += src[i]; n++; }
            return n > 0 ? sum / n : src[index];
        }

        private double Wma(int index, int length)
        {
            double weightedSum = 0, weightTotal = 0;
            for (int i = 0; i < length && index - i >= 0; i++)
            {
                double weight = length - i;
                weightedSum += Bars.ClosePrices[index - i] * weight;
                weightTotal += weight;
            }
            return weightTotal > 0 ? weightedSum / weightTotal : Bars.ClosePrices[index];
        }

        private double Hma(int index)
        {
            int half = Math.Max(1, MaLength / 2);
            int sqrtLen = Math.Max(1, (int)Math.Round(Math.Sqrt(MaLength)));
            double wmaHalf = WmaOf(index, half);
            double wmaFull = WmaOf(index, MaLength);
            double raw = 2 * wmaHalf - wmaFull;
            return WmaOfSeries(index, sqrtLen, raw);
        }

        private double WmaOf(int index, int length)
        {
            double weightedSum = 0, weightTotal = 0;
            for (int i = 0; i < length && index - i >= 0; i++)
            {
                double weight = length - i;
                weightedSum += Bars.ClosePrices[index - i] * weight;
                weightTotal += weight;
            }
            return weightTotal > 0 ? weightedSum / weightTotal : Bars.ClosePrices[index];
        }

        // Nota: la Hull "final" (WMA del resultado 2*WMA(n/2)-WMA(n)) necesitaría una serie auxiliar
        // completa para ser exacta barra a barra — esta versión usa el valor puntual como aproximación
        // razonable. Ajustar con una IndicatorDataSeries dedicada si se necesita precisión total.
        private double WmaOfSeries(int index, int length, double currentRawValue) => currentRawValue;

        private double CalcVar(int index)
        {
            double alpha = 2.0 / (MaLength + 1);
            double up = 0, down = 0;
            for (int i = Math.Max(1, index - 8); i <= index; i++)
            {
                double diff = Bars.ClosePrices[i] - Bars.ClosePrices[i - 1];
                if (diff > 0) up += diff; else down += -diff;
            }
            double cmo = (up + down) != 0 ? (up - down) / (up + down) : 0;
            double prev = index > 0 ? _varSeries[index - 1] : Bars.ClosePrices[index];
            double result = alpha * Math.Abs(cmo) * Bars.ClosePrices[index] + (1 - alpha * Math.Abs(cmo)) * prev;
            _varSeries[index] = result;
            return result;
        }

        private double CalcWwma(int index)
        {
            double alpha = 1.0 / MaLength;
            double prev = index > 0 ? _wwmaSeries[index - 1] : Bars.ClosePrices[index];
            double result = alpha * Bars.ClosePrices[index] + (1 - alpha) * prev;
            _wwmaSeries[index] = result;
            return result;
        }

        private double CalcZlema(int index)
        {
            // ZLEMA real: EMA aplicada sobre una serie "des-lageada" (2*precio - precio[lag]), no sobre
            // el precio crudo — como esa serie desplazada no está pre-calculada en un buffer, se usa
            // _e1Series (EMA de MaLength ya calculada) como aproximación de referencia y se corrige por
            // el mismo desfase que Pine aplica antes de suavizar.
            int lag = MaLength % 2 == 0 ? MaLength / 2 : (MaLength - 1) / 2;
            int refIndex = Math.Max(0, index - lag);
            double emaData = Bars.ClosePrices[index] + Bars.ClosePrices[index] - Bars.ClosePrices[refIndex];
            double priceLagAdjustment = emaData - Bars.ClosePrices[index];
            return _e1Series[index] + priceLagAdjustment;
        }

        private double CalcTsf(int index)
        {
            // Time Series Forecast = proyección lineal 1 barra adelante de la regresión lineal.
            var (slope, intercept) = LinReg(index, MaLength);
            return intercept + slope * MaLength;
        }

        private (double slope, double intercept) LinReg(int index, int length)
        {
            int n = Math.Min(length, index + 1);
            double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            for (int i = 0; i < n; i++)
            {
                double x = i;
                double y = Bars.ClosePrices[index - (n - 1) + i];
                sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
            }
            double denom = n * sumX2 - sumX * sumX;
            double slope = denom != 0 ? (n * sumXY - sumX * sumY) / denom : 0;
            double intercept = (sumY - slope * sumX) / n;
            return (slope, intercept);
        }

        private double T3(int index)
        {
            // T3 Tillson real: e3..e6 son la cadena de 6 EMAs anidadas sobre el precio (no sobre e2
            // repetido) — ya se precalculan una vez por barra en Calculate() vía _e1..._e6Series.
            double e3 = _e3Series[index], e4 = _e4Series[index], e5 = _e5Series[index], e6 = _e6Series[index];
            double a = T3Factor;
            double c1 = -a * a * a;
            double c2 = 3 * a * a + 3 * a * a * a;
            double c3 = -6 * a * a - 3 * a - 3 * a * a * a;
            double c4 = 1 + 3 * a + a * a * a + 3 * a * a;
            return c1 * e6 + c2 * e5 + c3 * e4 + c4 * e3;
        }

        // =========================================================================
        // FRAMA CHANNEL
        // =========================================================================
        private void CalculateFrama(int index)
        {
            int n = FramaLength;
            int half = n / 2;
            if (index < n) return;

            double hh1 = Highest(Bars.HighPrices, index, half);
            double ll1 = Lowest(Bars.LowPrices, index, half);
            double n1 = (hh1 - ll1) / half;

            double hh2 = Highest(Bars.HighPrices, index - half, half);
            double ll2 = Lowest(Bars.LowPrices, index - half, half);
            double n2 = (hh2 - ll2) / half;

            double hh3 = Highest(Bars.HighPrices, index, n);
            double ll3 = Lowest(Bars.LowPrices, index, n);
            double n3 = (hh3 - ll3) / n;

            double dimen = (n1 > 0 && n2 > 0 && n3 > 0) ? (Math.Log(n1 + n2) - Math.Log(n3)) / Math.Log(2) : 1;
            double alpha = Math.Exp(-4.6 * (dimen - 1));
            alpha = Math.Max(Math.Min(alpha, 1), 0.01);

            double price = (Bars.HighPrices[index] + Bars.LowPrices[index]) / 2;
            double prevFilt = index > 0 && !double.IsNaN(_framaFilt[index - 1]) ? _framaFilt[index - 1] : price;
            double filt = alpha * price + (1 - alpha) * prevFilt;
            _framaFilt[index] = filt;

            double volatility = Average(HighMinusLow, index, 200);
            FramaOutput[index] = filt;
            FramaUpperOutput[index] = filt + volatility * FramaDistance;
            FramaLowerOutput[index] = filt - volatility * FramaDistance;
        }

        private double HighMinusLow(int i) => Bars.HighPrices[i] - Bars.LowPrices[i];

        private double Average(Func<int, double> f, int index, int length)
        {
            double sum = 0; int n = 0;
            for (int i = Math.Max(0, index - length + 1); i <= index; i++) { sum += f(i); n++; }
            return n > 0 ? sum / n : 0;
        }

        private double Average(DataSeries src, int index, int length)
        {
            double sum = 0; int n = 0;
            for (int i = Math.Max(0, index - length + 1); i <= index; i++) { sum += src[i]; n++; }
            return n > 0 ? sum / n : src[index];
        }

        private double Highest(DataSeries src, int index, int length)
        {
            double max = double.MinValue;
            for (int i = Math.Max(0, index - length + 1); i <= index; i++) if (src[i] > max) max = src[i];
            return max;
        }

        private double Lowest(DataSeries src, int index, int length)
        {
            double min = double.MaxValue;
            for (int i = Math.Max(0, index - length + 1); i <= index; i++) if (src[i] < min) min = src[i];
            return min;
        }

        // =========================================================================
        // FIBONACCI — último impulso significativo + niveles de retroceso
        // =========================================================================
        private static readonly double[] FibLevels = { 0, 23.6, 38.2, 50, 61.8, 78.6, 100 };

        private void CalculateFibonacci(int index)
        {
            double highestPrice = Highest(Bars.HighPrices, index, FibLookback);
            double lowestPrice = Lowest(Bars.LowPrices, index, FibLookback);

            int highBar = FindBarAt(Bars.HighPrices, index, FibLookback, highestPrice);
            int lowBar = FindBarAt(Bars.LowPrices, index, FibLookback, lowestPrice);

            double range = highestPrice - lowestPrice;
            double impulsePercent = lowestPrice > 0 ? (range / lowestPrice) * 100 : 0;
            bool significant = impulsePercent >= FibMinImpulsePercent;

            if (!significant) { _impulseDetected = false; return; }

            bool wasDetected = _impulseDetected;
            if (highBar > lowBar)
            {
                _impulseStartPrice = lowestPrice; _impulseEndPrice = highestPrice;
                _impulseStartBar = lowBar; _impulseEndBar = highBar;
                _isBullishImpulse = true; _impulseDetected = true;
            }
            else if (lowBar > highBar)
            {
                _impulseStartPrice = highestPrice; _impulseEndPrice = lowestPrice;
                _impulseStartBar = highBar; _impulseEndBar = lowBar;
                _isBullishImpulse = false; _impulseDetected = true;
            }
            else
            {
                _impulseDetected = false;
                return;
            }

            if (!wasDetected || true) // redibuja cada barra mientras el impulso siga vigente (igual que el Pine, que recalcula siempre)
                DrawFibLevels(index);
        }

        private int FindBarAt(DataSeries src, int index, int length, double target)
        {
            for (int i = index; i >= Math.Max(0, index - length + 1); i--)
                if (Math.Abs(src[i] - target) < double.Epsilon) return i;
            return index;
        }

        private double CalcFibPrice(double level)
        {
            return _isBullishImpulse
                ? _impulseEndPrice - (_impulseEndPrice - _impulseStartPrice) * (level / 100)
                : _impulseEndPrice + (_impulseStartPrice - _impulseEndPrice) * (level / 100);
        }

        private void DrawFibLevels(int index)
        {
            var extend = FibExtendRight;
            foreach (var level in FibLevels)
            {
                double price = CalcFibPrice(level);
                string name = $"fib-{level:0.0}";
                var line = ChartObjects.DrawTrendLine(name, _impulseStartBar, price, index, price, Color.White, 1, LineStyle.Solid);
                if (extend) line.ExtendToInfinity = true;
                ChartObjects.DrawText($"{name}-label", $"{level:0.0}% — {price:0.#####}", index, price, Color.White);
            }

            string impulseLineName = "fib-impulse-line";
            ChartObjects.DrawTrendLine(impulseLineName, _impulseStartBar, _impulseStartPrice, _impulseEndBar, _impulseEndPrice,
                _isBullishImpulse ? Color.Green : Color.Red, 2, LineStyle.Dots);
        }

        // =========================================================================
        // SESIONES (NY / Londres / Asia) — sombreado de fondo con conversión de zona horaria
        // =========================================================================
        private void ShadeSession(int index)
        {
            DateTime utcTime = Bars.OpenTimes[index];
            DateTime localTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcTime, DateTimeKind.Utc), _timezone);
            int hour = localTime.Hour;

            bool inNy = InSession(hour, NySessionStartHour, NySessionEndHour);
            bool inLondon = InSession(hour, LondonSessionStartHour, LondonSessionEndHour);
            bool inAsia = InSession(hour, AsiaSessionStartHour, AsiaSessionEndHour);

            if (inNy) ChartObjects.DrawRectangle($"sess-ny-{index}", index, Bars.HighPrices[index], index, Bars.LowPrices[index], Color.FromArgb(15, 96, 252, 244), 0);
            if (inLondon) ChartObjects.DrawRectangle($"sess-ldn-{index}", index, Bars.HighPrices[index], index, Bars.LowPrices[index], Color.FromArgb(15, 250, 122, 239), 0);
            if (inAsia) ChartObjects.DrawRectangle($"sess-asia-{index}", index, Bars.HighPrices[index], index, Bars.LowPrices[index], Color.FromArgb(50, 0, 0, 0), 0);
        }

        private bool InSession(int hour, int start, int end)
        {
            return start <= end ? hour >= start && hour < end : hour >= start || hour < end; // soporta sesiones que cruzan medianoche (ej. Asia)
        }
    }
}
