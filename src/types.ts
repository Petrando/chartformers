import { SankeyNodeMinimal, SankeyNode } from "d3-sankey";

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

export type circlePackData = {
    name: string;
    value?: number;
    children?: circlePackData[];
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

export interface stockData {
    date: string;
    open: string | number;
    hi: string | number;
    low: string | number;
    close: string | number;
    adj_close: string | number;
    volume: string | number;
}

export interface stockDataFormatted {
  date: Date
  open: number
  hi: number
  low: number
  close: number
  adj_close: number
  volume: number
}

export type lineDatum = { date: Date; value: number }
