import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { PriceUpdate } from '../models/Ticker';
import { formatPrice } from '../helpers/format';

interface ChartComponentProps {
  data: PriceUpdate[];
  symbol: string;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({ data, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // 1. Initialize Chart
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
          style: 3, // dashed
          labelBackgroundColor: '#1F2937',
        },
        horzLine: {
          width: 1,
          color: '#3B82F6',
          style: 3, // dashed
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
      autoscaleInfoProvider: (original) => {
        const res = original();
        if (res !== null && res.priceRange.minValue === res.priceRange.maxValue) {
          const price = res.priceRange.minValue;
          // Eğer grafik tamamen düz bir çizgi ise, Y eksenine suni bir aralık (padding) verelim
          res.priceRange.minValue = price - (price * 0.001);
          res.priceRange.maxValue = price + (price * 0.001);
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
      }
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
    };
  }, [symbol]); // Re-create entirely if symbol changes

  // Track if minMove has been updated for this symbol
  const minMoveUpdatedRef = useRef<boolean>(false);

  // Reset the ref when the symbol changes
  useEffect(() => {
    minMoveUpdatedRef.current = false;
  }, [symbol]);

  // 2. Update Data
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const interval = 5000; // 5 seconds bucket
    const groups = new Map<number, PriceUpdate[]>();

    // 1. Gelen tüm verileri 5 saniyelik kutulara (bucket) yerleştir
    data.forEach(tick => {
      const timeBucket = Math.floor(tick.timestamp / interval) * interval;
      if (!groups.has(timeBucket)) {
        groups.set(timeBucket, []);
      }
      groups.get(timeBucket)!.push(tick);
    });

    // 2. Kutuları zamana göre sırala ve OHLC (Open-High-Low-Close) formatına çevir
    const ohlcData = Array.from(groups.entries())
      .sort(([timeA], [timeB]) => timeA - timeB)
      .map(([timeBucket, ticks]) => {
        ticks.sort((a, b) => a.timestamp - b.timestamp); // Bucket içindekileri sıraya diz
        
        const open = ticks[0].price;
        const close = ticks[ticks.length - 1].price;
        const high = Math.max(...ticks.map(t => t.price));
        const low = Math.min(...ticks.map(t => t.price));
        
        return {
          time: (timeBucket / 1000) as any, // Unix timestamp in seconds
          open,
          high,
          low,
          close,
        };
      });

    // 3. Kopuk mum (gap) oluşmaması için her mumun açılışını bir öncekinin kapanışına bağla
    for (let i = 1; i < ohlcData.length; i++) {
      ohlcData[i].open = ohlcData[i - 1].close;
      
      // Open değeri değiştiği için iğnelerin (wick) dışında kalmasın diye kontrol et
      if (ohlcData[i].open > ohlcData[i].high) ohlcData[i].high = ohlcData[i].open;
      if (ohlcData[i].open < ohlcData[i].low) ohlcData[i].low = ohlcData[i].open;
    }
    
    // Update minMove based on the first valid price to prevent Y-axis scale issues
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
          minMove: minMove,
        }
      });
      minMoveUpdatedRef.current = true;
    }

    // Güvenle grafiğe aktar (spike veya hata riski sıfırlandı)
    try {
      seriesRef.current.setData(ohlcData);
      console.log('Chart container dimensions:', chartContainerRef.current?.clientWidth, 'x', chartContainerRef.current?.clientHeight);
      console.log('ohlc data length:', ohlcData.length, 'first:', ohlcData[0]);
    } catch (e: any) {
      console.error("Lightweight charts setData error:", e);
    }
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};