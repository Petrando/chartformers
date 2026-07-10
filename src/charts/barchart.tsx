import React, {useState} from 'react';
import { createPortal } from "react-dom";
import { select, scaleBand, scaleLinear, axisLeft, axisBottom, min, max, format,
 } from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor, renderLineChart } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import styles from './global.module.css';
import barchartStyles from './barchart.module.css';
import { pointData, tooltipFormat, lineDecor, orientationType } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';

type BarchartProps = {
    data: pointData[];
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    orientation?: orientationType;
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

        //const tooltip = getTooltip(container as any);
        const tooltip = container.select(`#tooltip`).style("opacity", 0)
        
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

        renderLineChart(
                    canvas, {scale:labelScale, offset:labelScale.bandwidth()/2}, valueScale, 
                    { data: barchartData }, width, orientation, { showLine, showDots, curve})    

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