import React, { useEffect, useRef } from 'react';
import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from 'lightweight-charts';
import { PriceUpdate } from '../models/Ticker';
import { formatPrice } from '../helpers/format';

interface ChartComponentProps {
  data: PriceUpdate[];
  symbol: string;
  onLoadMore?: () => void;
}

const toChartTimestamp = (timestamp: number): UTCTimestamp =>
  Math.floor(timestamp / 1000) as UTCTimestamp;

export const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  symbol,
  onLoadMore,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const minMoveUpdatedRef = useRef(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#1F2937', style: 1 },
        horzLines: { color: '#1F2937', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#3B82F6',
          style: 3,
          labelBackgroundColor: '#1F2937',
        },
        horzLine: {
          width: 1,
          color: '#3B82F6',
          style: 3,
          labelBackgroundColor: '#1F2937',
        },
      },
      rightPriceScale: {
        borderColor: '#1F2937',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1F2937',
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 15,
        barSpacing: 10,
        fixLeftEdge: true,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    // Add Candlestick Series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderVisible: true,
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
      autoscaleInfoProvider: (original: () => any) => {
        const res = original();
        if (
          res !== null &&
          res.priceRange.minValue === res.priceRange.maxValue
        ) {
          const price = res.priceRange.minValue;
          const padding = price * 0.001;
          res.priceRange.minValue = price - padding;
          res.priceRange.maxValue = price + padding;
        }
        return res;
      },
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => {
          if (price === undefined || price === null || isNaN(price)) return '';
          return formatPrice(price);
        },
        minMove: 0.00001,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
    };
  }, [symbol]);

  useEffect(() => {
    if (!chartRef.current || !onLoadMore) return;

    const timeScale = chartRef.current.timeScale();
    const handleVisibleLogicalRangeChange = (range: any) => {
      if (!range) return;

      // If the user has scrolled close to the oldest available data point
      if (range.from < 10) {
        onLoadMore();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(
      handleVisibleLogicalRangeChange,
    );

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(
        handleVisibleLogicalRangeChange,
      );
    };
  }, [onLoadMore]);

  useEffect(() => {
    minMoveUpdatedRef.current = false;
  }, [symbol]);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const interval = 5000;
    const groups = new Map<number, PriceUpdate[]>();

    data.forEach((tick) => {
      const timeBucket = Math.floor(tick.timestamp / interval) * interval;
      if (!groups.has(timeBucket)) {
        groups.set(timeBucket, []);
      }

      const bucket = groups.get(timeBucket);
      if (bucket) {
        bucket.push(tick);
      }
    });

    const ohlcData: CandlestickData[] = Array.from(groups.entries())
      .sort(([timeA], [timeB]) => timeA - timeB)
      .map(([timeBucket, ticks]) => {
        ticks.sort((a, b) => a.timestamp - b.timestamp);

        const open = ticks[0].price;
        const close = ticks[ticks.length - 1].price;
        const high = Math.max(...ticks.map((t) => t.price));
        const low = Math.min(...ticks.map((t) => t.price));

        return {
          time: toChartTimestamp(timeBucket),
          open,
          high,
          low,
          close,
        };
      });

    for (let i = 1; i < ohlcData.length; i++) {
      ohlcData[i].open = ohlcData[i - 1].close;

      if (ohlcData[i].open > ohlcData[i].high)
        ohlcData[i].high = ohlcData[i].open;
      if (ohlcData[i].open < ohlcData[i].low)
        ohlcData[i].low = ohlcData[i].open;
    }

    if (ohlcData.length > 0 && !minMoveUpdatedRef.current) {
      const firstPrice = ohlcData[0].open;
      let minMove = 0.00001;
      if (firstPrice >= 1000) minMove = 0.01;
      else if (firstPrice >= 10) minMove = 0.01;

      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => {
            if (p === undefined || p === null || isNaN(p)) return '';
            return formatPrice(p);
          },
          minMove,
        },
      });
      minMoveUpdatedRef.current = true;
    }

    try {
      seriesRef.current.setData(ohlcData);
    } catch (error: unknown) {
      console.error('Lightweight charts setData error:', error);
    }
  }, [data]);

  return <div ref={chartContainerRef} className="chart-component" />;
};
