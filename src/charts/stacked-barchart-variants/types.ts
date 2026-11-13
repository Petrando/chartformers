import { marginType, tooltipFormat } from "../../types";

export interface LayeredData {
  label: string;
  total?: number;
  totalPos?: number;
  totalMin?: number;
  [subject: string]: number | string | undefined;
}

export interface SortedLayer {
  label: string;
  value: number | string | undefined;
}

export type ExtendedSeriesPoint = d3.SeriesPoint<LayeredData> & {
  key: string;
  barKey: string;
};

export type ExtendedSeries = ExtendedSeriesPoint[] & { key: string };

export type ExtendedSeriesPointWithSorted = d3.SeriesPoint<LayeredData & { sortedLayers: string[] }> & {
  key: string;
  barKey: string;
};

export type ExtendedSeriesWithSorted = ExtendedSeriesPointWithSorted[] & { key: string };

export type labelAxisType = {
      paddingInner?: number;
      paddingOuter?: number;
      align?: number;
      tickSizeInner?: number;
}

export type valueAxisType = {
      tickSizeInner?: number;
      ticks?: number;
    }

export interface StackedBarChartProps {
    data: LayeredData[];
    colorIdx?: number;
    orientation?: 'vertical' | 'horizontal';
    margin?: marginType;
    labelAxis?: labelAxisType;
    valueAxis?: valueAxisType;
    tooltipFormat?: tooltipFormat;
}

export type stackOrderByCategory = {
    label: string;
    top: string;
    bottom: string;
}