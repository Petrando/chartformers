import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import { inactiveColor } from '../../../dev/data/constants';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { LayeredData, ExtendedSeries, ExtendedSeriesPoint, StackedBarChartProps } from './types';
import { useUIControls } from '../../hooks/useUIControls';

export function PercentageBarChart({ data, colorIdx = 0, orientation = 'vertical', tooltipFormat }: StackedBarChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width: parentWidth, height: parentHeight } = parentSize;    
    
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();
    const { height: controlsHeight } = controlsSize;        
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize    

    const [hovered, setHovered] = useState<string>("")
    const [ isPercentage, setIsPercentage ] = useState<boolean>(true);
    const [dataJustChanged, setDataJustChanged] = useState<boolean>(false)
    const [plotted, setPlotted] = useState<string>("all");  
    
    const uiControls = useUIControls();
    
    const stackData = data
    useEffect(() => {
        setPlotted("all")
        setIsPercentage(true)
        setDataJustChanged(true)
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
    
    const renderDeps = [ width, height, plotted, colorIdx ]

    const chartData:LayeredData[] = cloneObj(stackData);                        
    const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];

    const layers = useLayerIndex(keys)
    const isMediumScreen = width > 576;

    const legendRef = useD3<HTMLDivElement>((container) => {
        if(dataJustChanged) return  
        const legendWidth = isMediumScreen?80:50
        
        const legendClass = function(d:string){
            const containerClass = stackedBarStyles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = stackedBarStyles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]
            const containerInactiveClass = stackedBarStyles[isMediumScreen?"legend-container-inactive":"legend-container-inactive-sm"]
            return  `
                ${plotted.includes(d)?
                    plotted === d?containerActiveClass:containerInactiveClass:
                        containerClass}
                legend-item
            `            
        }

        const legends = container.selectAll<HTMLDivElement, string>(".legend-item")
            .data([...keys], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", legendClass)
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
                        .attr("class", legendClass)
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
                    .remove().remove().remove()
            )        

        legends
            .on("mouseover", (e, d)=>{
                setHovered(d)
            })
            .on("mouseout", function(d){
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
                    className={styles["controls-checkbox"]} 
                    checked={isPercentage}
                    onChange={(e) => setIsPercentage(e.target.checked)}
                />
                    Percentage
            </label>
            <div 
                ref={legendRef}
                id='stacked-barchart-legends'
                className={`${stackedBarStyles["legends-container"]}`}
            />
        </div>
    );    
    
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        if(hovered !== "" && dataJustChanged) return
        
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };                              
        
        chartData.forEach(function(d: LayeredData) {
                d.total = keys.reduce((acc, curr) => {
                    const value = d[curr];
                    return acc + (typeof value === 'number' ? value : Number(value));
                }, 0);
            });  
                        
        const filteredData = chartData.filter((d: LayeredData) => {
            //return plotted === "all" ? (d?.total && d.total > 0) : (d[plotted as keyof LayeredData] as number) > 0;                
            return (d?.total && d.total > 0)
        });

        const sortedData:LayeredData[] = filteredData

        const graphWidth = width - margin.left - margin.right,
            graphHeight = height - margin.top - margin.bottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);        

        const xAxisTextClass = (!isMediumScreen && orientation === 'vertical')?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;

        const labels = sortedData.map(function(d: LayeredData) { return d.label; });
        const labelScale = d3.scaleBand<string | number>()
            .domain(labels)
            .rangeRound(orientation === 'vertical'?[0, graphWidth]:[graphHeight, 0])
            .paddingInner(isMediumScreen?0.4:0.25)
            .paddingOuter(0.2)            
            .align(0.2)

        const valueMax = d3.max(chartData, (d: LayeredData) => d.total)                                                                   
        const valueScale = d3.scaleLinear()
            .domain([0, isPercentage?1:valueMax || 0]).nice()
            .range(orientation === 'vertical'?[graphHeight, 0]:[0, graphWidth]);

        const x: d3.ScaleBand<string | number> = d3.scaleBand<string | number>()
            .rangeRound([0, graphWidth])
            .paddingInner(0.1)
            .align(0.2)
            
        const xLabels = sortedData.map(function(d: LayeredData) { return d.label; });
        x.domain(xLabels);

        const prevXLabels: string[] = [];
        
        const xAxis = orientation === 'vertical' 
            ?d3.axisBottom(labelScale)
                .tickValues(labelScale.domain())
                .tickSizeOuter(0):
            d3.axisBottom(valueScale)                
                .ticks(4, isPercentage?".0%":"s")
                .tickSizeOuter(0)
                .tickSize(-graphHeight);

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0,${graphHeight})`)
            .transition().duration(animDuration)
            .call(xAxis)
            .selectAll("text")
            .style("cursor", "pointer")
            .attr("dy", !isMediumScreen ? ".20em" : "1em")
            .attr("dx", !isMediumScreen ? "-.8em" : "0em")
            .attr("class", xAxisTextClass)
            .selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove();

        const yMax = d3.max(chartData, (d: LayeredData) => d.total)                                                                   

        const y = d3.scaleLinear()
            .domain([0, isPercentage?1:yMax || 0]).nice()
            .range([graphHeight, 0]);                                        
            
        const yAxis = orientation === 'vertical'
            ? d3.axisLeft(valueScale).ticks(4, isPercentage?".0%":"s").tickSize(-graphWidth)
            : d3.axisLeft(labelScale).tickSizeOuter(0);            
                                
        canvas.select<SVGGElement>(".y-axis")  
            .attr("transform", `translate(0,0)`)                      
                .transition().duration(animDuration)
            .call(yAxis)
            .selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove()

        const stack = d3.stack<LayeredData>()
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetExpand);

        const dataLayers: d3.Series<LayeredData, string>[] = !isPercentage?
            d3.stack<LayeredData>().keys(keys)(sortedData):
                stack.keys(keys)(sortedData);

        const extendedDataLayers: ExtendedSeries[] = dataLayers.map((series) => {
            const seriesKey = series.key;

            const newSeries = series.map((point) => {
                const datumLabel = point.data.label; 
                return {
                    ...point,
                    key: `${seriesKey} - ${datumLabel}`,
                    barKey: seriesKey,
                };
            }) as ExtendedSeries;

            newSeries.key = seriesKey;
            return newSeries;
        });        
        
        let serie = canvas.selectAll<SVGGElement, ExtendedSeries>(".serie")
            .data(extendedDataLayers, function(d){return d.key})
            .join(
                enter=>{
                    let g = enter.append("g")
                        .attr("class", "serie")
                        .attr("fill", function(d) {
                            const layerIndex = layers.current.findIndex(l => l === d.key) + colorIdx
                            return indexColor(layerIndex); 
                        })
                        .style("opacity", 1)
                        .style("pointer-events", "auto");
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
                            return indexColor(layerIndex); 
                        })
                        .style("opacity", 1)
                        .style("pointer-events", "auto");
                    return g;
                },
                exit=>exit.transition().duration(animDuration)
                    .style("opacity", 0).attr("fill", inactiveColor)
                    .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                    .attr("y", graphHeight)
                    .attr("height", 0)
                    .remove()                    
            )

        const labelScalePos = (d: ExtendedSeriesPoint) => {             
            return labelScale(d.data.label + "") ?? 0
        }

        const labelScaleBandWidth = labelScale.bandwidth()

        const valueScalePos = (d: ExtendedSeriesPoint) => {
            return valueScale(orientation === 'vertical'?d[1]:d[0])
        }

        const valueScaleDimension = (d: ExtendedSeriesPoint) => {
            const dimension = orientation === 'vertical'?valueScale(d[0]) - valueScale(d[1]):
                valueScale(d[1]) - valueScale(d[0]);
            return isNaN(dimension)?0:dimension<0?0:dimension;
        }

        const rectXPos = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? labelScalePos(d) : valueScalePos(d)
        }

        const rectWidth = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? labelScaleBandWidth : valueScaleDimension(d)
        }

        const rectYPos = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? valueScalePos(d) : labelScalePos(d)
        }

        const rectHeight = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? valueScaleDimension(d) : labelScaleBandWidth
        }

        function strokeDasharray(d: ExtendedSeriesPoint){
            if(d.barKey === hovered){
                return "none"
            }
            const rectStrokeWidth = rectWidth(d);            
            const rectStrokeHeight = rectHeight(d);    
            
            const isTopLayer = keys.indexOf(d.barKey) === keys.length - 1
                || d.barKey === plotted[0]

            if(isTopLayer){
                if(orientation === 'vertical'){
                    return `${rectStrokeWidth + rectStrokeHeight} ${rectStrokeWidth} ${rectStrokeHeight}`
                }else{
                    return `${rectStrokeWidth + rectStrokeHeight + rectStrokeWidth}`;
                }
            }

            return orientation === 'vertical'?
                `${rectStrokeHeight} ${rectStrokeWidth}`:
                    `${rectStrokeWidth} ${rectStrokeHeight}`
        }

        function strokeDashoffset(d: ExtendedSeriesPoint){
            const rectStrokeWidth = rectWidth(d);            
            const isTopLayer =
                keys.indexOf(d.barKey) === keys.length - 1;

            if(orientation === 'vertical'){
                return isTopLayer ? 0 : rectStrokeWidth * -1;
            }
            return 0
        }

        const updateRectClass = (d:ExtendedSeriesPoint) => {
                if(hovered !== "" && hovered === d.barKey){
                    return `rect ${stackedBarStyles.rectLegendHovered}`
                }
                return `rect ${stackedBarStyles.rect}`
        }
            
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
                            if(orientation === "vertical"){
                                return x(d.data.label + "") ?? 0;
                            }else{
                                return valueScale(0)
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
                                if(!prevXLabels.includes(d.data.label + "")){
                                    return graphHeight
                                }
                                //const yFinal = plotted==="all"?y(d[1]):
                                    //d.key.startsWith(plotted)?graphHeight - (y(d[0]) - y(d[1])):y(d[1])                                                                

                                const yFinal = valueScale(d[1]);
                                const rectHeight = valueScale(d[0]) - valueScale(d[1]);
                                const height = isNaN(rectHeight)?0:rectHeight<0?0:rectHeight
                                return yFinal + height;
                            }else{
                                return rectYPos(d)
                            }                             
                            
                        })
                        .attr("height", function(d){
                            if(orientation === 'vertical'){
                                return 0
                            }else{
                                return rectHeight(d)
                            }
                        })
                        .attr("stroke-dasharray", strokeDasharray)
                        .attr("stroke-dashoffset", strokeDashoffset)
                            .transition().duration(animDuration)
                            //.delay(animDelay)
                        .attr("x", rectXPos)
                        .attr("width", rectWidth)                        
                        .attr("height", rectHeight)
                        .attr("y", rectYPos)
                                            
                    return theBars
                },
                undefined,                
                exit=>exit
                    .transition().duration(animDuration)
                    .attr("opacity", 0) 
                    .attr("height", 0)                       
                    .attr("y", graphHeight).remove()
            )
            .attr("class", updateRectClass)
            .attr("stroke-dasharray", strokeDasharray)
            .attr("stroke-dashoffset", strokeDashoffset)
            .transition().duration(animDuration)//.delay(animDelay) 
                .attr("x", rectXPos)                    
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("y", rectYPos); 
                
        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .on("mouseover", function(e, d){
                    //unhoverLegend()
                    
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.name).attr("class", xAxisTextClass + " " + styles.hoveredAxisText)

                    tooltip.style("opacity", 1)
                        .select("p.title").text(d.data.label)
                    
                    const value:number = d.data[d.barKey] as number || 0
                    const total = d.data.total || 0
                    const percentage = (value/total) * 100
                    const percentText = d3.format(".1f")(percentage) + "%"
                    tooltip.select("p.top-label").text(d.barKey + " : " + (!isPercentage?
                        basicFormat(value, tooltipFormat):percentText))
                    tooltip.select("p.bottom-label").text(isPercentage?`(${basicFormat(value, tooltipFormat)} of ${basicFormat(total, tooltipFormat)})`:
                        `Total : ${basicFormat(total, tooltipFormat)}`
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
                        .filter(dText=>dText === d.data.name).attr("class", xAxisTextClass)

                    tooltip.style("opacity", 0);
                })

    }, [ ...renderDeps, chartData, keys, isPercentage, hovered, orientation, dataJustChanged, tooltipFormat ]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column' }}
        >
            {uiControls
                ? createPortal(controls, uiControls)
                    : controls}
            <div
                ref={chartContainerRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column"}}>
                <div
                    ref={chartRef} 
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column"}}>
                    <svg
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        <g className="plot-area">
                            <g className="plot-rects" />
                            <g className={`${orientation === 'vertical'?stackedBarStyles["value-axis"]:""} y-axis`} />
                            <g className={`${orientation === 'horizontal'?stackedBarStyles["value-axis"]:""} x-axis`} />    
                        </g>                        
                    </svg>
                    <Tooltip pCount={3} />
                </div>
            </div>
        </div>
    );
}