import React, { useEffect, useState, useRef } from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, format,     
    color
} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { useContainerSize } from '../../hooks/useContainerSize';
import { formatWaterfallData, colors } from './utils';
import { formatTooltipNum, renderLineChart, rotateLabels } from '../../utils';
import styles from '../global.module.css';
import waterfallStyles from './waterfall.module.css'
import { tooltipFormat, pointData, lineDecor } from '../../types';
import { waterfallDatum } from './types'

type WaterfallProps = {
    data: waterfallDatum[];    
    tooltipFormat?: tooltipFormat;
    orientation?: "vertical" | "horizontal";
    lineProps?: lineDecor;
}

export function WaterfallChart({
        data,        
        orientation = "vertical", 
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"},
        lineProps: {
            showLine = false, showDots = true, curve = "linear"
        } = {
            showLine: false, showDots: true, curve: "linear"
        }
    }:WaterfallProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize

    type modeType = "waterfall" | "inflows" | "outflows";
    const [ mode, setMode ] = useState<modeType>("waterfall")        
    const [ isSorted, setIsSorted ] = useState(false)
    const changeBy = useRef("data")
    const isFirstRender = useRef(true);
    const canLegendHover = useRef(true)

    useEffect(() => {
        if(mode === "waterfall"){
            setIsSorted(false)
        }
        if(isFirstRender.current){
            isFirstRender.current = false
        }else{            
            changeBy.current = "mode"            
        }   
        canLegendHover.current = false     
    }, [ mode ])

    useEffect(()=>{
        setMode("waterfall")
        changeBy.current = "data"
        canLegendHover.current = false
    }, [ data ])    

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)    
    
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;

        const margin = { 
            top: 20, 
            right: 25, 
            bottom: 50, 
            left: 25
        };
        
        const formattedData = formatWaterfallData(data)
                
        const renderData = mode === "waterfall"?formattedData:
            formattedData.filter(d =>  d.type === "variation" && 
                (mode === "inflows"?d.start! <= d.end!:d.start > d.end))
                    .sort((a, b) => isSorted?(Math.abs(b.value) - Math.abs(a.value)):0)
        
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")

        const legendWidth = isMediumScreen?80:50        

        const legendClass = function(d:string){            
            const containerClass = styles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = styles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]            
            return  `
                ${containerClass}
                ${(mode !== "waterfall" && mode === d)?containerActiveClass:""}
                legend-item
            `            
        }

        const legends = legendsContainer.selectAll<HTMLDivElement, modeType>(".legend-item")
            .data(["inflows", "outflows"], d=>d)
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
                            return d === "inflows"?colors.inflows:colors.outflows
                        })
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
                            return d === "inflows"?colors.inflows:colors.outflows
                        });

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`.${styles["legend-label"]}`)
                        .style("color", (d)=>{                            
                            return "#333"
                        })
                        .text(d => d);                            

                    return update;
                },
                exit => exit                    
                    .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("top", "53px")
                    .remove()
            )
            .on("mouseover", function(_, d){
                if( mode !== "waterfall" ) return
                if( !canLegendHover.current ) return
                canvas.selectAll<SVGRectElement, waterfallDatum>("rect.bar")
                    .filter(dRect => {
                        if(d === "inflows"){
                            return dRect.type === "total" || dRect.start! > dRect.end!
                        }
                        return dRect.type === "total" || dRect.start! <= dRect.end!
                    })
                    .style("opacity", 0.5)

                canvas
                    .selectAll<SVGTextElement, waterfallDatum>(".label")
                    .filter(dRect => {
                        if(d === "inflows"){
                            return dRect.type === "total" || dRect.start! > dRect.end!
                        }
                        return dRect.type === "total" || dRect.start! < dRect.end!
                    })
                    .style("opacity", 0.25)
            })
            .on("mouseout", function(_, d){
                if( mode !== "waterfall" ) return
                if( !canLegendHover.current ) return
                canvas.selectAll<SVGRectElement, waterfallDatum>(".bar")
                    .style("opacity", 1)

                canvas
                    .selectAll<SVGTextElement, waterfallDatum>(".label")
                    .style("opacity", textOpacity)
            })
            .on("click", function(_, d){
                if(mode === d){
                    setMode("waterfall")
                }
                else{
                    setMode(d as modeType)
                }
            })

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);        

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom

        const mins = renderData.map((d, i) => {
            const isLastData = i === renderData.length - 1
            return Math.min(d.start, !isLastData?d.end:d.value)
        })
        const maxes = renderData.map((d, i) => {
            const isLastData = i === renderData.length - 1
            return Math.max(d.start, !isLastData?d.end:d.value)
        })
        const valueMin = mode === "waterfall"?Math.min(...mins):0
        const valueMax = mode === "waterfall"?Math.max(...maxes):
            Math.max(...renderData.map(d => Math.abs(d.value)))

        const yScale = scaleLinear()
            .domain([valueMin, valueMax])
            .rangeRound([graphHeight, 0])
            .nice()        

        const yAxis = axisLeft(yScale).ticks(5, "s").tickSize(-graphWidth)

        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(0, 0)`)
            .transition().duration(animDuration).call(yAxis)

        const xDomain = renderData.map(d => d.label)
        const xScale = scaleBand()
            .domain(xDomain)
            .rangeRound([0, graphWidth])
            .paddingInner(isMediumScreen?0.4:0.25)
            .paddingOuter(0.1)            

        const xAxis = axisBottom(xScale)            
            .tickValues(xScale.domain())
            .scale(xScale)
            .tickSizeOuter(0)

        const rotateXLabels = rotateLabels(width, xDomain)
        const xAxisTextClass = rotateXLabels?`${styles.rotatedAxisText} ${waterfallStyles["axis-label-sm"]}`:
                    `${styles.axisText} ${waterfallStyles["axis-label"]}`;
        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr("transform", `translate(0, ${graphHeight})`)
            .selectAll("text")
            .attr("class", `${xAxisTextClass}`)           
            
        canvas.select<SVGGElement>(".x-axis") 
            .selectAll("path")
            .style("display", "none")

         const zeroLine = canvas.select("line.zero-line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", graphWidth).attr("y2", 0)
                .transition().duration(animDuration)
            .attr("transform", `translate(0, ${yScale(0) || 0})`)

        function xPos(d: waterfallDatum){
            const xPosition = xScale(d.label as string) ?? 0        
            return xPosition
        }

        function yPos(d: waterfallDatum, i: number){
            if(mode === "waterfall"){
                if(d.type === "total" && i > 0){
                    if(d.start! <= d.end!){
                        return yScale(d.value)
                    }else{
                        return yScale(0)
                    }                                
                }
                return yScale( Math.max(d.start!, d.end!));
            }
            return yScale(Math.abs(d.value))            
                        
        }

        function rectHeight(d: waterfallDatum, i: number){            
            if(mode === "waterfall"){
                const barHeight = Math.abs( yScale(d.start!) - yScale(d.end!) )                
                if(d.type === "total" && i > 0){
                    if(d.start! <= d.end!){
                        const baseBarHeight = yScale(0) - yScale(d.value)
                        return baseBarHeight < 0?barHeight:baseBarHeight
                    }else{
                        return yScale(0) - yScale(-d.value)
                    }
                    
                }            
                return barHeight;
            }

            return yScale(0) - yScale(Math.abs(d.value))
                        
        }

        function rectFill(d: waterfallDatum){
            if(d.start! <= d.end!){
                return colors.inflows
            }else {
                return colors.outflows
            }
        }

        const barAnimDuration = 300
        
        const bars =  canvas
            .selectAll<SVGRectElement, waterfallDatum>(".bar")
            .data(renderData, (d) => d.label)
            .join(
                enter=>enter.append("rect")
                    .attr("class", `bar ${styles.bar}`)
                    .attr("x", xPos)
                    .attr("width", xScale.bandwidth())
                    .attr("y", (d, i)=> changeBy.current === "data" ?
                        (d.type === "total"?yScale(0):yScale(d.start)):
                        yScale(0)
                    )                    
                    .attr("height", 0)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .style("fill", rectFill)
                        .transition().duration(barAnimDuration)
                        .delay((_, i)=> {
                            return 0//changeBy.current === "data"?((i + 1) * barAnimDuration):0
                        })
                    .attr("y", yPos)
                    .attr("height", rectHeight)
                    .on("end", function(_, i){                        
                        if(changeBy.current === "data" && mode === "waterfall"){
                            if(i === formattedData.length - 1){
                                canLegendHover.current = true
                            }                            
                        }else{
                            canLegendHover.current = true
                        }
                    }),
                update=>{                                        
                    if(mode === "waterfall" && changeBy.current === "data"){
                        update.transition().duration(animDuration)
                            .style("fill", rectFill)
                            .attr("x", xPos)
                            .attr("width", xScale.bandwidth())
                            .attr("y", (d)=> {                      
                                return d.type === "total"?yScale(0):yScale(d.start)
                            })
                            .attr("height", 0)
                            .attr("rx", 5)
                            .attr("ry", 5)
                        .transition().duration(animDuration)
                        //.delay((d, i)=> 0(i + 1) * barAnimDuration)            
                            .attr("y", yPos)
                            .attr("height", rectHeight)
                        .on("end", function(_, i){
                            if(changeBy.current === "data" && mode === "waterfall"){
                            if(i === formattedData.length - 1){
                                    canLegendHover.current = true
                                }                            
                            }else{
                                canLegendHover.current = true
                            }
                        })
                    }else{
                        update.transition().duration(animDuration)
                            .style("fill", rectFill)
                            .attr("x", xPos)
                            .attr("width", xScale.bandwidth())
                            .attr("y", yPos)
                            .attr("height", rectHeight)
                            .on("end", function(_, i){
                                canLegendHover.current = true                                
                            })
                    }

                    return update
                },
                exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
            )
        
        const tooltipFormat = { formatType, prefix, suffix}
        bars    
            .on("pointerenter", function(e, d){           
                //U+25B2 / U+25BC     "▲" + 
                tooltip.select("p.label span.label span.chev")
                    .style("color", d.value >= 0?colors.inflows:colors.outflows)
                    .text(
                        d.value > 0?"▲":
                        d.value < 0?"▼":
                        ""
                    )
                tooltip.select("p.label span.label span.text").text(d.label + " :")                
                tooltip.select("p.label span.value").text(formatTooltipNum(d.value, tooltipFormat))
                if(d.type === "total"){                    
                    tooltip.select("p.from").style("display", "none")
                    tooltip.select("p.to").style("display", "none")
                }else{                    
                    
                    if(mode === "waterfall"){
                        tooltip.select("p.from").style("display", "flex")
                        tooltip.select("p.from span.label").text("from: ")
                        tooltip.select("p.from span.value")
                            .text(formatTooltipNum(d.start, tooltipFormat))

                        tooltip.select("p.to").style("display", "flex")
                        tooltip.select("p.to span.label").text("to: ")
                        tooltip.select("p.to span.value")
                            .text(formatTooltipNum(d.end, tooltipFormat))
                    }else{
                        tooltip.select("p.from").style("display", "none")
                        tooltip.select("p.to").style("display", "none")
                    }                    
                }
                tooltip.style("opacity", 1)
            })
            .on("pointermove", function(e, d){
                moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
            })
            .on("pointerleave", function(e, d){
                tooltip.style("opacity", 0)
            })                                

        const labelSize = 12

        function textYPos(d: waterfallDatum, i: number){
            const yPosition = yPos(d, i)
            const textPadding = 12
            /*if(d.start! <= d.end!){
                return yPosition - textPadding
            }else{
                const height = rectHeight(d, i)
                return (yPosition + height) + textPadding
            }*/                
            const height = rectHeight(d, i)
            return yPosition + (height/2) + (labelSize/2)
        }

        function textXPos(d: waterfallDatum, i: number){
            const baseXPosition = xPos(d)
            const barWidth = xScale.bandwidth()

            return baseXPosition + ( barWidth / 2 )
        }

        function textOpacity(d: waterfallDatum, i: number){
            const height = rectHeight(d, i)
            return height < 20?0:1
        }

        const labels =  canvas
            .selectAll<SVGTextElement, waterfallDatum>(".label")
            .data(renderData, (d) => d.label)
            .join(
                enter=>enter.append("text")
                    .attr("class", `label ${waterfallStyles["label"]}`)
                    .text(d => format("~s")
                        (mode !== "waterfall"?Math.abs(d.value):d.value))
                    .attr("text-anchor", "middle")
                    .style("font-size", labelSize)                    
                    .style("font-weight", "bold")
                    .style("pointer-events", "none")
                    .style("opacity", 0)                    
                    .attr("x", textXPos)
                    .attr("y", textYPos)
                    .transition()
                    .duration(animDuration)
                    //.delay((d, i)=> ((i + 1) * barAnimDuration) + barAnimDuration)
                    .style("opacity", textOpacity)
                    .attr("x", textXPos)
                    .attr("y", textYPos)
                    ,
                update=>update
                        .attr("class", `label ${waterfallStyles["label"]}`)
                        .text(d => format("~s")
                            (mode !== "waterfall"?Math.abs(d.value):d.value))
                        .attr("text-anchor", "middle")
                        .style("font-size", labelSize)                    
                        .style("font-weight", "bold")
                    .transition().duration(animDuration)//.delay((d, i)=> (i + 1) * barAnimDuration)
                        .style("opacity", textOpacity)
                        .attr("x", textXPos)
                        .attr("y", textYPos), 
                exit=>exit
                    .transition().duration(animDuration)
                        .style("opacity", 0)
                    .remove()
            )
                    
        const baseLineData:pointData[] = renderData
            .map((d, i) => ({
                label: d.label, 
                value: 
                    mode !== "waterfall"?Math.abs(d.value):
                    i !== renderData.length - 1?d.end:d.value
            }))
                    
        const waterfallLineColor = mode === "waterfall"?"#2b2b22":
            colors[mode]

        renderLineChart(
            canvas, {scale:xScale, offset:xScale.bandwidth()/2}, yScale, {data:baseLineData}, width, orientation, 
            { 
                showLine, showDots, curve,
                lineStroke: String(color(waterfallLineColor)?.darker()), 
                dotFill: waterfallLineColor
            })        
        
        labels.raise()                  
        
    }, [data, width, height, orientation, mode, { showLine, showDots, curve}, isSorted, {prefix, suffix, formatType}]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column' }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column" }}>
                <div                     
                    className={`controls ${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                >          
                    <label 
                        className={`
                            ${styles["controls-label"]} 
                            ${waterfallStyles.sort} 
                            ${mode!=="waterfall"?waterfallStyles.visible:""}
                        `} 
                        style={{paddingRight: '12px'}}
                    >
                        <input 
                            type="checkbox" 
                            className={styles["controls-checkbox"]} 
                            checked={isSorted}
                            onChange={(e) => setIsSorted(e.target.checked)}
                        />
                            Sort
                    </label>          
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
                        style={{}}
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        <g className="plot-area">
                            <g className={`${styles["value-axis"]} y-axis`} />
                            <g className={`${waterfallStyles["x-axis"]} x-axis`} />
                            <line className='zero-line' stroke="currentColor" strokeWidth={1} />         
                        </g>                        
                    </svg>            
                
                    <Tooltip>
                        <p className='label' 
                            style={{
                                fontWeight: 700, margin: "3px", fontSize: "13px", color: "wheat", 
                                display:"flex",
                            }}
                        >

                            <span className='label' style={{ flex: 1, textAlign:"left", whiteSpace: 'nowrap' }}>
                                <span className='chev' />
                                <span className='text' />
                            </span>
                            <span className='value' style={{ flex: 1, textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
                        </p>
                        <p className='from' 
                            style={{
                                fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                                display: "flex", justifyContent: "flex-end"
                        }}>
                            <span className='label' style={{ width: "auto", textAlign:"right", whiteSpace: 'nowrap' }} />
                            <span className='value' style={{ width: "auto", textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
                        </p>
                        <p className='to' 
                            style={{
                                fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                                display: "flex", justifyContent: "flex-end"
                        }}>                        
                            <span className='label' style={{ width: "auto", textAlign:"right", whiteSpace: 'nowrap' }} />
                            <span className='value' style={{ width: "auto", textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
                        </p>                        
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}