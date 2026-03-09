import React, {useState} from 'react';
import { createPortal } from "react-dom";
import {select, scaleBand, scaleLinear, axisLeft, axisBottom, max, format, selectAll} from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import styles from './global.module.css';
import waterfallStyles from './waterfall.module.css'
import barchartStyles from './barchart.module.css';
import { tooltipFormat, waterfallData } from '../types';

type WaterfallProps = {
    data: waterfallData[];    
    tooltipFormat?: tooltipFormat;
}

export function WaterfallChart({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:WaterfallProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;        

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
        
        let start = 0, end = 0, prevEnd = end

        const formattedData = data.map((d, i)=> {
            start = prevEnd
            end = start + d.value              
            prevEnd = end

            return { ...d, start, end }
        })        

        console.log(formattedData)
        
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);        

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom

        const mins = formattedData.map((d, i) => {
            const isLastData = i === formattedData.length - 1
            return Math.min(d.start, !isLastData?d.end:d.value)
        })
        const maxes = formattedData.map((d, i) => {
            const isLastData = i === formattedData.length - 1
            return Math.max(d.start, !isLastData?d.end:d.value)
        })
        const valueMin = Math.min(...mins)
        const valueMax = Math.max(...maxes)

        const yScale = scaleLinear()
            .domain([valueMin, valueMax])
            .rangeRound([graphHeight, 0])
            .nice()        

        const yAxis = axisLeft(yScale).ticks(5, "s").tickSize(-graphWidth)

        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(0, 0)`)
            .transition().duration(animDuration).call(yAxis)

        const xScale = scaleBand()
            .domain(formattedData.map(d => d.label))
            .rangeRound([0, graphWidth])
            .paddingInner(isMediumScreen?0.4:0.25)
            .paddingOuter(0.1)            

        const xAxis = axisBottom(xScale)            
            .tickValues(xScale.domain())
            .scale(xScale)
            .tickSizeOuter(0)

        const xAxisTextClass = !isMediumScreen?`${barchartStyles.rotatedAxisText} ${waterfallStyles["axis-label-sm"]}`:
                    `${barchartStyles.axisText} ${waterfallStyles["axis-label"]}`;
        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr("transform", `translate(0, ${yScale(0)})`)
            .selectAll("text")
            .attr("class", `${xAxisTextClass}`)                        

        function xPos(d: waterfallData){
            const xPosition = xScale(d.label as string) ?? 0        
            return xPosition
        }

        function yPos(d: waterfallData, i: number){            
            if(d.type === "total" && i > 0){
                if(d.start! <= d.end!){
                    return yScale(d.value)
                }else{
                    return yScale(0)
                }                                
            }
            return yScale( Math.max(d.start!, d.end!));            
        }

        function rectHeight(d: waterfallData, i: number){            
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

        function rectFill(d: waterfallData){
            if(d.start! <= d.end!){
                return "#22c55e"
            }else {
                return "#ef4444"
            }
        }

        const barAnimDuration = 300

        const bars =  canvas
            .selectAll<SVGRectElement, waterfallData>(".bar")
            .data(formattedData, (d) => d.label)
            .join(
                enter=>enter.append("rect")
                    .attr("class", "bar")
                    .attr("x", xPos)
                    .attr("width", xScale.bandwidth())
                    .attr("y", (d)=> d.type === "total"?yScale(0):yScale(d.start))                    
                    .attr("height", 0)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .style("fill", rectFill)
                        .transition().duration(barAnimDuration).delay((d, i)=> (i + 1) * barAnimDuration)
                    .attr("y", yPos)
                    .attr("height", rectHeight),
                undefined,
                exit=>exit.remove()
            )            
            
        bars.transition().duration(barAnimDuration)
                .style("fill", rectFill)
                .attr("x", xPos)
                .attr("width", xScale.bandwidth())
                .attr("y", (d)=> d.type === "total"?yScale(0):yScale(d.start))
                .attr("height", 0)
                .attr("rx", 5)
                .attr("ry", 5)
            .transition().duration(barAnimDuration).delay((d, i)=> (i + 1) * barAnimDuration)            
                .attr("y", yPos)
                .attr("height", rectHeight)

        const labelSize = 12

        function textYPos(d: waterfallData, i: number){
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

        function textXPos(d: waterfallData, i: number){
            const baseXPosition = xPos(d)
            const barWidth = xScale.bandwidth()

            return baseXPosition + ( barWidth / 2 )
        }

        const labels =  canvas
            .selectAll<SVGTextElement, waterfallData>(".label")
            .data(formattedData, (d) => d.label)
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
        /*const formattedData1 = data.reduce((acc: waterfallData[], item:waterfallData) => {
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
        
    }, [data, width, height,  {prefix, suffix, formatType}]);
    
    return (
        <div 
            ref={ref} 
            style={{ width, height, display:'flex', flexDirection:'column' }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column", position: "relative",}}>         
                <svg                
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}
                    style={{}}
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <g className="plot-area">
                        <g className={`${barchartStyles["value-axis"]} y-axis`} />
                        <g className={`${waterfallStyles["x-axis"]} x-axis`} />    
                    </g>                        
                </svg>            
                
                <Tooltip />
            </div> 
        </div>
    );
}