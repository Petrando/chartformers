import { Bin, HierarchyNode as d3HierarchyNode, HierarchyCircularNode, HierarchyLink } from "d3";
import {
  SimulationNodeDatum,
  SimulationLinkDatum
} from "d3-force";

export type pointData = {
    label: string;
    value: number;
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

export type lineChartDatum = Record<string, string | number | Date>;

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

export type networkNode = SimulationNodeDatum & {
    id: string;
    group?: number; 
    radius?: number;
    color?: string;
};

export type networkLink = SimulationLinkDatum<networkNode> & {
    source: string;
    target: string;
    value?: number;
    type?: string;
};

export type networkResolvedLink = Omit<networkLink, "source" | "target"> & {
    source: networkNode;
    target: networkNode;
    value?: number;
    type?: string;
};

export type networkDataType = {
    nodes: networkNode[], links: networkLink[]
}

export type networkEdge = [string, string]



export type networkHierarchyNode = SimulationNodeDatum & HierarchyCircularNode<hierarchyData>;
export type networkHierarchyLink = SimulationLinkDatum<networkHierarchyNode> & 
    HierarchyLink<hierarchyData> & 
    {
        value?: number;
    };