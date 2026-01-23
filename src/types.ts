import { SankeyNodeMinimal, SankeyNode } from "d3-sankey";

export type pointData = {
    label: string;
    value: number;
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