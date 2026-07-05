// Indicador cAlgo (cTrader) — reconstrucción funcional de "RSI & Volumen [RRHB]" (Pine Script v5).
// No es traducción literal: la librería externa de Pine (HoanGhetti/SimpleTrendlines) no está disponible
// como código fuente, así que la detección de pivotes y ruptura de tendencia se reimplementa directo
// contra la API de dibujo de cAlgo (ChartObjects), preservando el mismo comportamiento visible.
//
// Solo visual — no coloca ni gestiona órdenes.

using System;
using cAlgo.API;
using cAlgo.API.Indicators;

namespace cAlgo.Indicators
{
    [Indicator(IsOverlay = false, AccessRights = AccessRights.None)]
    public class RsiVolumenRRHB : Indicator
    {
        [Parameter("Usar timeframe distinto al del chart", DefaultValue = false, Group = "Timeframe")]
        public bool UseCustomTimeframe { get; set; }

        [Parameter("Timeframe RSI", DefaultValue = "Hour", Group = "Timeframe")]
        public TimeFrame RsiTimeframe { get; set; }

        [Parameter("Pivot Lookback", DefaultValue = 4, MinValue = 1, Group = "Trendlines")]
        public int PivotLookback { get; set; }

        [Parameter("RSI Length", DefaultValue = 14, MinValue = 1, Group = "Trendlines")]
        public int RsiLength { get; set; }

        [Parameter("RSI Source", Group = "Trendlines")]
        public DataSeries RsiSource { get; set; }

        [Parameter("RSI Difference (umbral de ruptura)", DefaultValue = 3, Group = "Conditions")]
        public double RsiDiffThreshold { get; set; }

        [Parameter("Repaint en vivo (sin confirmar barra)", DefaultValue = true, Group = "Conditions")]
        public bool Repaint { get; set; }

        [Parameter("Mostrar volumen", DefaultValue = true, Group = "Volumen")]
        public bool ShowVolume { get; set; }

        [Parameter("Media móvil volumen", DefaultValue = 20, MinValue = 1, Group = "Volumen")]
        public int VolumeMaLength { get; set; }

        [Parameter("Color pivote bajo (soporte)", DefaultValue = "Purple", Group = "Estilo")]
        public Color PivotLowColor { get; set; }

        [Parameter("Color pivote alto (resistencia)", DefaultValue = "DodgerBlue", Group = "Estilo")]
        public Color PivotHighColor { get; set; }

        [Output("RSI", LineColor = "White", Thickness = 2)]
        public IndicatorDataSeries RsiOutput { get; set; }

        [Output("Volumen escalado", PlotType = PlotType.Histogram, LineColor = "Gray")]
        public IndicatorDataSeries VolumeScaledOutput { get; set; }

        [Output("Media móvil volumen", LineColor = "DarkGray", Thickness = 1)]
        public IndicatorDataSeries VolumeMaOutput { get; set; }

        private Bars _rsiBars;
        private RelativeStrengthIndex _rsi;
        private MovingAverage _volumeMa;

        // Estado de la línea de tendencia activa para cada tipo de pivote (low=soporte, high=resistencia).
        private class TrendlineState
        {
            public int PivotBarIndex = -1;
            public double PivotValue = double.NaN;
            public int PrevPivotBarIndex = -1;
            public double PrevPivotValue = double.NaN;
            public bool HasCrossed;
        }

        private readonly TrendlineState _lowState = new TrendlineState();
        private readonly TrendlineState _highState = new TrendlineState();

        protected override void Initialize()
        {
            _rsiBars = UseCustomTimeframe ? MarketData.GetBars(RsiTimeframe) : Bars;
            _rsi = Indicators.RelativeStrengthIndex(RsiSource, RsiLength);
            _volumeMa = Indicators.MovingAverage(Bars.TickVolumes, VolumeMaLength, MovingAverageType.Simple);

            ChartObjects.DrawHorizontalLine("rsi-70", 70, Color.FromHex("#9c27b0"), 1, LineStyle.Dots);
            ChartObjects.DrawHorizontalLine("rsi-50", 50, Color.White, 1, LineStyle.Dots);
            ChartObjects.DrawHorizontalLine("rsi-30", 30, Color.FromHex("#00bcd4"), 1, LineStyle.Dots);
        }

