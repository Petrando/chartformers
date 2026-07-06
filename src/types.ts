export type pointData = {
    label: string;
    value: number;
}

export type rawLink = {
  source: string
  target: string
  value: number
}

export type sankeyNode = {
    name: string;    
}

export type sankeyLink = {
    source: any;
    target: any;
    value: number;    
    sourceName?: string;
    targetName?: string;
    id?: string;
}

export type sankeyData = {
    nodes: sankeyNode[];
    links: sankeyLink[];
}

export type hierarchyData = {
    name: string;
    value?: number;
    children?: hierarchyData[];
}

export type ageRangeGroup = {
    ageRange: string;
    male: number;
    female: number;
    Total?: number;
}

export type tooltipFormat = {
    formatType?: "long" | "short";
    prefix?: string;
    suffix?: string;
}

export interface HierarchyNode {
    value?: number
    depth?: number
    parent?: HierarchyNode
    children?: HierarchyNode[]

    x?: number
    y?: number
    r?: number

    _pack_next?: HierarchyNode
    _pack_prev?: HierarchyNode
}

export interface PackNode {
    value: number;
    x: number;
    y: number;
    r: number;
    depth?: number;
    parent?: PackNode;
    children?: PackNode[];
    // Internal properties used by the packing algorithm
    _pack_next?: PackNode;
    _pack_prev?: PackNode;
}

export interface PackLink {
    source: PackNode;
    target: PackNode;
}

export interface waterfallDatum {
    label: string;
    start?: number;
    value: number;
    end?: number;
    //the 'type' property should only be 'total' | 'variation' but strengthening the type will cause
    //import problem. Think about the solution later
    type: string;//"total" | "variation";
}

export interface deltaWaterfallDatum {
    label: string;
    data: waterfallDatum[];
}

export type numericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export type dumbbellDatum = {
  label: string;
  [key: string]: number | string;
}

export type chordDatum = {
    name: string;
    values: number[]
}

export type histogramDatum = Record<string, unknown>;

export type histogramChartData<T extends histogramDatum> = {
    title: string;
    valueKey?: string;
    data: T[] | histogramChartData<T>[];
};

export type lineChartDatum = Record<string, string | number | Date>;

export type lineTooltipPosData = { xPos: number, low: number, volume: number }

export type curveTypes = "linear" | "basis" | "cardinal" | "catmullrom" | "natural"
export type lineDecor = {
    showLine?: boolean;
    showDots?: boolean;
    curve?: curveTypes;
}

export type orientationType = "vertical" | "horizontal"