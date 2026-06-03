import React, { useEffect, useState, useRef } from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, format} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import styles from '../global.module.css';
import waterfallStyles from './waterfall.module.css'
import { tooltipFormat, waterfallDatum } from '../../types';
import { useContainerSize } from '../../hooks/useContainerSize';
import { formatWaterfallData } from './utils';

type WaterfallProps = {
    data: waterfallDatum[];    
    tooltipFormat?: tooltipFormat;
}

export function WaterfallChart({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
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

        const colors = { inflows:"#22c55e", outflows: "#ef4444" }

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
                    .style("opacity", 1)
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

        const xAxisTextClass = !isMediumScreen?`${styles.rotatedAxisText} ${waterfallStyles["axis-label-sm"]}`:
                    `${styles.axisText} ${waterfallStyles["axis-label"]}`;
        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr("transform", `translate(0, ${yScale(0) || 0})`)
            .selectAll("text")
            .attr("class", `${xAxisTextClass}`)                        

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
                    .attr("class", "bar")
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
                            return changeBy.current === "data"?((i + 1) * barAnimDuration):0
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
                        update.transition().duration(barAnimDuration)
                            .style("fill", rectFill)
                            .attr("x", xPos)
                            .attr("width", xScale.bandwidth())
                            .attr("y", (d)=> {                      
                                return d.type === "total"?yScale(0):yScale(d.start)
                            })
                            .attr("height", 0)
                            .attr("rx", 5)
                            .attr("ry", 5)
                        .transition().duration(barAnimDuration).delay((d, i)=> (i + 1) * barAnimDuration)            
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

        const labels =  canvas
            .selectAll<SVGTextElement, waterfallDatum>(".label")
            .data(renderData, (d) => d.label)
            .join(
                enter=>enter.append("text")
                    .attr("class", `label ${waterfallStyles["label"]}`)
                    .text(d => format(formatType === "long"?",":"~s")(d.value))
                    .attr("text-anchor", "middle")
                    .style("font-size", labelSize)                    
                    .style("font-weight", "bold")
                    .style("opacity", 0)                    
                    .attr("x", textXPos)
                    .attr("y", textYPos)
                    .transition()
                    .duration(barAnimDuration)
                    .delay((d, i)=> ((i + 1) * barAnimDuration) + barAnimDuration)
                    .style("opacity", 1)
                    .attr("x", textXPos)
                    .attr("y", textYPos)
                    ,
                update=>update
                        .attr("class", `label ${waterfallStyles["label"]}`)
                    .text(d => format(formatType === "long"?",":"~s")(d.value))
                        .attr("text-anchor", "middle")
                        .style("font-size", labelSize)                    
                        .style("font-weight", "bold")
                    .transition().duration(barAnimDuration)//.delay((d, i)=> (i + 1) * barAnimDuration)
                        .style("opacity", 1)
                        .attr("x", textXPos)
                        .attr("y", textYPos), 
                exit=>exit
                    .transition().duration(barAnimDuration)
                        .style("opacity", 0)
                    .remove()
            )                   

        canvas.select<SVGGElement>(".x-axis").raise()  
        labels.raise()          
        /*const formattedData1 = data.reduce((acc: waterfallDatum[], item:waterfallDatum) => {
            // Determine the current running total from the previous entries
            const previousTotal = acc.length > 0 
                ? acc[acc.length - 1].previousTotal ?? 0 + acc[acc.length - 1].value 
                : 0;

            acc.push({
                ...item,
                previousTotal: previousTotal
            });

            return acc;
        }, []);

        console.log(formattedData1)*/
        
    }, [data, width, height, mode, isSorted, {prefix, suffix, formatType}]);
    
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
                        </g>                        
                    </svg>            
                
                <Tooltip />
                </div>
            </div>
        </div>
    );
}