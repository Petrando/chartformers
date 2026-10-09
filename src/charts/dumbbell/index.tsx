import React from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, min, max, format} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { Tooltip, moveTooltip } from '../../components/tooltip';
import styles from '../global.module.css';
import { tooltipFormat } from '../../types';
import { dumbbellDatum } from './types'
import { formatTooltipNum } from '../../utils';

type DumbbellProps<T> = {
    data: dumbbellDatum[];
    title?: string;    
    tooltipFormat?: tooltipFormat;
    orientation?: 'vertical' | 'horizontal';
}

export function DumbbellChart<T extends { label: string }>({
        data,
        title = "",         
        orientation= 'horizontal',
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:DumbbellProps<T>) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize        

    const isMediumScreen = parentWidth > 576;
    // Define the controls element (checkbox)    
        
    const animDuration = 750;

    const colors = {
            startColor: "#22c55e", endColor: "#6366f1" 
        }
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;

        const margin = { 
            top: 20, 
            right: 25, 
            bottom: 25, 
            left: 70
        };

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom        
              
        const numKeys = Object.keys(data[0]).filter(key => key !== "label")

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")

        const legendWidth = isMediumScreen?80:50

        const legendClass = function(d:string){
            const containerClass = styles[isMediumScreen?"legend-container":"legend-container-sm"]            
            return  `${containerClass} legend-item`            
        }

        const legends = legendsContainer.selectAll<HTMLDivElement, string>(".legend-item")
            .data([...numKeys], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", legendClass)
                        .style("left", (_, i)=> `${i * legendWidth}px`)
                        .style("top", "-53px")
                        .style("opacity", 0)
                                                                                                                           
                    divs.append("div")
                        .attr("class", styles["legend-rect"])
                        .style("background", (d) => {
                            const idx = numKeys.indexOf(d);
                            return idx === 0?colors.startColor:colors.endColor
                        })
                        .style("border-radius", "50%")
                    divs.append("span")
                        .attr("class", styles["legend-label"])
                        .style("color", (d)=>{                            
                            return "#333"
                        })
                        .text(d=>d)
                                                                                              
                    divs.transition().duration(animDuration)                                                        
                        .style("top", "0px")                              
                        .style("opacity", 1)
                    return divs;
                },
                update => {
                    update                        
                        .attr("class", legendClass)
                            .transition().duration(animDuration)
                        .style("top", "0px")
                        .style("left", (_, i)=> `${i * legendWidth}px`) 
                        .style("opacity", 1)                      
                        .select(`.${styles["legend-rect"]}`)
                        .style("background", (d) => {
                            const idx = numKeys.indexOf(d);
                            return idx === 0?colors.startColor:colors.endColor
                        })
                        .style("border-radius", "50%");

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`.${styles["legend-label"]}`)                        
                        .text(d => d);                            

                    return update;
                },
                exit => exit             
                        .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("top", "53px")
                    .remove()
            )

        const tooltip = container.select("div#tooltip")
            .style("opacity", 0);                     
                            
        const labelScale = scaleBand()
            .domain(data.map(d => d.label))
            .rangeRound([0, orientation === 'horizontal'?graphHeight:graphWidth])
            //.paddingInner(isMediumScreen?0.4:0.25)
            .paddingOuter(0.1)                
        
        const valueMinStart = min(data, d => d[numKeys[0]] as number) ?? 0
        const valueMaxStart = max(data, d => d[numKeys[0]] as number) ?? 0
        const valueMinEnd = min(data, d => d[numKeys[1]] as number) ?? 0
        const valueMaxEnd = max(data, d => d[numKeys[1]] as number) ?? 0

        const valueMin = Math.min(valueMinStart, valueMinEnd)
        const valueMax = Math.max(valueMaxStart, valueMaxEnd)        
        const valueScale = scaleLinear()
            .domain([valueMin, valueMax])
            .rangeRound(orientation === 'horizontal'?[0, graphWidth]:[graphHeight, 0])
            .nice()

        const yAxis = orientation === 'horizontal'?axisLeft(labelScale).tickSizeOuter(0):
            axisLeft(valueScale)                        
                .scale(valueScale)
                .ticks(10, "s").tickSize(-graphWidth)

        const xAxis = orientation === 'horizontal'?
            axisBottom(valueScale)                        
                .scale(valueScale)
                .ticks(10, "s").tickSize(-graphHeight):
            axisBottom(labelScale).tickSizeOuter(0)

        const fromNegativeToPositive = valueMin < 0 && valueMax > 0

        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr(
                    "transform", 
                    `translate(0, ${graphHeight})`
            )
            //.selectAll("text")
            //.attr("class", `${xAxisTextClass}`)
        /*
        ${(orientation === 'vertical' && fromNegativeToPositive)?
                        valueScale(0):
        */ 
        
        canvas.select<SVGGElement>(".y-axis")            
            .transition().duration(animDuration).call(yAxis)
            /*.attr(
                "transform", 
                `translate(${(orientation === 'horizontal' && fromNegativeToPositive)?
                    valueScale(0):"0"}, 0)`
            )*/

        const zeroLine = canvas.select("line.zero-line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", orientation === "vertical"?graphWidth:0)
            .attr("y2", orientation === "vertical"?0:graphHeight)            

        zeroLine.transition().duration(animDuration)
            .attr("transform", 
                orientation === "vertical"?
                `translate(0, ${valueScale(0) || 0})`:
                `translate(${valueScale(0) || 0}, 0)`
            )
           
        const valuePosStart = (d: dumbbellDatum) => valueScale(d[numKeys[0]] as number)        

        const valuePosEnd = (d: dumbbellDatum) => valueScale(d[numKeys[1]] as number)

        const labelPos = (d: dumbbellDatum) => (labelScale(d.label) ?? 0) + (labelScale.bandwidth()/2)

        const xPosStart = (d: dumbbellDatum) => orientation === 'horizontal'?valuePosStart(d):labelPos(d)
        const yPosStart = (d: dumbbellDatum) => orientation === 'horizontal'?labelPos(d):valuePosStart(d)

        const xPosEnd = (d: dumbbellDatum) => orientation === 'horizontal'?valuePosEnd(d):labelPos(d)
        const yPosEnd = (d: dumbbellDatum) => orientation === 'horizontal'?labelPos(d):valuePosEnd(d)
        
        const links = canvas.selectAll<SVGLineElement, dumbbellDatum>("line.link")
            .data(data, (d) => d.label)
            .join(
                enter=>enter.append("line")
                    .attr("class", "link")
                    .attr("stroke", "#9ca3af")
                    .attr("stroke-width", 2.5)
                    .attr("x1", xPosStart)
                    .attr("y1", yPosStart)
                    .attr("x2", xPosStart)
                    .attr("y2", yPosStart)
                        .transition().duration(animDuration)
                    .attr("x1", xPosStart)
                    .attr("y1", yPosStart)
                    .attr("x2", xPosEnd)
                    .attr("y2", yPosEnd)
                    ,
                update=>update
                        .transition().duration(animDuration)
                    .attr("x1", xPosStart)
                    .attr("y1", yPosStart)
                    .attr("x2", xPosEnd)
                    .attr("y2", yPosEnd),
                exit=>exit
                        .transition().duration(animDuration)                    
                    .style("opacity", 0)
                        .remove()
            )
        .on("pointerenter", pointerEnter)
        .on("pointermove", pointerMove)
        .on("pointerleave", pointerLeave)
                        
        const r = isMediumScreen?7:4

        const startCircles = canvas.selectAll<SVGCircleElement, dumbbellDatum>("circle.start")
            .data(data, (d) => d.label + "-start")
            .join(
                enter=>enter.append("circle")
                    .attr("class", "start")
                    .attr("fill", colors.startColor)
                    .attr("cx", xPosStart)
                    .attr("cy", yPosStart)
                        .transition().duration(animDuration)
                    .attr("cx", xPosStart)
                    .attr("cy", yPosStart)
                    .attr("r", r),
                update=>update
                        .transition().duration(animDuration)
                    .attr("cx", xPosStart)
                    .attr("cy", yPosStart)
                    .attr("r", r),
                exit=>exit
                        .transition().duration(animDuration)
                    .style("opacity", 0)
                    .remove()
            )
        .on("pointerenter", pointerEnter)
        .on("pointermove", pointerMove)
        .on("pointerleave", pointerLeave)

        const endCircles = canvas.selectAll<SVGCircleElement, dumbbellDatum>("circle.end")
            .data(data, (d) => d.label + "-end")
            .join(
                enter=>enter.append("circle")
                    .attr("class", "end")
                    .attr("fill", colors.endColor)
                    .attr("cx", xPosStart)
                    .attr("cy", yPosStart)
                        .transition().duration(animDuration)
                    .attr("cx", xPosEnd)
                    .attr("cy", yPosEnd)
                    .attr("r", r),
                update=>update
                        .transition().duration(animDuration)
                    .attr("cx", xPosEnd)
                    .attr("cy", yPosEnd)
                    .attr("r", r),
                exit=>exit
                        .transition().duration(animDuration)                    
                    .style("opacity", 0)
                    .remove()
            )
        .on("pointerenter", pointerEnter)
        .on("pointermove", pointerMove)
        .on("pointerleave", pointerLeave)
            
        const tooltipFormat = { prefix, suffix, formatType }
        function pointerEnter(e: MouseEvent, d: dumbbellDatum){            
            const startValue = d[numKeys[0]] as number
            const endValue = d[numKeys[1]] as number
            tooltip.style("opacity", 1)
            tooltip.select("p.label").text(d.label)
            tooltip.select("p.change span.from span.value")
                .text(formatTooltipNum(startValue, tooltipFormat))            
            tooltip.select("p.change span.to span.value")
                .text(formatTooltipNum(endValue, tooltipFormat))

            const finalValue = endValue - startValue
            tooltip.select("p.total span.label span.text")
                .text(formatTooltipNum(finalValue, tooltipFormat))
            tooltip.select("p.total span.label span.chev")
                .style("color", finalValue >= 0?"#22c55e":"#ef4444")
                .text(
                    finalValue > 0?"▲":
                    finalValue < 0?"▼":
                    ""
                )

            moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: valueScale})
        }

        function pointerMove(e: MouseEvent, d: dumbbellDatum){
            moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: valueScale})
        }

        function pointerLeave(e: MouseEvent, d: dumbbellDatum){
            tooltip.style("opacity", 0)
        }     
        
       //canvas.select<SVGGElement>(".x-axis").raise()
       //canvas.select<SVGGElement>(".y-axis").raise()
        /*
        const numericKeys = Object.keys(data[0]).filter(
            k => typeof data[0][k as keyof T] === "number"
        ) as numericKeys<T>[]

        const [valueAKey, valueBKey] = numericKeys

        data.forEach(d => {
            const label = d.label
            const a = d[valueAKey]
            const b = d[valueBKey]

            console.log(label, a, b)
        })*/
        
    }, [data, title, width, height, orientation,  {prefix, suffix, formatType}]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column' }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column", position: "relative",}}>
                <div                     
                    className={`controls ${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                >     
                    <p 
                        className='title'
                        style={{whiteSpace: "nowrap", paddingBottom: 22, color: "#333"}}
                    >
                        {title}
                    </p>               
                    <div                         
                        className={`legends-container ${styles["legends-container"]}`}
                    />
                </div>
                <div 
                    ref={chartContainerRef}
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column" }}>
                    <svg                
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        <g className="plot-area">
                            <g className={`${orientation === "vertical"?styles["value-axis"]:''} y-axis`} />
                            <g className={`${orientation === "horizontal"?styles["value-axis"]:''} x-axis`} />    
                            <line className='zero-line' stroke="currentColor" strokeWidth={1} />
                        </g>                        
                    </svg>                                
                    <Tooltip>
                        <p className='label' 
                            style={{
                                margin: "3px", marginBottom: 0, fontSize: "11px", color: "wheat", textAlign: "center"                                
                            }}
                        />
                        <p className='title' 
                            style={{
                                fontWeight: 600, margin: "3px", marginBottom: 0,  fontSize: "12px", 
                                color: "wheat", 
                            }}
                        >
                            {title}{" "}change:
                        </p>
                        <p className='change' 
                            style={{
                                fontWeight: 700, margin: "3px",  fontSize: "13px", 
                                color: "wheat", display: "flex", alignItems: "center", justifyContent: "center",
                                gap: 2.5
                            }}
                        >
                            <span 
                                className="from"
                                style={{display: "flex", alignItems: "center", gap: 2}}>
                                <span 
                                    className='marker' 
                                    style={{
                                        width: 10, height: 10, borderRadius: 5, 
                                        backgroundColor: colors.startColor
                                    }}
                                />
                                <span 
                                    className='value' 
                                />
                            </span>
                            {" "}to{" "}
                            <span 
                                className="to"
                                style={{display: "flex", alignItems: "center", gap: 2}}>
                                <span 
                                    className='value' 
                                />
                                <span 
                                    className='marker' 
                                    style={{
                                        width: 10, height: 10, borderRadius: 5,
                                        backgroundColor: colors.endColor,                                        
                                    }}
                                />
                                
                            </span>
                        </p>
                        <p className='total' 
                            style={{
                                fontWeight: 600, margin: "3px",  fontSize: "12px", 
                                color: "wheat", display: "flex", alignItems: "center", justifyContent: "center",
                                gap: 2, textAlign:"center"
                            }}
                        >
                            <span style={{flex: 1, textAlign: "right"}}>
                            Total:
                            </span>
                            <span className='label' style={{ flex: 1, textAlign:"left", whiteSpace: 'nowrap' }}>                                
                                <span className='text' />
                                <span className='chev' />
                            </span>
                        </p>
                    </Tooltip>
                </div>                        
            </div> 
        </div>
    );
}