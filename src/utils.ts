import { schemeSet1, schemeSet2, schemeSet3, schemeCategory10, schemeTableau10, shuffle, format  } from "d3"
import { tooltipFormat } from "./types";

export const cloneObj = (arr:any) => {    
    try{
        const clone = JSON.parse(JSON.stringify(arr));
        return clone
    }
    catch(err){
        console.log('error when cloning object : ')

        return Array.isArray(arr)?[]:null
    }
}

const selectedColors = [    
    "#34D399", /* non - tailwind */
    "#6ee7b7", "#10b981", "#059669",
    "#bef264", "#a3e635", "#84cc16",
    "#86efac", "#4ade80", "#16a34a",     
    "#5eead4", "#2dd4bf", "#14b8a6",
    "#67e8f9", "#22d3ee", "#06b6d4",
    "#7dd3fc", "#38bdf8", "#0ea5e9",
    "#93c5fd", "#60a5fa", "#3b82f6",
    "#a5b4fc", "#818cf8", "#6366f1",
    "#a78bfa", "#8b5cf6", "#7c3aed",
    "#d8b4fe", "#c084fc", "#a855f7", 
    "#f9a8d4", "#f472b6", "#ec4899",
    "#fb7185", "#f43f5e", "#db2777",
    "#fca5a5", "#f87171", "#ef4444",
    "#fdba74", "#fb923c", "#f97316",
    "#fcd34d", "#fbbf24", "#f59e0b", 
    "#fde047", "#facc15", "#eab308",
]

const SHUFFLED_COLOR_POOL = shuffle([
    ...schemeSet2,
    ...schemeSet1,
    ...schemeSet3,
    ...schemeTableau10,
    ...schemeCategory10,
]);

const COLOR_POOL = [  
    ...schemeSet2,
    ...schemeSet1,
    ...schemeSet3,
    ...schemeTableau10,
    ...schemeCategory10,
]

export const indexColor = (i:number, assortedColorFirst:boolean=true) => {
    const FINAL_COLOR_POOL = assortedColorFirst?
        [...selectedColors, ...COLOR_POOL]:[...COLOR_POOL, ...selectedColors]

    if (i < FINAL_COLOR_POOL.length) return FINAL_COLOR_POOL[i];
    return FINAL_COLOR_POOL[i % FINAL_COLOR_POOL.length];    
}

export const indexSelectedColor = (i:number) => {
    if (i < selectedColors.length) return selectedColors[i];
    return selectedColors[i % selectedColors.length];    
}

export const basicFormat = (num:number, {
  formatType = "long",
  prefix = "",
  suffix = "",
}: tooltipFormat = {}) => {
    return prefix + format(formatType === "long"?",":"~s")(num) + suffix
}

export function getMouseYInData(e: MouseEvent, svg: SVGSVGElement, yScale: d3.ScaleLinear<number, number>) {
    const { top } = svg.getBoundingClientRect();
    const pixelY = e.clientY - top;
    return {
        pixelY,
        dataY: yScale.invert(pixelY)
    };
}

