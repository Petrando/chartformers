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