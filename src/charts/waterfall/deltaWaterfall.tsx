import React, { useEffect, useState, useRef } from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, format, min, max} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import styles from '../global.module.css';
import waterfallStyles from './waterfall.module.css'
import barchartStyles from '../barchart.module.css';
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
            top: 20, 
            right: 25, 
            bottom: 50, 
            left: 25
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

        const x0 = scaleBand()
            .domain(groupedBarData.map(d => d.label))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const x1 = scaleBand()
            .domain(keys)
            .range([0, x0.bandwidth()])
            .padding(0.05);

        const allValues = groupedBarData.flatMap(d =>
            keys.map(key => d[key] as number ?? 0)
        );

        const y = scaleLinear()
            .domain([
                Math.min(0, min(allValues) ?? 0),
                Math.max(0, max(allValues) ?? 0)
            ])
            .nice()
            .range([height - margin.bottom, margin.top]);

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        //canvas.selectAll(".month-group").remove()        

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