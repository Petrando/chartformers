import { schemeSet1, schemeSet2, schemeSet3, schemeCategory10, schemeTableau10, shuffle, format,
    Selection, ScaleBand, ScaleLinear,  
    line,
    curveLinear,
    curveBasis,
    curveCardinal,
    curveCatmullRom,
    curveNatural
  } from "d3"
import { tooltipFormat, pointData, curveTypes, orientationType, formatType } from "./types";

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

export const indexColor = (i:number, assortedColorFirst:boolean=true, shuffleColor:boolean=false) => {
    const FINAL_COLOR_POOL = shuffleColor?SHUFFLED_COLOR_POOL:
        assortedColorFirst?
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

export const formatNum = (num: number, formatType:formatType = "long") => {
    if(num < 0){
        return num.toFixed(4)
    }
    return formatType === "long"?format(",")(num):format("~s")(num)
}
export const formatTooltipNum = (num: number, tooltipFormat: tooltipFormat) => {
    const { formatType, prefix, suffix } = tooltipFormat

    const sign = num < 0?"-":""
    const formattedNum = formatNum(Math.abs(num), formatType)
    return `${prefix}${sign}${formattedNum}${suffix}`
}

export function isISODateString(str: string | Date) {
    if(str instanceof Date){
        return true
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(str) &&
         !Number.isNaN(new Date(str).getTime());
}

export const rotateLabels = (width: number, labels: string[]) => {
    const rotate = (width < 640 && labels.length > 3) ||
        (width < 768 && labels.length > 4) ||
        (width < 1024 && labels.length > 7) ||
        (width < 1280 && labels.length > 9)

    return rotate;
}

export const sanitizeString = (str: string) => {
    return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}


export function renderLineChart(
    canvas: Selection<SVGGElement, unknown, null, undefined>, 
    labelScale: {scale: ScaleBand<string>, offset: number},
    valueScale: ScaleLinear<number, number>,
    renderData: {data: pointData[], idExtension?: string},
    width: number,
    orientation: orientationType = "vertical",
    lineProps: {
        showLine?: boolean, showDots?: boolean, curve?: curveTypes,
        lineStroke?: string, dotFill?: string 
    } = { showLine: false, showDots: true, curve: "linear" },             
    
){
    const {data, idExtension} = renderData
    const lineFn = line<pointData>()
        .x((d) => 
            orientation === "vertical"?
                (labelScale.scale(d.label) ?? 0) + labelScale.offset:
                valueScale(d.value)
        )
        .y((d) => 
            orientation === "horizontal"?
                (labelScale.scale(d.label) ?? 0) + labelScale.offset:
                valueScale(d.value)
        )

    const { curve, showLine, showDots, lineStroke, dotFill } = lineProps
    //"linear" | "basis" | "cardinal" | "catmullrom" | "natural"
    if(curve === "linear"){
        lineFn.curve(curveLinear)
    }else if(curve === "basis"){
        lineFn.curve(curveBasis)
    }else if(curve === "cardinal"){
        lineFn.curve(curveCardinal)
    }else if(curve === "catmullrom"){
        lineFn.curve(curveCatmullRom)
    }else if(curve === "natural"){
        lineFn.curve(curveNatural)
    }

    const isMediumScreen = width > 576;
    const radius = isMediumScreen?3:2
    const lineColor = lineStroke ?? "#594c5b"

    const animDuration = 500
    const lineData = showLine?[data]:[]
    const lines = canvas
        .selectAll<SVGPathElement, pointData[]>(!idExtension?"path.chartline":`path.chartline${idExtension}`)
        .data(lineData)
        .join(
            enter=>enter.append("path")
                .attr("class", !idExtension?"chartline":`chartline${idExtension}`)
                .attr("fill", "none")
                .attr("stroke", lineColor)
                .attr("stroke-width", 2)
                .style("stroke-opacity", 0.75)                    
                .style("pointer-events", "none"),
            undefined,
            exit=>exit.remove()
        )

    
    lines
        .transition().duration(animDuration)
        .attr("d", (d) => lineFn(d))
        .attr("stroke", lineColor)
    
    lines.raise()

    const cx = (d: pointData) => {
        return orientation === "vertical"?
            (labelScale.scale(d.label) ?? 0) + labelScale.offset:
            valueScale(d.value)
    }

    const cy = (d: pointData) => {
        return orientation === "vertical"?
            valueScale(d.value):
            (labelScale.scale(d.label) ?? 0) + labelScale.offset
    }

    const dotsData = (showLine && showDots)?data:[]
    const dots =  canvas
        .selectAll<SVGCircleElement, pointData>(!idExtension?".dot":`.dot${idExtension}`)
        .data(dotsData, 
            (d) => !idExtension?String(d.label):String(d.label) + idExtension)
        .join(
            enter=>enter.append("circle")
                .attr("class", !idExtension?"dot":`dot${idExtension}`)
                .attr("cx", function(d){
                    return orientation === "horizontal"?
                        valueScale(0):(labelScale.scale(d.label) ?? 0) + labelScale.offset
                })
                .attr("cy", function(d){
                    return orientation === "vertical"?
                        valueScale(0):(labelScale.scale(d.label) ?? 0) + labelScale.offset
                })
                .attr("fill", lineColor)
                .attr("r", 0)
                .style("pointer-events", "none")
                    .transition().duration(animDuration)
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", radius),
            undefined,
            exit=>exit.transition().duration(animDuration)
                .style("opacity", 0)
                .remove()
        )
                .transition().duration(animDuration)
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", radius)
            .attr("fill", lineColor)
}

export const isFiniteNumber = (value: unknown): value is number => Number.isFinite(value);