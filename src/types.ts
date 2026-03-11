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

export interface waterfallData {
    label: string;
    start?: number;
    value: number;
    end?: number;
    type: "total" | "variation";
}

/*export type dumbbellDatum = {
  label: string
  valueA: number
  valueB: number
}

export type dumbbellDatum<
    L extends string,
    A extends string,
    B extends string
> = {
    [K in L]: string
} & {
    [K in A | B]: number
}*/

export type numericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export type dumbbellDatum = {
  label: string;
  [key: string]: number | string;
}