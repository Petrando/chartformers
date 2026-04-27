import React, {useState} from 'react';
import {select, scaleBand, scaleLinear, axisLeft, axisBottom, max, format, Bin, bin,
    thresholdFreedmanDiaconis, thresholdScott, thresholdSturges
} from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import styles from './global.module.css';
import barchartStyles from './barchart.module.css';
import { pointData, tooltipFormat, histogramDatum, histogramRow } from '../types';

type HistogramProps<T extends histogramDatum> = {
    data: histogramRow<T>;
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    orientation?: 'horizontal' | 'vertical';
    tooltipFormat?: tooltipFormat;
}

export function Histogram<T extends histogramDatum>({
        data, 
        color: {
            idx = 0,               // default idx
            type = 'fixed',        // default type
        } = { idx: 0, type: 'fixed' },
        orientation = 'vertical',
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:HistogramProps<T>) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;
                
    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)

    const color = {idx, type}
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        
        const margin = { 
            top: 20, 
            right: 30, 
            bottom: orientation==='vertical'?50:30, 
            left: orientation === 'vertical'?25:50
        };
                
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);
        
        const xAxisTextClass = !isMediumScreen?barchartStyles.rotatedAxisText:
                    barchartStyles.axisText;

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom
        
        const validData = data.data.filter(d => !isNaN(parseFloat(d[data.valueKey] as string)))
        const values: number[] = validData.map(d => parseFloat(d[data.valueKey] as string))
        const baseXPositiveMin = Math.min(...values)
        const xMin = baseXPositiveMin//baseXPositiveMin >= 0?0:baseXPositiveMin
        const xMax = Math.max(...values)
        const x = scaleLinear()
            .domain([xMin, xMax])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
            .range([0, graphWidth])
            .nice();        

        const histogramFn = bin<T, number>()
            .value((d: T) => d[data.valueKey] as number)
            .domain(x.domain() as [number, number])
            .thresholds(x.ticks(70));

        type binnedData = Bin<T, number>

        const bins:binnedData[] = histogramFn(data.data)        
            
        const xAxis = axisBottom(x)
            .ticks(10)
            .tickSizeOuter(0)

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0, ${graphHeight})`)
            .transition().duration(animDuration).call(xAxis)
            .selectAll("text")
            .attr("class", xAxisTextClass);

        const max = Math.max(...bins.map((bin) => bin?.length));
        const y = scaleLinear()
            .range([graphHeight, 0])
            .domain([0, max]);
        const yAxis = axisLeft(y).ticks(5, "s").tickSize(-graphWidth)

        canvas.select<SVGGElement>(".y-axis")
                .transition().duration(animDuration)
            .attr("transform", `translate(0, 0)`)
            .call(yAxis)

        const bars = canvas.selectAll<SVGRectElement, binnedData>("rect.bar")
            .data(bins, (d)=> d.x0 + "-" + d.x1)
            .join(
                enter=>enter.append("rect")
                    .attr("class", "bar")
                    .attr("x", function(d){ return x(d.x0 as number) || 0})
                    .attr("width", function(d){ return x(d.x1 as number) - x(d.x0 as number) || 0})
                    .style("fill", "#4ade80")
                    .style("stroke", "#394447")
                    .attr("y", y(0))
                    .attr("height", 0),                        
                undefined,
                exit=>exit                
                        .transition().duration(animDuration)
                    .attr("y", y(0))
                    .attr("height", 0)
                    .style("fill", "#a1a1aa")
                    .style("opacity", 0)
                    .remove()
            ) 
            .transition().duration(animDuration)
            //.style("fill", barFill)         
            .style("fill", function(d){
                const xPos = x(d.x0 as number) || 0
                return xPos < x(0)?"#f43f5e":"#0284c7"
            })           
            .attr("x", function(d){ return x(d.x0 as number) || 0})
            .attr("width", function(d){ return x(d.x1 as number) - x(d.x0 as number) || 0})
            .attr("y", function(d){ return y(d.length) || 0})
            .attr("height", function(d){ return graphHeight - y(d.length) || 0})
    }, [data, color, width, height, orientation, {prefix, suffix, formatType}]);
    
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
                        <g className={`${orientation === 'vertical'?styles["value-axis"]:""} y-axis`} />
                        <g className={`${orientation === 'horizontal'?styles["value-axis"]:""} x-axis`} />    
                    </g>                        
                </svg>                            
                <Tooltip />
            </div> 
        </div>
    );
}