        public override void Calculate(int index)
        {
            double rsiValue = _rsi.Result[index];
            RsiOutput[index] = rsiValue;

            if (ShowVolume)
            {
                double maxVol = Highest(Bars.TickVolumes, index, 100);
                double volScaled = maxVol > 0 ? (Bars.TickVolumes[index] / maxVol) * 25 : 0;
                VolumeScaledOutput[index] = volScaled;
                VolumeMaOutput[index] = _volumeMa.Result[index] > 0 ? (_volumeMa.Result[index] / Math.Max(maxVol, 1)) * 25 : 0;
            }

            // Necesitamos ver PivotLookback barras hacia adelante para confirmar un pivote (igual que
            // ta.pivotlow/pivothigh de Pine con rightbars = PivotLookback) — se evalúa con retraso.
            int candidateIndex = index - PivotLookback;
            if (candidateIndex - 1 < 0) return;

            EvaluatePivot(candidateIndex, isLow: true);
            EvaluatePivot(candidateIndex, isLow: false);

            CheckBreakout(index, _lowState, isLow: true);
            CheckBreakout(index, _highState, isLow: false);
        }

        private double Highest(DataSeries series, int index, int length)
        {
            double max = double.MinValue;
            for (int i = Math.Max(0, index - length + 1); i <= index; i++)
                if (series[i] > max) max = series[i];
            return max;
        }

        private bool IsPivotLow(int candidateIndex)
        {
            double v = RsiOutput[candidateIndex];
            for (int i = 1; i <= PivotLookback; i++)
            {
                if (candidateIndex - i < 0 || candidateIndex + i >= RsiOutput.Count) return false;
                if (RsiOutput[candidateIndex - i] < v || RsiOutput[candidateIndex + i] < v) return false;
            }
            return true;
        }

        private bool IsPivotHigh(int candidateIndex)
        {
            double v = RsiOutput[candidateIndex];
            for (int i = 1; i <= PivotLookback; i++)
            {
                if (candidateIndex - i < 0 || candidateIndex + i >= RsiOutput.Count) return false;
                if (RsiOutput[candidateIndex - i] > v || RsiOutput[candidateIndex + i] > v) return false;
            }
            return true;
        }

        private void EvaluatePivot(int candidateIndex, bool isLow)
        {
            bool isPivot = isLow ? IsPivotLow(candidateIndex) : IsPivotHigh(candidateIndex);
            if (!isPivot) return;

            var state = isLow ? _lowState : _highState;
            double value = RsiOutput[candidateIndex];
            bool improves = isLow ? value > state.PivotValue || double.IsNaN(state.PivotValue)
                                   : value < state.PivotValue || double.IsNaN(state.PivotValue);

            // Un pivote nuevo reemplaza al anterior solo si "mejora" la tendencia (igual que la condición
            // pivotCond del Pine: pivot > prevPivot para soporte ascendente, pivot < prevPivot para resistencia descendente).
            if (state.PivotBarIndex != candidateIndex && (double.IsNaN(state.PivotValue) || improves))
            {
                state.PrevPivotBarIndex = state.PivotBarIndex;
                state.PrevPivotValue = state.PivotValue;
                state.PivotBarIndex = candidateIndex;
                state.PivotValue = value;
                state.HasCrossed = false;

                if (!double.IsNaN(state.PrevPivotValue))
                {
                    var color = isLow ? PivotLowColor : PivotHighColor;
                    string lineName = $"rsi-trend-{(isLow ? "low" : "high")}-{state.PivotBarIndex}";
                    ChartObjects.DrawTrendLine(lineName, state.PrevPivotBarIndex, state.PrevPivotValue, state.PivotBarIndex, state.PivotValue, color, 2, LineStyle.Dots);
                }
            }
        }

        private void CheckBreakout(int index, TrendlineState state, bool isLow)
        {
            if (state.HasCrossed || double.IsNaN(state.PivotValue) || double.IsNaN(state.PrevPivotValue)) return;

            double rsiValue = RsiOutput[index];
            bool broke = isLow
                ? rsiValue < state.PivotValue - RsiDiffThreshold
                : rsiValue > state.PivotValue + RsiDiffThreshold;

            if (!Repaint && !IsLastBar) return; // "Off: Bar Confirmation" — solo evalúa en la última barra cerrada.

            if (broke)
            {
                state.HasCrossed = true;
                var color = isLow ? PivotLowColor : PivotHighColor;
                string labelName = $"rsi-break-{(isLow ? "low" : "high")}-{index}";
                ChartObjects.DrawText(labelName, "Br", index, isLow ? state.PivotValue - 5 : state.PivotValue + 5, color);
            }
        }
    }
}
