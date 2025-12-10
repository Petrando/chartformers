import { default as React } from 'react';
import { pointData } from '../types';
type BarchartProps = {
    data: pointData[];
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    orientation?: 'horizontal' | 'vertical';
};
export declare function BarChart({ data, color: { idx, // default idx
type, }, orientation }: BarchartProps): React.JSX.Element;
export {};
