export type pointData = {
    label: string;
    value: number;
}

export type formatType = "long" | "short";
export type tooltipFormat = {
    formatType?: formatType;
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

export type lineTooltipPosData = { xPos: number, low: number, volume: number }

export type curveTypes = "linear" | "basis" | "cardinal" | "catmullrom" | "natural"

export type lineDecor = {
    showLine?: boolean;
    showDots?: boolean;
    curve?: curveTypes;
}

export type hierarchyData = {
    name: string;
    value?: number;
    children?: hierarchyData[];
    color?: string;
    group?: string;
}

export type orientationType = "vertical" | "horizontal"