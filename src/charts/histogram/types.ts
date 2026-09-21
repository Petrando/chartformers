import { Bin } from "d3";

export type histogramDatum = Record<string, unknown>;

export type histogramChartData<T extends histogramDatum> = {
    title: string;
    valueKey?: string;
    data: T[] | histogramChartData<T>[];
};

export type binnedData = Bin<histogramDatum, number>;