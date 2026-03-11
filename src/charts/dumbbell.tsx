import React, {useState} from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, min, max, format} from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import styles from './global.module.css';
import { tooltipFormat, dumbbellDatum, numericKeys } from '../types';
import { useContainerSize } from '../hooks/useContainerSize';

type DumbbellProps<T> = {
    data: dumbbellDatum[];    
    tooltipFormat?: tooltipFormat;
}

export function DumbbellChart<T extends { label: string }>({
        data,         
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
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;

        const margin = { 
            top: 20, 
            right: 25, 
            bottom: 30, 
            left: 70
        };

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom

        const colors = {
            startColor: "#22c55e", endColor: "#6366f1" 
        }
              
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

        const tooltip = getTooltip(container as any)
            .style("opacity", 0); 
            
                

        const yScale = scaleBand()
            .domain(data.map(d => d.label))
            .rangeRound([0, graphHeight])
            //.paddingInner(isMediumScreen?0.4:0.25)
            .paddingOuter(0.1)        

        const yAxis = axisLeft(yScale).tickSizeOuter(0)
        
        const valueMinStart = min(data, d => d[numKeys[0]] as number) ?? 0
        const valueMaxStart = max(data, d => d[numKeys[0]] as number) ?? 0
        const valueMinEnd = min(data, d => d[numKeys[1]] as number) ?? 0
        const valueMaxEnd = max(data, d => d[numKeys[1]] as number) ?? 0

        const valueMin = Math.min(valueMinStart, valueMinEnd)
        const valueMax = Math.max(valueMaxStart, valueMaxEnd)        
        const xScale = scaleLinear()
            .domain([valueMin, valueMax])
            .rangeRound([0, graphWidth])
            .nice()            
        
        const xAxis = axisBottom(xScale)            
            .tickValues(xScale.domain())
            .scale(xScale)
            .ticks(5, "s").tickSize(-graphHeight)

        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr("transform", `translate(0, ${graphHeight})`)
            //.selectAll("text")
            //.attr("class", `${xAxisTextClass}`)

        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(0, 0)`)
            .transition().duration(animDuration).call(yAxis)
        
        const xPosStart = (d: dumbbellDatum) => xScale(d[numKeys[0]] as number)        

        const xPosEnd = (d: dumbbellDatum) => xScale(d[numKeys[1]] as number)

        const yPos = (d: dumbbellDatum) => (yScale(d.label) ?? 0) + (yScale.bandwidth()/2)

        const links = canvas.selectAll<SVGLineElement, dumbbellDatum>("line.link")
            .data(data, (d) => d.label)
            .join(
                enter=>enter.append("line")
                    .attr("class", "link")
                    .attr("stroke", "#9ca3af")
                    .attr("stroke-width", 4)
                    .attr("x1", xPosStart)
                    .attr("y1", yPos)
                    .attr("x2", xPosStart)
                    .attr("y2", yPos)
                        .transition().duration(animDuration)
                    .attr("x1", xPosStart)
                    .attr("y1", yPos)
                    .attr("x2", xPosEnd)
                    .attr("y2", yPos)
                    ,
                update=>update
                        .transition().duration(animDuration)
                    .attr("x1", xPosStart)
                    .attr("y1", yPos)
                    .attr("x2", xPosEnd)
                    .attr("y2", yPos),
                exit=>exit
                        .transition().duration(animDuration)                    
                    .style("opacity", 0)
                        .remove()
            )

        const r = isMediumScreen?7:10

        const startCircles = canvas.selectAll<SVGCircleElement, dumbbellDatum>("circle.start")
            .data(data, (d) => d.label + "-start")
            .join(
                enter=>enter.append("circle")
                    .attr("class", "start")
                    .attr("fill", colors.startColor)
                    .attr("cx", xPosStart)
                    .attr("cy", yPos)
                        .transition().duration(animDuration)
                    .attr("cx", xPosStart)
                    .attr("cy", yPos)
                    .attr("r", r),
                update=>update
                        .transition().duration(animDuration)
                    .attr("cx", xPosStart)
                    .attr("cy", yPos)
                    .attr("r", r),
                exit=>exit
                        .transition().duration(animDuration)
                    .style("opacity", 0)
                    .remove()
            )

        const endCircles = canvas.selectAll<SVGCircleElement, dumbbellDatum>("circle.end")
            .data(data, (d) => d.label + "-end")
            .join(
                enter=>enter.append("circle")
                    .attr("class", "end")
                    .attr("fill", colors.endColor)
                    .attr("cx", xPosStart)
                    .attr("cy", yPos)
                        .transition().duration(animDuration)
                    .attr("cx", xPosEnd)
                    .attr("cy", yPos)
                    .attr("r", r),
                update=>update
                        .transition().duration(animDuration)
                    .attr("cx", xPosEnd)
                    .attr("cy", yPos)
                    .attr("r", r),
                exit=>exit
                        .transition().duration(animDuration)                    
                    .style("opacity", 0)
                    .remove()
            )
            
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
        
    }, [data, width, height,  {prefix, suffix, formatType}]);
    
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
                            <g className={`y-axis`} />
                            <g className={`${styles["value-axis"]} x-axis`} />    
                        </g>                        
                    </svg>                                
                    <Tooltip />
                </div>         
            </div> 
        </div>
    );
}