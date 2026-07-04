import React, {useState} from 'react';
import { createPortal } from "react-dom";
import { select, scaleBand, scaleLinear, axisLeft, axisBottom, min, max, format,
    line, curveLinear, curveBasis, curveCardinal, curveCatmullRom, curveNatural
 } from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import styles from './global.module.css';
import barchartStyles from './barchart.module.css';
import { pointData, tooltipFormat, lineDecor } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';

type BarchartProps = {
    data: pointData[];
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    orientation?: 'horizontal' | 'vertical';
    tooltipFormat?: tooltipFormat;
    lineProps?: lineDecor;
}

export function BarChart({
        data, 
        color: {
            idx = 0,               // default idx
            type = 'fixed',        // default type
        } = { idx: 0, type: 'fixed' },
        orientation = 'vertical',
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"},
        lineProps: {
            showLine = false, showDots = true, curve = "linear"
        } = {
            showLine: false, showDots: true, curve: "linear"
        }
    }:BarchartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;

    const [isSorted, setIsSorted] = useState<boolean>(false);

    const layersRef = useLayerIndex(data.map(d => String(d.label)));
    
    const uiControls = useUIControls();

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)
    const controls = (
        <div 
            id="controls" 
            className={`${styles[isMediumScreen?"controls-container":"controls-container-sm"]} ${uiControls?styles["fill-container"]:""}`}
        >
            <label className={styles["controls-label"]}>
                <input 
                    type="checkbox" 
                    className={styles["controls-checkbox"]} 
                    checked={isSorted}
                    onChange={(e) => setIsSorted(e.target.checked)}
                />
                    Sort
            </label>
        </div>
    );

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
        
        const barchartData:pointData[] = isSorted?
            cloneObj(data).sort((a:pointData,b:pointData)=>b.value - a.value)
            :cloneObj(data);

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
        const labelScale = scaleBand()
            .domain(barchartData.map(d => String(d.label)))
            .rangeRound(orientation === 'vertical'?
                [0, graphWidth]:[graphHeight, 0])
            .paddingInner(isMediumScreen?0.4:0.25)
            .paddingOuter(0.1)            
            //.align(0.2)

        const baseValueMin = min(barchartData, (d) => d.value) ?? 0
        const valueMin = Math.min(0, baseValueMin)

        const baseValueMax = max(barchartData, (d) => d.value) ?? 0
        const valueMax = Math.max(0, baseValueMax)        

        const valueScale = scaleLinear()
            .domain([valueMin, valueMax])
            .rangeRound(orientation === 'vertical'?
                [graphHeight, 0]:[0, graphWidth])
            .nice()        

        const xAxis = orientation === 'vertical'?axisBottom(labelScale)
                .tickValues(labelScale.domain())
                .scale(labelScale)
                .tickSizeOuter(0):
            axisBottom(valueScale)
                .ticks(5, "s")
                .tickSizeOuter(0)
                .tickSize(-graphHeight);        

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0, ${graphHeight})`)
            .transition().duration(animDuration).call(xAxis)
            .selectAll("text")
            .attr("class", xAxisTextClass);                         

        const y1Axis = orientation === 'vertical'?
            axisLeft(valueScale).ticks(5, "s").tickSize(-graphWidth):
            axisLeft(labelScale).tickSizeOuter(0)                 
                    
        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(0, 0)`)
            .transition().duration(animDuration).call(y1Axis)

        const barColor = (d: pointData) => {
            const { idx, type } = color
            const i = layersRef.current.findIndex(l => l === String(d.label));
            if (type === 'fixed') {
                return indexSelectedColor(idx);
            } else {
                return indexSelectedColor(idx + i);
            }                
        }

        const valueScalePos = (value: number) => {                        
            
            return orientation === 'vertical'?
                value >= 0 ? valueScale(value) : valueScale(0):
                    value >= 0 ? valueScale(0) : valueScale(value)
        }

        const valueScaleDimension = (value: number) => {                        
            const rectDimension = Math.abs(valueScale(value) - valueScale(0));
            return isNaN(rectDimension)?0:rectDimension<0?0:rectDimension;
        }

        const bars =  canvas
            .selectAll<SVGRectElement, pointData>(".bar")
            .data(barchartData, (d) => String(d.label))
            .join(
                enter=>enter.append("rect")
                .attr("class", `bar ${styles.bar}`)
                    .attr("x", function(d) { 
                        if(orientation === 'vertical'){
                            return labelScale(String(d.label)) ?? 0; 
                        }else{
                            return valueScale(0);
                        }                        
                    })
                    .attr("width", function(d){
                        if(orientation === 'vertical'){
                            return labelScale.bandwidth()
                        }else{
                            return 0
                        }
                    })
                    .attr("y", function(d){
                        if(orientation === 'vertical'){
                            return valueScale(0)
                        }else{
                            return labelScale(String(d.label)) ?? 0;
                        }
                    })
                    .attr("height", function(){
                        if(orientation === "vertical"){
                            return 0
                        }else{
                            return labelScale.bandwidth()
                        }
                    })
                    .attr("fill", barColor)
                    .transition().duration(animDuration)
                    .attr("y", function(d){
                        if(orientation === 'vertical'){
                            return valueScalePos(d.value);
                        }else{
                            return labelScale(String(d.label)) ?? 0;
                        }                                                                
                        
                    })
                    .attr("width", function(d){
                        if(orientation === 'vertical'){
                            return labelScale.bandwidth()
                        }else{
                            return valueScaleDimension(d.value)
                        }
                    })
                    .attr("height", function(d){  
                        if(orientation === 'vertical'){
                            return valueScaleDimension(d.value);
                        }else{
                            return labelScale.bandwidth()
                        }                                                                                                              
                    }),
                undefined,
                exit=>exit                  
                    .transition().duration(animDuration)
                .attr("fill", inactiveColor)
                .attr("height", 0).attr("y", height).style("opacity", 0)            
                    .remove()
            )
            .on("mouseover", (e, d)=>{                
                
                tooltip.style("opacity", 1)
                    .select("p").text(String(d.label) + ` : 
                        ${prefix}
                        ${format(formatType === "long"?",":"~s")(d.value)}
                        ${suffix}`);              
                
                select(".x-axis").selectAll("text")
                    .filter(dText=>dText === String(d.label)).style("font-weight", "bold")
                }
            )      
            .on("mousemove", (e, d)=>{
                moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: valueScale})
            })
            .on("mouseout", (e, d)=>{                
                tooltip.style("opacity", 0);

                select(".x-axis").selectAll("text")
                    .filter(dText=>dText === String(d.label)).style("font-weight", "normal")
            })
            .transition().duration(animDuration)
                .attr("fill", barColor)
                .attr("x", function(d) {
                    if(orientation === 'vertical'){
                            return labelScale(String(d.label)) ?? 0; 
                        }else{
                            return valueScalePos(d.value);
                        }
                 })
                .attr("width", function(d){
                    if(orientation === 'vertical'){
                        return labelScale.bandwidth()
                    }else{
                        return valueScaleDimension(d.value)
                    }
                })
                .attr("y", function(d){
                    if(orientation === 'vertical'){
                        return valueScalePos(d.value);
                    }else{
                        return labelScale(String(d.label)) ?? 0;
                    }                                                                
                    
                })
                .attr("height", function(d){  
                    if(orientation === 'vertical'){
                        return valueScaleDimension(d.value);
                    }else{
                        return labelScale.bandwidth()
                    }                                                                                                              
                });

        const lineFn = line<pointData>()
            .x((d) => 
                orientation === "vertical"?
                    (labelScale(d.label) ?? 0) + labelScale.bandwidth()/2:
                    valueScale(d.value)
            )
            .y((d) => 
                orientation === "horizontal"?
                    (labelScale(d.label) ?? 0) + labelScale.bandwidth()/2:
                    valueScale(d.value)
            )
        
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

        const radius = isMediumScreen?3:2
        const lineColor = "#2b2b22"

        const lineData = showLine?[barchartData]:[]
        const lines = canvas.selectAll<SVGPathElement, pointData[]>("path.chartline")
            .data(lineData)
            .join(
                enter=>enter.append("path")
                    .attr("class", "chartline")
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
        
        lines.raise()
        
        const cx = (d: pointData) => {
            return orientation === "vertical"?
                (labelScale(d.label) ?? 0) + labelScale.bandwidth()/2:
                valueScale(d.value)
        }

        const cy = (d: pointData) => {
            return orientation === "vertical"?
                valueScale(d.value):
                (labelScale(d.label) ?? 0) + labelScale.bandwidth()/2
        }

        const dotsData = (showLine && showDots)?barchartData:[]
        const dots =  canvas
            .selectAll<SVGCircleElement, pointData>(".dot")
            .data(dotsData, (d) => String(d.label))
            .join(
                enter=>enter.append("circle")
                    .attr("class", "dot")
                    .attr("cx", function(d){
                        return orientation === "horizontal"?
                            valueScale(0):(labelScale(d.label) ?? 0) + labelScale.bandwidth()/2
                    })
                    .attr("cy", function(d){
                        return orientation === "vertical"?
                            valueScale(0):(labelScale(d.label) ?? 0) + labelScale.bandwidth()/2
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

    }, [data, color, width, height, isSorted, orientation, {prefix, suffix, formatType}, 
        { showLine, showDots, curve}]);
    
    return (
        <div 
            ref={ref} 
            style={{ width, height, display:'flex', flexDirection:'column' }}
        >
            {uiControls && createPortal(controls, uiControls)}  
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
                {
                    !uiControls &&
                    <label 
                        className={styles["controls-label"]}
                        style={{position: "absolute", right: "12px", top: "6px"}}
                    >
                        <input 
                            type="checkbox" 
                            className={styles["controls-checkbox"]}                         
                            checked={isSorted}
                            onChange={(e) => setIsSorted(e.target.checked)}
                        />
                            Sort
                    </label>
                }
                <Tooltip />
            </div> 
        </div>
    );
}