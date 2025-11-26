import React, {useState, useEffect} from 'react';
import * as d3 from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useContainerSize } from '../hooks/useContainerSize';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { cloneObj, indexColor } from '../utils';
import styles from './global.module.css';
import pieStyles from './piechart.module.css'
import { pointData } from '../types';

type PiechartProps = {
    data: pointData[];
    innerRadius?: number;
    sortWithLegends?: boolean;
}

export function PieChart({data, innerRadius = 0, sortWithLegends = false}:PiechartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;
    const [ graphRef, size] = useContainerSize<HTMLDivElement>()
    const { width: pieWidth, height: pieHeight } = size    
    const layersRef = useLayerIndex(data.map(d => d.label))

    const [prevData, setPrevData] = useState<d3.PieArcDatum<pointData>[]>([])
    const [isSorted, setIsSorted] = useState<boolean>(false);
    const [hovered, setHovered] = useState("")    
    
    const animDuration = 750;
    
    const legendRef = useD3<HTMLDivElement>((container) => {
        const keysData = (sortWithLegends && isSorted)?
            cloneObj(data).sort((a: pointData, b: pointData) => a.value - b.value):data 
        const keys = keysData.map((d: pointData) => d.label)                       
        const legends = container.selectAll<HTMLDivElement, string>(".legend-item")
            .data([...keys], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", function(d){                            
                            return `${pieStyles[d===hovered?"legend-active":"legend"]} legend-item`                            
                        })
                        .style("left", `-10px`)
                        .style("top", function(_, i){
                            return `${(i * 20) + 10}px`
                        })
                        .style("opacity", 0)
                                                                                                                            
                    divs.append("div")
                        .attr("class", `rect ${pieStyles["legend-rect"]}`)
                        .style("background-color", (d) => {                           
                            return indexColor(layersRef.current.findIndex(l => l === d));
                        })
                    divs.append("span")
                        .style("color", (d)=>{
                            //if(!focusOnPlot && plotted.includes(d)){
                                //return "#d1d5db"
                            //}
                            return "#333"
                        })
                        .text(d=>d)
                                                                                                
                    divs.transition().duration(animDuration)                                                        
                        .style("left", `6px`)                            
                        .style("opacity", 1)
                    return divs;
                },
                update => {
                    update
                        .attr("class", (d) => {
                            return `    
                                ${pieStyles[d===hovered?"legend-active":"legend"]} legend-item`
                        }) 
                        .transition().duration(animDuration)
                            .style("top", function(_, i){
                                return `${(i * 20) + 10}px`
                            })
                            .style("left", `6px`) 
                            .style("opacity", 1)                      
                        .select(`div.rect`)
                        .attr("class", `rect ${pieStyles["legend-rect"]}`)
                        .style("background-color", (d) => {
                            //if(!focusOnPlot && plotted.includes(d)){
                                //return "#d1d5db"
                            //}       
                            return indexColor(layersRef.current.findIndex(l => l === d));
                        });

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`span`)
                        .style("color", (d)=>{
                            //if(!focusOnPlot && plotted.includes(d)){
                                //return "#d1d5db"
                            //}
                            return "#333"
                        })
                        .text(d => d);                            

                    return update;
                },
                exit => exit
                    .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("left", "30px")
                    .remove()
            )         

        legends
            .on("mouseover", (e, d)=>{
                setHovered(d)
            })
            .on("mouseout", () => {setHovered("")})
                        
    }, [data, pieWidth, pieHeight, hovered, isSorted, sortWithLegends]);
   
    const chartRef = useD3<SVGSVGElement>((svg) => {
        if (pieWidth === 0 || pieHeight === 0) return;

        const center = {x:pieWidth/2, y:pieHeight/2}            
        const margin = { top: 10, right: 20, bottom: 10, left: 20 };

        const piechartData:pointData[] = data

        const graphWidth = pieWidth - (margin.left + margin.right)
        const graphHeight = pieHeight - (margin.top + margin.bottom)
        const radius = Math.min(graphWidth, graphHeight) / 2
            
        const total = piechartData.reduce((acc, curr)=>{
            return acc + curr.value
        }, 0)

        const canvas = svg.select<SVGGElement>(".plot-area")
            .attr("transform", "translate(" + center.x + "," + center.y + ")");

        const pie = d3.pie<pointData>()
            .value(function(d) {return d.value; })
            .sort(function(a, b) {  
                if(!isSorted){
                    return 0
                }
                return d3.ascending(a.value, b.value);
            })
                
        const pieData = cloneObj(piechartData)            
        const dataReady = pie(pieData)
        const prevPieData = cloneObj(pieData)
        setPrevData(pie(prevPieData))

        let isExit = prevPieData.length > pieData.length?true:false
        const prevLabels = prevData.map(d => d.data.label)
        const labels = dataReady.map(d => d.data.label)                        
                
        prevLabels.every((prevLabel)=>{
            if(isExit){
                return false
            }
            if(!labels.includes(prevLabel)){
                isExit = true
                return false
            }

            return true
        })
        const firstTimeRender = prevData.length === 0

        const padding = 12
        const arc = d3.arc<d3.PieArcDatum<pointData>>()
            .innerRadius(innerRadius)
            .outerRadius(radius - padding);
        const fullArc = d3.arc<d3.PieArcDatum<pointData>>()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        const angleInterpolation = (d: d3.PieArcDatum<pointData>, direction: string) => {
                
            const i = d3.interpolate(
                direction==="exit"?d.endAngle:d.startAngle, 
                direction==="exit"?d.startAngle:d.endAngle
            );
            
            const isHovered = d.data.label === hovered
            return function(this: SVGPathElement, t: number): string {
                d.endAngle = i(t);                     
                return isHovered?fullArc(d) || "":arc(d) || ""
            }
        }        

        const pieSlices = canvas.selectAll<SVGPathElement, d3.PieArcDatum<pointData>>("path")
                .data(dataReady, function(d){ return d.data.label })
                .join(
                    enter=>{
                        const slices = enter.append('path')
                            .attr("class", pieStyles.pieSlice)
                            .attr('fill', function(_){ 
                                const layerIndex = layersRef.current.findIndex(l => l ===_.data.label)                                                                
                                return indexColor(layerIndex) 
                            })                            

                        slices//.merge(slices)                                                                        
                            .transition().duration(animDuration)
                            .delay(firstTimeRender?0:(animDuration/* + exitDelay*/) )                        
                        .attr('d', arc)                            
                        .attrTween('d', function(this: SVGPathElement, d){
                            
                            if(!firstTimeRender){
                                return angleInterpolation(d, "not exit")
                            }
                            const startAngleI = d3.interpolate(0, d.startAngle)
                            const endAngleI = d3.interpolate(0, d.endAngle)

                            const isHovered = d.data.label === hovered
                            return function(this: SVGPathElement, t: number): string {
                                d.startAngle = startAngleI(t)
                                d.endAngle = endAngleI(t)
                                return isHovered?fullArc(d) as string:arc(d) as string;
                            }
                        })

                        return slices
                    },
                    update=>{
                        const slices = update
                        
                        update//.merge(slices)
                                .transition().duration(animDuration)//.delay(exitDelay)
                            .attr('fill', function(_, i){                                 
                                const layerIndex = layersRef.current.findIndex(l => l ===_.data.label)                                                                                                                                                         
                                return indexColor(layerIndex)
                             })                        
                            //.attr('d', arc)                            
                            .attrTween('d', function(this: SVGPathElement, d){
                                const myPrev = prevData.find((prevD:d3.PieArcDatum<pointData>) => prevD.data.label === d.data.label)
                                const prevStartAngle = !myPrev?0:myPrev.startAngle?myPrev.startAngle:0
                                const startAngleI = d3.interpolate(prevStartAngle, d.startAngle)
                                const prevEndAngle = !myPrev?0:myPrev.endAngle?myPrev.endAngle:0
                                const endAngleI = d3.interpolate(prevEndAngle, d.endAngle)
                                
                                const isHovered = d.data.label === hovered
                                return function(this: SVGPathElement, t: number): string {
                                    d.startAngle = startAngleI(t)
                                    d.endAngle = endAngleI(t)
    
                                    return isHovered?fullArc(d) || "":arc(d) || ""
                                }
                            })

                        return slices
                    },
                    exit=>exit
                        .attr("class", pieStyles.pieSliceExit)
                        .transition().duration(animDuration)                        
                        .attrTween('d', function(this: SVGPathElement, d){
                            return angleInterpolation(d, "exit")
                        })
                        .remove()
                    
                )
        
        pieSlices
            .on("mouseover", function(e, d){
                setHovered(d.data.label)
            })
            .on("mouseout", ()=>{setHovered("")})

        const labelPosition = (d:d3.PieArcDatum<pointData>) => {
            if(piechartData.length === 1){
                return `translate(0, 0)`
            }
            return `translate(${arc.centroid(d)})`
        }

        const percentageLabel = (d:d3.PieArcDatum<pointData>) => {
            const percentage = (d.value/total)// * 100
            return d3.format(".1%")(percentage)
        }

        const pieLabels =  canvas.selectAll<SVGTextElement, d3.PieArcDatum<pointData>>("text")
            .data(dataReady, function(d){return d.data.label})
            .join(
                enter=>{
                    const labels = enter.append('text')
                        .text(percentageLabel)
                        .attr("class", pieStyles.pieLabelEnter)                           

                    labels.merge(labels)                                                                        
                        .transition().duration(animDuration).delay(animDuration/* + exitDelay*/)                        
                    .attr("transform", labelPosition)

                    return labels
                },
                update=>{
                    const labels = update.text(percentageLabel)
                    
                    update.merge(labels)
                        .attr("class", pieStyles.pieLabelUpdate)
                            .transition().duration(hovered!==""?250:animDuration)//.delay(exitDelay)
                        .style("opacity", function(d){
                            const isHovered = hovered === d.data.label
                            return hovered === ""?1:isHovered?1:0
                        })                        
                        .attr("transform",labelPosition)

                    return labels
                },
                exit=>exit.transition().duration(animDuration/2)
                    .attr("class", pieStyles.pieLabelExit)
                    .remove()
                
            )
        

    }, [data, innerRadius, pieWidth, pieHeight, isSorted, hovered]);

    // Determine legend position
    console.log("width,height:", width, height);
    console.log("width <= 480:", width <= 480);
    const isWide = width > height;
    //width <= 480 ? false:
    console.log("isWide:", isWide);
        
    return (
        <div 
            ref={ref} 
            style={{ 
                width, height, position: 'relative', 
                display:'flex', flexDirection: isWide ? 'row' : 'column', 
                overflow: 'hidden',
            }}
        >            
            <div
                ref={graphRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                }}
            >
                <svg
                    ref={chartRef}
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}
                    viewBox={`0 0 ${pieWidth} ${pieHeight}`}
                >
                    <g className="plot-area" />                
                </svg>
            </div> 
            <div
                style={{
                    width: isWide ? width > 480?'180px':`${0.3 * width}px` : '100%',
                    height: isWide ? '100%' : height > 400?'180px':`${0.3 * height}px`,
                    flexShrink: 0,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.03)',
                    borderLeft: isWide ? '1px solid #ddd' : 'none',
                    borderTop: !isWide ? '1px solid #ddd' : 'none',
                    padding: '0px',
                }}
            >
                <div
                    ref={legendRef}
                    className="legends-content"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '8px 8px 16px 8px',
                        boxSizing: 'border-box',
                        position: 'relative',                        
                    }}
                >
                    
                </div>
            </div>
            <label 
                className={styles["controls-label"]}
                style={{position: "absolute", left: "12px", top: "6px"}}
            >
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
}