import React, { useEffect, useState, useRef } from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, format, min, max} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import styles from '../global.module.css';
import waterfallStyles from './waterfall.module.css'
import { tooltipFormat, deltaWaterfallDatum } from '../../types';
import { useContainerSize } from '../../hooks/useContainerSize';
import { formatWaterfallData } from './utils';

type WaterfallProps = {
    data: deltaWaterfallDatum[];    
    tooltipFormat?: tooltipFormat;
}

type groupedBarData = {
    label: string;
    open: number;
    close: number;
}

type groupedBarRectData = {
    key: "open" | "close";
    value: number;
}

export function DeltaWaterfall({
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

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)    
    
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;

        const margin = { 
            top: 40, 
            right: 40, 
            bottom: 50, 
            left: 40
        };
        
        const formattedData = data.map(d => ({
            label: d.label, data: formatWaterfallData(d.data)
        }))
        const groupedBarData: groupedBarData[] = formattedData.map(d => ({
            label: d.label,
            open: d.data.find(dt => dt.label === "Opening")?.value ?? 0,
            close: d.data.find(dt => dt.label === "Closing")?.value ?? 0,
        }));
        type BarKey = "open" | "close";
        const keys: BarKey[] = ["open", "close"];

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom        

        const allValues = groupedBarData.flatMap(d =>
            keys.map(key => d[key] as number ?? 0)
        );

        const yMin = Math.min(0, min(allValues) ?? 0)
        const yMax = Math.max(0, max(allValues) ?? 0)
        const y = scaleLinear()
            .domain([ yMin, yMax ])
            .nice()
            .range([height - margin.bottom, margin.top]);

        const yAxis = axisLeft(y).ticks(5, "s").tickSize(-graphWidth)

        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(0, 0)`)
            .transition().duration(animDuration).call(yAxis)

        const xAxisTextClass = !isMediumScreen?`${styles.rotatedAxisText} ${waterfallStyles["axis-label-sm"]}`:
            `${styles.axisText} ${waterfallStyles["axis-label"]}`;

        const x0 = scaleBand()
            .domain(groupedBarData.map(d => d.label))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const xAxis = axisBottom(x0)            
            .tickValues(x0.domain())
            .scale(x0)
            .tickSizeOuter(0)        

        const x1 = scaleBand()
            .domain(keys)
            .range([0, x0.bandwidth()])
            .padding(0.05);
                      
        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr("transform", `translate(0, ${y(yMin) || 0})`)
            .selectAll("text")
            .attr("class", `${xAxisTextClass}`)

        canvas.select<SVGGElement>(".x-axis") 
            .selectAll("path")
            .style("display", "none")

        const zeroLine = canvas.select("line.zero-line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", graphWidth).attr("y2", 0)
                .transition().duration(animDuration)
            .attr("transform", `translate(0, ${y(0) || 0})`)

        canvas.selectAll<SVGRectElement, groupedBarData>("rect.open")
            .data(groupedBarData,
                (d) => d.label + " - open"
            )
            .join("rect")
            .attr("class", "open")
            .attr("x", d => (x0(d.label) ?? 0) + (x1("open") ?? 0))
            .attr("width", x1.bandwidth())
            .attr("y", d =>
                d.open >= 0
                    ? y(d.open)
                    : y(0)
            )
            .attr("height", d =>
                Math.abs(y(d.open) - y(0))
            )
            .attr("fill", "steelblue");

        canvas.selectAll<SVGRectElement, groupedBarData>("rect.close")
            .data(groupedBarData,
                (d) => d.label + " - close"
            )
            .join("rect")
            .attr("class", "close")
            .attr("x", d => (x0(d.label) ?? 0) + (x1("close") ?? 0))
            .attr("width", x1.bandwidth())
            .attr("y", d =>
                d.close >= 0
                    ? y(d.close)
                    : y(0)
            )
            .attr("height", d =>
                Math.abs(y(d.close) - y(0))
            )
            .attr("fill", "orange");

    }, [data, width, height, mode, isSorted, {prefix, suffix, formatType}]);
    
    const CHEVRON_SIZE = 20
    const chevronFill = "#4ade80"
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
                        style={{ }}
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        {/* Left Chevron */}
                        <g
                            transform={`translate(10, ${height / 2})`}
                            style={{ cursor: "pointer" }}
                            onClick={() => console.log("left")}
                        >
                            <path
                                d={`
                                    M ${CHEVRON_SIZE / 2} ${-CHEVRON_SIZE / 2}
                                    L ${-CHEVRON_SIZE / 2} 0
                                    L ${CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                `}
                                fill={chevronFill}
                                stroke="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* Right Chevron */}
                        <g
                            transform={`translate(${width - 10}, ${height / 2})`}
                            style={{ cursor: "pointer" }}
                            onClick={() => console.log("right")}
                        >
                            <path
                                d={`
                                    M ${-CHEVRON_SIZE / 2} ${-CHEVRON_SIZE / 2}
                                    L ${CHEVRON_SIZE / 2} 0
                                    L ${-CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                `}
                                fill={ chevronFill }
                                stroke="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* Up Chevron */}
                        <g
                            transform={`translate(${width / 2}, 10)`}
                            style={{ cursor: "pointer" }}
                            onClick={() => console.log("up")}
                        >
                            <path
                                d={`
                                    M ${-CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                    L 0 ${-CHEVRON_SIZE / 2}
                                    L ${CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                `}
                                fill={ chevronFill }
                                stroke="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                        
                        <g className="plot-area">                            
                            <g className={`${styles["value-axis"]} y-axis`} />
                            <g className={`${waterfallStyles["x-axis"]} x-axis`} />
                            <line className='zero-line' stroke="currentColor" strokeWidth={1} />     
                        </g>  
                                             
                    </svg>            
                
                <Tooltip />
                </div>
            </div>
        </div>
    );
}