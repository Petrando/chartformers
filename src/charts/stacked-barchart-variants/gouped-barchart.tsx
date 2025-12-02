import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import { inactiveColor } from '../../data/constants';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { LayeredData, ExtendedSeriesPoint, ExtendedSeries, StackedBarChartProps } from './types';
import { useUIControls } from '../../hooks/useUIControls';

export function GroupedBarChart({ data, color:{idx = 0} = {idx: 0} }: StackedBarChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();
    const { height: controlsHeight } = controlsSize;
    
    const [dataJustChanged, setDataJustChanged] = useState(false)
    const [plotted, setPlotted] = useState<string>("all");
    const [justPlotted, setJustPlotted] = useState<boolean>(false)
    const [hovered, setHovered] = useState<string>("")    
    const [isSorted, setIsSorted] = useState<boolean>(false);
    
    const uiControls = useUIControls();  
    
    const stackData = data
    useEffect(() => {
        setPlotted("all")
        setDataJustChanged(true)
        setIsSorted(false)
    }, [stackData])    
    
    const animDuration = 750;
    useEffect(()=>{
        let timer: ReturnType<typeof setTimeout>;
        if(dataJustChanged){
            timer = setTimeout(()=>{setDataJustChanged(false)}, animDuration + 500)
        }
        return () => { clearTimeout(timer)}
    }, [dataJustChanged]) 

    const chartHeight = uiControls ? height : height  - controlsHeight;
    const colorIdx = idx;
    const renderDeps = [ width, chartHeight, plotted, colorIdx ]

    const chartData:LayeredData[] = cloneObj(stackData);                        
    const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];

    const layers = useLayerIndex(keys)

    const legendRef = useD3<HTMLDivElement>((container) => { 
        if(dataJustChanged) return
        const legendWidth = 80               
        const legends = container.selectAll<HTMLDivElement, string>(".legend-item")
            .data([...keys], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", function(d){  
                            return `                                
                                ${plotted === d ?
                                    stackedBarStyles["legend-container-active"]:
                                        stackedBarStyles["legend-container"]} 
                                legend-item`
                        })
                        .style("left", (_, i)=> `${i * legendWidth}px`)
                        .style("top", "-53px")
                        .style("opacity", 0);

                    divs.append("div")
                        .attr("class", stackedBarStyles["legend-rect"])
                        .style("background", (d) => {
                            const layerIndex = layers.current.findIndex(l => l === d) + colorIdx
                            return indexColor(layerIndex);
                        })
                    divs.append("span")
                        .attr("class", stackedBarStyles["legend-label"])
                        .text(d=>d)

                    divs.transition().duration(animDuration)                                                        
                        .style("top", "0px")                              
                        .style("opacity", 1)
                        
                    return divs;
                },
                update => {
                    update
                        .attr("class", (d) => `                                
                                ${plotted === d ?
                                    stackedBarStyles["legend-container-active"]:
                                        stackedBarStyles["legend-container"]} 
                                legend-item`
                        )
                        .transition().duration(animDuration)
                            .style("top", "0px")
                            .style("left", (_, i)=> `${i * legendWidth}px`) 
                            .style("opacity", 1)
                        .select(`.${stackedBarStyles["legend-rect"]}`)
                        .style("background", (d) => {
                            const layerIndex = layers.current.findIndex(l => l === d) + colorIdx
                            return indexColor(layerIndex);
                        });

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`.${stackedBarStyles["legend-label"]}`)
                        .text(d => d);

                    return update;
                },
                exit => exit
                    .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("top", "53px")
                    .remove().remove()
            )        

        legends
            .on("click", (e, d)=>{
                setPlotted(prev=>{
                    if(prev === d) {
                        setIsSorted(false)
                        return "all"
                    }
                    return d
                })
            })
            .on("mouseover", (e, d)=>{
                setHovered(d)
            })
            .on("mouseout", (e, d)=>{
                setHovered("")
            })
                        
    }, [...renderDeps, keys, dataJustChanged]);

    // Define the controls element (checkbox)
    const controls = (
        <div 
            ref={controlsRef}
            className={`${styles["controls-container"]} ${uiControls?styles["fill-container"]:""}`}
        >
            <label className={styles["controls-label"]} style={{paddingRight: '12px'}}>
                <input 
                    type="checkbox" 
                    className={`${styles["controls-checkbox"]} ${plotted === "all"?styles.disabled:""}`} 
                    checked={isSorted}
                    onChange={(e) => setIsSorted(e.target.checked)}
                    disabled={plotted === "all"}
                />
                    Sort
            </label>
            <div 
                ref={legendRef}
                id='stacked-barchart-legends'
                className={`${stackedBarStyles["legends-container"]}`}
            />
        </div>
    );

    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || chartHeight === 0) return;
        if(hovered !== "" && dataJustChanged) return
        
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const isMediumScreen = width > 1024;  
                    
        chartData.forEach(function(d: LayeredData) {
            d.total = keys.reduce((acc, curr) => {
                const value = d[curr];
                return acc + (typeof value === 'number' ? value : Number(value));
            }, 0);
        });  
                        
        const filteredData = chartData/*.filter((d: LayeredData) => {
            return plotted === "all" ? (d?.total && d.total > 0) : (d[plotted as keyof LayeredData] as number) > 0;                
        });*/

        const sortedData = isSorted?
            cloneObj(filteredData).sort(function(a:LayeredData, b:LayeredData){
                /*if(plotted === "all"){
                    return a.total! - b.total!
                }*/

                return Number(a[plotted]!) - Number(b[plotted]!)
            }):filteredData

        const graphWidth = width - margin.left - margin.right,
                    graphHeight = chartHeight - margin.top - margin.bottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);

        const xAxisTextClass = !isMediumScreen?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;    

        const x: d3.ScaleBand<string> = d3.scaleBand<string>()
            .rangeRound([0, graphWidth])
            .paddingInner(0.1)
            .align(0.2)
            
        const xLabels = sortedData.map(function(d: LayeredData) { return d.label; });
        x.domain(xLabels);

        const prevXLabels: string[] = [];
        
        const xAxis = d3.axisBottom(x)
            .tickValues(x.domain())
            .scale(x)
            .tickSizeOuter(0);

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0,${graphHeight})`)
            .transition().duration(animDuration)
            .call(xAxis)
            .selectAll("text")
            .style("cursor", "pointer")
            .attr("dy", !isMediumScreen ? ".20em" : "1em")
            .attr("dx", !isMediumScreen ? "-.8em" : "0em")
            .attr("class", xAxisTextClass);

        const y = d3.scaleLinear()
            .range([graphHeight, 0]);
            
       /*const yMax = plotted === "all"?
                d3.max(chartData, d => d3.max(
                    Object.entries(d)
                    .filter(d => d[0]!=="total" && d[0]!=="label"), d => (d as any)[1])):
                        d3.max(chartData, d=>(d[plotted] as number));*/               
                                                
        const yMax =
            plotted === "all"
                ? d3.max(chartData, d =>
                    d3.max(
                    Object.entries(d)
                        .filter(([key]) => key !== "total" && key !== "label")
                        .map(([, value]) => value as number)     // value is number | string | undefined
                    )
                )
                : d3.max(chartData, d => d[plotted] as number);
        y.domain([0, yMax ?? 0]);        

        const yAxis = d3.axisLeft(y).ticks(null, "s");            
                                
        canvas.select<SVGGElement>(".y-axis")  
            .attr("transform", `translate(0,0)`)
            .style("color", "steelblue")          
                .transition().duration(animDuration)
            .call(yAxis)

        const dataLayers: d3.Series<LayeredData, string | string[]>[] =
            d3.stack<LayeredData>().keys(keys)(sortedData);        
        
        const processedDataLayers:ExtendedSeries[] = dataLayers.map((series) => {
            const seriesKey = series.key
            const newSeries = series.map((point) => {                
                return {
                    ...point,
                    key: `${seriesKey} - ${point.data.label}`,
                    barKey: seriesKey as string,
                };
            }) as ExtendedSeries

            newSeries.key = seriesKey as string
            return newSeries
        }
        );

        const updateRectClass = (d:ExtendedSeriesPoint) => {
                if(hovered !== ""){
                    return `rect 
                        ${
                            hovered === d.barKey?
                            stackedBarStyles.rectLegendHovered:
                            stackedBarStyles.rectLegendNotHovered
                        }`
                }
                return `rect ${stackedBarStyles.rect}`

        }  

        let serie = canvas.selectAll<SVGGElement, ExtendedSeries>(".serie")
            .data(processedDataLayers, function(d){return d.key})
            .join(
                enter=>{
                    let g = enter.append("g")
                        .attr("class", "serie")
                        .attr("fill", function(d) {
                            const layerIndex = layers.current.findIndex(l => l === d.key) + colorIdx
                            return indexColor(layerIndex); })
                        .style("opacity", d=>{
                            if(plotted === "all"){
                                return 1;
                            }else {                                
                                return d.key === plotted?1:0;
                            }
                        })
                        .style("pointer-events", d=>{
                            if(plotted === "all"){
                                return "auto";
                            }else {
                                return d.key === plotted?"auto":"none";
                            }
                        });
                    return g;
                },
                update=>{
                    let g = update
                    /*
                        .attr("class", function(d){                                
                            if(legendHover !== "" && legendHover === d.key){
                                return "serie " + styles.rectLegendHovered
                            }
                            return "serie"
                        })*/
                        .transition().duration(animDuration)
                        .attr("fill", function(d) {
                            const layerIndex = layers.current.findIndex(l => l === d.key) + colorIdx
                            return indexColor(layerIndex); })
                        .style("opacity", d=>{
                            if(plotted === "all"){
                                return 1;
                            }else {
                                return d.key === plotted?1:0;
                            }
                        })
                        .style("pointer-events", d=>{
                            if(plotted === "all"){
                                return "auto";
                            }else {
                                return d.key === plotted?"auto":"none";
                            }
                        });
                    return g;
                },
                exit=>exit
                    .transition().duration(animDuration)
                    .style("opacity", 0).attr("fill", "grey")
                    .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                    .attr("y", graphHeight)
                    .attr("height", 0)
                    .remove()
            )
            
        serie.selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
            .data(
                (d) => d,
                (d) => d.data.label
            )
            .join(
                enter=>{
                    let theBars
                    
                    theBars = enter
                        .append("rect")
                        .attr("class", updateRectClass)
                        .attr("x", function(d) {
                            const idx = keys.indexOf(d.barKey)
                            const xPos = x(d.data.label + "") ?? 0
                            return xPos + (idx * (x.bandwidth()/keys.length)); 
                        })
                        .attr("width", function(d){
                            return plotted === "all"?
                                x.bandwidth()/keys.length:x.bandwidth()
                        }) 
                        .attr("y", graphHeight)
                        .attr("height", 0)
                            .transition().duration(animDuration)//.delay(animDelay)
                            .attr("x", function(d){                                                        
                                const xPos = x(d.data.label + "") ?? 0;
                                if(plotted === "all"){                                    
                                    const idx = keys.indexOf(d.barKey) || 0
                                    return xPos + (idx * (x.bandwidth()/keys.length))
                                }                            
                                return xPos
                            })
                            .attr("width", function(d){
                                return plotted === "all"?
                                    x.bandwidth()/keys.length:x.bandwidth()
                            })                        
                            .attr("height", function(d){                                                                
                                const rectHeight = y(d[0]) - y(d[1]);
                                return isNaN(rectHeight)?0:rectHeight<0?0:rectHeight;
                            })
                            .attr("y", function(d){ 
                                return graphHeight - (y(d[0]) - y(d[1]))
                            })
                                            
                    return theBars
                },
                undefined,                
                exit=>exit
                    .attr("fill", inactiveColor)
                    .transition().duration(animDuration)
                    .attr("opacity", 0)
                    .attr("height", 0)                        
                    .attr("y", graphHeight + margin.bottom).remove()
            )
            .attr("class", updateRectClass)
            .transition().duration(animDuration)//.delay(animDelay)
                .attr("x", function(d){                                                        
                    const xPos = x(d.data.label + "") ?? 0;
                    if(plotted === "all"){
                        const idx = keys.indexOf(d.barKey) || 0
                        return xPos + (idx * (x.bandwidth()/keys.length))
                    }                            
                    return xPos
                })
                .attr("width", function(d){
                    return plotted === "all"?
                        x.bandwidth()/keys.length:x.bandwidth()
                })                        
                .attr("height", function(d){                                                                
                    const rectHeight = y(d[0]) - y(d[1]);
                    return isNaN(rectHeight)?0:rectHeight<0?0:rectHeight;
                })
                .attr("y", function(d){ 
                    return graphHeight - (y(d[0]) - y(d[1]))
                });

        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .on("mouseover", function(e, d){
                    //unhoverLegend()
                    
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label).attr("class", xAxisTextClass + " " + stackedBarStyles.hoveredAxisText)

                    tooltip.style("opacity", 1)
                        .select("p.title").text(d.data.label)
                    
                    const value = d.data[d.barKey]
                    const {total} = d.data
                    const percentage = (value as number/total!) * 100
                    const percentText = d3.format(".1f")(percentage) + "%"
                    tooltip.select("p.top-label").text(d.barKey + " : " + basicFormat(value as number))
                    tooltip.select("p.bottom-label").text(
                        plotted === "all"?`Total : ${basicFormat(total!)}`:"~"
                    )
                })
                .on("touch", function(e, d){
                    //unhoverLegend()
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label).attr("class", xAxisTextClass)
                })
                .on("mousemove", (e, d)=>{
                    moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: y})
                })
                .on("mouseout", function(e, d){
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label).attr("class", xAxisTextClass)

                    tooltip.style("opacity", 0);
                })
            
                         

    }, [ ...renderDeps, isSorted, chartData, keys, hovered, justPlotted, dataJustChanged ]);
    
    return (
        <div 
            ref={ref} 
            style={{ width, height, display:'flex', flexDirection:'column' }}
        >
            {uiControls
                ? createPortal(controls, uiControls)
                    : controls}
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column"}}>
            <svg
                className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                viewBox={`0 0 ${width} ${chartHeight}`}
            >
                <g className="plot-area">
                    <g className="plot-rects" />
                    <g className="y-axis" />
                    <g className="x-axis" />  
                </g>        
                
            </svg>
            <Tooltip pCount={3} />
            </div>
        </div>
    );
}