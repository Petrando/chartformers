import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import { axisBottom, axisLeft, format, max, ScaleBand, scaleBand, scaleLinear, select, Series, stack } from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import { inactiveColor } from '../../../dev/data/constants';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { LayeredData, ExtendedSeriesPoint, ExtendedSeries, StackedBarChartProps } from './types';
import { useUIControls } from '../../hooks/useUIControls';

export function GroupedBarChart({ data, colorIdx = 0, orientation = 'vertical', tooltipFormat }: StackedBarChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();
    const { height: controlsHeight } = controlsSize;
    const [ chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize

    const [prevData, setPrevData] = useState<LayeredData[] | null>(null);
    
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
            className={`${styles[isMediumScreen?"controls-container":"controls-container-sm"]} ${uiControls?styles["fill-container"]:""}`}
        >
            <label className={`${styles["controls-label"]} ${plotted === "all"?styles.disabled:""}`} style={{paddingRight: '12px'}}>
                <input 
                    type="checkbox" 
                    className={`${styles["controls-checkbox"]}`} 
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
        if (width === 0 || height === 0) return;
        if(hovered !== "" && dataJustChanged) return
        
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };          
                    
        chartData.forEach(function(d: LayeredData) {
            d.total = keys.reduce((acc, curr) => {
                if(!(curr in d)){
                    d[curr] = 0
                }
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
            graphHeight = height - margin.top - margin.bottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);

        let isFirstRender = false;
        if(prevData === null){
            isFirstRender = true;
            setPrevData(cloneObj(chartData));
        }

        const noPlot = plotted === "all"

        const xAxisTextClass = (!isMediumScreen && orientation === 'vertical')?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;    
            
        const labels = sortedData.map(function(d: LayeredData) { return d.label; });                
        const labelScale: ScaleBand<string> = scaleBand<string>()
            .domain(labels)
            .rangeRound(orientation === 'vertical'?[0, graphWidth]:[graphHeight, 0])
            .paddingInner(noPlot?0.15:isMediumScreen?0.4:0.25)
            .paddingOuter(0.2)            
            .align(0.2) 

        /*const yMax = plotted === "all"?
                max(chartData, d => max(
                    Object.entries(d)
                    .filter(d => d[0]!=="total" && d[0]!=="label"), d => (d as any)[1])):
                        max(chartData, d=>(d[plotted] as number));*/ 
        const valueMax =
            plotted === "all"
                ? max(chartData, d =>
                    max(
                    Object.entries(d)
                        .filter(([key]) => key !== "total" && key !== "label")
                        .map(([, value]) => value as number)     // value is number | string | undefined
                    )
                )
                : max(chartData, d => d[plotted] as number);
        const valueScale = scaleLinear()
            .domain([0, valueMax ?? 0])
            .range(orientation === 'vertical'?[graphHeight, 0]:[0, graphWidth]);
                                                   
        const xAxis = orientation === 'vertical' 
            ?axisBottom(labelScale)
                .tickValues(labelScale.domain())
                .tickSizeOuter(0):
                axisBottom(valueScale)                
                .ticks(4, "s")
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
                                                                                                
        const yAxis = orientation === 'vertical'
            ? axisLeft(valueScale).ticks(4, "s").tickSize(-graphWidth)
            : axisLeft(labelScale).tickSizeOuter(0);            
                                
        canvas.select<SVGGElement>(".y-axis")  
            .attr("transform", `translate(0,0)`)                     
                .transition().duration(animDuration)
            .call(yAxis)            
            .selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove()

        const dataLayers: Series<LayeredData, string | string[]>[] =
            stack<LayeredData>().keys(keys)(sortedData);        
        
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
            
        const labelScalePos = (d: ExtendedSeriesPoint) => {
            const labelPos = labelScale(d.data.label + "") ?? 0;
            if(plotted === "all"){                                    
                const idx = keys.indexOf(d.barKey) || 0
                return labelPos + (idx * (labelScale.bandwidth()/keys.length))
            }                            
            return labelPos
        }

        const labelScaleBandWidth = () => {
            return plotted === "all"?
                labelScale.bandwidth()/keys.length:labelScale.bandwidth()
        }

        const valueScalePos = (d: ExtendedSeriesPoint) => {
            return orientation === 'vertical'?
                graphHeight - (valueScale(d[0]) - valueScale(d[1])):
                    valueScale(0)
        }

        const valueScaleDimension = (d: ExtendedSeriesPoint) => {
            const rectDimension = orientation === 'vertical'?
                valueScale(d[0]) - valueScale(d[1]):
                    valueScale(d[1]) - valueScale(d[0]);
            return isNaN(rectDimension)?0:rectDimension<0?0:rectDimension;
        }

        const rectXPos = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? labelScalePos(d) : valueScalePos(d)
        }

        const rectWidth = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? labelScaleBandWidth() : valueScaleDimension(d)
        }

        const rectYPos = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? valueScalePos(d) : labelScalePos(d)
        }

        const rectHeight = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? valueScaleDimension(d) : labelScaleBandWidth()
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
                        .attr("x", function(d){
                            if(orientation === 'vertical'){
                                return rectXPos(d)
                            }else{
                                //if(isFirstRender)return graphWidth - (margin.left + margin.right);
                                return 0//graphWidth;
                            }
                        })
                        .attr("width", function(d){
                            if(orientation === 'vertical'){
                                return plotted === "all"?
                                labelScale.bandwidth()/keys.length:labelScale.bandwidth()
                            }else{
                                return 0
                            }
                            
                        }) 
                        .attr("y", function(d){
                            if(orientation === 'vertical'){                                
                                return graphHeight;
                            }else{
                                return rectYPos(d)
                            }
                            
                        })
                        .attr("height", function(d){
                            if(orientation === 'vertical'){
                                return 0
                            }else{
                                return plotted === "all"?
                                labelScale.bandwidth()/keys.length:labelScale.bandwidth()
                            }
                        })
                            .transition().duration(animDuration)//.delay(animDuration)
                            .attr("x", rectXPos)
                            .attr("width", rectWidth)                        
                            .attr("height", rectHeight)
                            .attr("y", rectYPos)
                                            
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
            .transition().duration(animDuration)//.delay(isFirstRender?animDuration:0)
                .attr("x", rectXPos)
                .attr("width", rectWidth)                        
                .attr("height", rectHeight)
                .attr("y", rectYPos);

        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .on("mouseover", function(e, d){
                    //unhoverLegend()
                    
                    select(orientation === "vertical"?".x-axis":".y-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label).attr("class", (orientation === "vertical"?xAxisTextClass:"") + " " + stackedBarStyles.hoveredAxisText)

                    tooltip.style("opacity", 1)
                        .select("p.title").text(d.data.label)
                    
                    const value = d.data[d.barKey]
                    const {total} = d.data
                    const percentage = (value as number/total!) * 100
                    const percentText = format(".1f")(percentage) + "%"
                    tooltip.select("p.top-label").text(d.barKey + " : " + basicFormat(value as number, tooltipFormat))
                    tooltip.select("p.bottom-label").text(
                        plotted === "all"?`Total : ${basicFormat(total!, tooltipFormat)}`:"~"
                    )
                })
                .on("touch", function(e, d){
                    //unhoverLegend()
                    select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label).attr("class", xAxisTextClass)
                })
                .on("mousemove", (e, d)=>{
                    moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: valueScale})
                })
                .on("mouseout", function(e, d){
                    select(orientation === "vertical"?".x-axis":".y-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        .attr("class", orientation === "vertical"?xAxisTextClass:"")

                    tooltip.style("opacity", 0);
                })
            
                         

    }, [ ...renderDeps, isSorted, chartData, keys, hovered, justPlotted, orientation, dataJustChanged, tooltipFormat ]);
    
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
                    {
                        width > 0 &&
                        <g className="plot-area">
                            <g className="plot-rects" />
                            <g className={`${orientation === 'vertical'?stackedBarStyles["value-axis"]:""} y-axis`} />
                            <g className={`${orientation === 'horizontal'?stackedBarStyles["value-axis"]:""} x-axis`} />  
                        </g>        
                    }                                        
                </svg>
                <Tooltip pCount={3} />
                </div>
            </div>
        </div>
    );
}