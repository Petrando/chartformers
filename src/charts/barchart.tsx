import React, {useState, useEffect} from 'react';
import { createPortal } from "react-dom";
import * as d3 from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor } from '../utils';
import { inactiveColor } from '../data/constants';
import styles from './global.module.css';
import barchartStyles from './barchart.module.css';
import { pointData } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';

type BarchartProps = {
    data: pointData[];
    color?: {
        idx: number;
        type?: 'fixed' | 'colorful';
    };
}

export function BarChart({data, color: {
        idx = 0,               // default idx
        type = 'fixed',        // default type
    } = { idx: 0, type: 'fixed' }}:BarchartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;

    const [isSorted, setIsSorted] = useState<boolean>(false);
    const layersRef = useLayerIndex(data.map(d => d.label));
    
    const uiControls = useUIControls();

    // Define the controls element (checkbox)
    const controls = (
        <div 
            id="controls" 
            className={`${styles["controls-container"]} ${uiControls?styles["fill-container"]:""}`}
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
        
        const margin = { top: 20, right: 30, bottom: 50, left: 25 };
        
        const barchartData:pointData[] = isSorted?
            cloneObj(data).sort((a:pointData,b:pointData)=>b.value - a.value)
            :cloneObj(data);

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);

        const isMediumScreen = width > 1024;
        const xAxisTextClass = !isMediumScreen?barchartStyles.rotatedAxisText:
                    barchartStyles.axisText;

        const x = d3
            .scaleBand()
            .domain(barchartData.map(d => d.label))
            .rangeRound([margin.left, width - margin.right])
            .padding(0.1);

        const xAxis = d3
            .axisBottom(x)
            .tickValues(x.domain())
            .scale(x)
            .tickSizeOuter(0);        

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0, ${height - margin.bottom})`)
            .transition().duration(animDuration).call(xAxis)
            .selectAll("text")
            .attr("class", xAxisTextClass);

        const y1 = d3
            .scaleLinear()
            .domain([0, d3.max(barchartData, (d/*:barchartDataI*/) => d.value) ?? 0])
            .rangeRound([height - margin.bottom, margin.top]);                   

        const y1Axis = d3.axisLeft(y1).ticks(null, "s")                 
                    
        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(${margin.left}, 0)`)
            .transition().duration(animDuration).call(y1Axis)

        const barColor = (d: pointData) => {
            const { idx, type } = color
            const i = layersRef.current.findIndex(l => l === d.label);
            if (type === 'fixed') {
                return indexSelectedColor(idx);
            } else {
                return indexSelectedColor(idx + i);
            }                
        }

        const bars =  canvas
            .selectAll<SVGRectElement, pointData>(".bar")
            .data(barchartData, (d) => d.label)
            .join(
                enter=>enter.append("rect")
                .attr("class", "bar")
                    .attr("x", function(d) { return x(d.label) ?? 0; })
                    .attr("width", x.bandwidth())
                    .attr("y", y1(0))
                    .attr("height", 0)
                    .attr("fill", barColor)
                    .transition().duration(animDuration)
                    .attr("y", function(d){                                                                
                        return y1(d.value);
                    })
                    .attr("height", function(d){                                                                                        
                        return y1(0) - y1(d.value);
                    }),
                update=>{
                    let theBars = update
                        .transition().duration(animDuration)
                        .attr("fill", barColor)
                        .attr("x", function(d) { return x(d.label) ?? 0; })
                        .attr("width", x.bandwidth())
                        .attr("y", function(d){                                                                
                            return y1(d.value);
                        })
                        .attr("height", function(d){                                                                                        
                            return y1(0) - y1(d.value);
                        })
                    return theBars
                },
                exit=>exit                  
                    .transition().duration(animDuration)
                .attr("fill", inactiveColor)
                .attr("height", 0).attr("y", height).style("opacity", 0)            
                    .remove()
            )
            .on("mouseover", (e, d)=>{
                canvas.selectAll("rect.bar")
                    .filter(dBar => (dBar as pointData).label === d.label)
                    .style("stroke", "#71717a")
                    .style("stroke-width", 1)

                tooltip.style("opacity", 1)
                    .select("p").text(d.label + ` : ${d3.format(",")(d.value)}`);              
                
                d3.select(".x-axis").selectAll("text")
                    .filter(dText=>dText === d.label).style("font-weight", "bold")
                }
            )      
            .on("mousemove", (e, d)=>{
                moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: y1})
            })
            .on("mouseout", (e, d)=>{
                canvas.selectAll("rect.bar")
                    .filter(dBar => (dBar as pointData).label === d.label)
                    .style("stroke", "none")
                    .style("stroke-width", 0)

                    tooltip.style("opacity", 0);

                    d3.select(".x-axis").selectAll("text")
                    .filter(dText=>dText === d.label).style("font-weight", "normal")
                }
            )
            .transition().duration(animDuration)
                .attr("fill", barColor)
                .attr("x", function(d) {return x(d.label) ?? 0; })
                .attr("width", x.bandwidth())
                .attr("y", function(d){                                                                
                    return y1(d.value);
                })
                .attr("height", function(d){                                                                                        
                    return y1(0) - y1(d.value);
                });    

    }, [data, color, width, height, isSorted]);
    
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
                        <g className="y-axis" />
                        <g className="x-axis" />  
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