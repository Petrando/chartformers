export interface LayeredData {
    label: string;
    total?: number;
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
export type ExtendedSeries = ExtendedSeriesPoint[] & {
    key: string;
};
export interface StackedBarChartProps {
    data: LayeredData[];
    colorIdx?: number;
    orientation?: 'vertical' | 'horizontal';
}
