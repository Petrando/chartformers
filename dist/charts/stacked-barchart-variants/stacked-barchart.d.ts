import { default as React } from 'react';
import { StackedBarChartProps } from './types';
type StackedBarChartPropsExtended = StackedBarChartProps & {
    focusOnPlot?: boolean;
};
export declare function StackedBarChart({ data, focusOnPlot, colorIdx, orientation }: StackedBarChartPropsExtended): React.JSX.Element;
export {};
