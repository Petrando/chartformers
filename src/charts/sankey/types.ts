export type sankeyNode = {
    name: string;    
}

export type rawLink = {
  source: string
  target: string
  value: number
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