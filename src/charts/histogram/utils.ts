import { line, curveLinear, curveBasis, curveCardinal, curveCatmullRom, curveNatural, Selection, 
    ScaleLinear, ScaleBand } from "d3"
import { binnedData } from "./types"
import { orientationType, curveTypes } from "../../types"

const baseLineColor = "#2b2b22"
export function renderHistogramLine(
    canvas: Selection<SVGGElement, unknown, null, undefined>,
    labelScale: {
        binRanges: ScaleLinear<number, number>, binSorted: ScaleBand<string>,
        isSorted: boolean
    }, 
    valueScale: ScaleLinear<number, number>,
    renderData: binnedData[],
    width: number,
    orientation: orientationType = "vertical",
    lineProps: {
        showLine?: boolean, showDots?: boolean, curve?: curveTypes,
        lineStroke?: string, dotFill?: string 
    } = { showLine: false, showDots: true, curve: "linear", lineStroke: baseLineColor, dotFill: baseLineColor }
){
    const { binRanges, binSorted, isSorted } = labelScale
    const animDuration = 750
    const isMediumScreen = width > 576;
    const cx = (d: binnedData) => {
        const x0 = d.x0 as number
        const baseX1 = d.x1 as number
        const x1 = baseX1 === x0?x0 + 1:baseX1
        const binRangesBandwidth = binRanges(x1) - binRanges(x0) || 0
        return orientation === "vertical"?
            !isSorted?(binRanges(d.x0 as number) || 0) + (binRangesBandwidth/2):
                (binSorted(d.x0 + "-" + d.x1) || 0) + (binSorted.bandwidth()/2):
            valueScale(d.length)
    }
    
    const cy = (d: binnedData) => {
        return orientation === "vertical"?
            valueScale(d.length):
            (!isSorted?binRanges(d.x0 as number) || 0:
                binSorted(d.x0 + "-" + d.x1)) || 0
    }            

    const { showLine, showDots, curve, lineStroke, dotFill } = lineProps
    const dotsData = (showLine && showDots)?renderData:[]
    const radius = isMediumScreen?3:2
    const dots =  canvas
            .selectAll<SVGCircleElement, binnedData>(".dot")
            .data(dotsData, 
                (d) => d.x0 + "-" + d.x1)
            .join(
                enter=>enter.append("circle")
        .attr("class", `dot`)
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("fill", dotFill ?? baseLineColor)
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
    .attr("fill", dotFill ?? baseLineColor)
    
    const lineFn = line<binnedData>()
        .x(cx)
        .y(cy)

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
    
    const lineData = showLine?[renderData]:[]    
    const lines = canvas
        .selectAll<SVGPathElement, binnedData[]>("path.chartline")
        .data(lineData)
        .join(
            enter=>enter.append("path")
                .attr("class", "chartline")
                .attr("fill", "none")
                .attr("stroke", lineStroke ?? baseLineColor)
                .attr("stroke-width", 2)
                .style("stroke-opacity", 0.75)                    
                .style("pointer-events", "none"),
            undefined,
            exit=>exit.remove()
        )        
    
    lines
        .transition().duration(animDuration)
        .attr("d", (d) => lineFn(d))
        .attr("stroke", lineStroke ?? baseLineColor)
    
    lines.raise()
    
}