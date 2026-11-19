import React, {useState, useEffect } from 'react';
import { 
    type Selection, type Series, 
    axisBottom, axisLeft, format, max, scaleBand, scaleLinear, stack, stackOffsetExpand, 
    stackOffsetNone, stackOrderNone, 
} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { useUIControls } from '../../hooks/useUIControls';
import { positionTooltip, Tooltip } from './tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import { inactiveColor } from '../../../dev/data/constants';
import { defaultMargin, defaultLabelAxis, defaultValueAxis } from './constants';
import { WarningModal } from './negative-data-warning';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { 
    type LayeredData, type ExtendedSeries, type ExtendedSeriesPoint, 
    type StackedBarChartProps 
} from './types';

export function PercentStackedBarChart({ 
    data, colorIdx = 0, orientation = 'vertical', 
    tooltipFormat: {
        prefix = "", suffix = "", formatType = "long"
    } = { prefix: "", suffix: "", formatType: "long"},
    margin, labelAxis, valueAxis
}: StackedBarChartProps
) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width: parentWidth, height: parentHeight } = parentSize;    
    
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();
    const { height: controlsHeight } = controlsSize;        
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize    
     
    const [ isPercentage, setIsPercentage ] = useState<boolean>(true);    
    const [plotted, setPlotted] = useState<string[]>(["all"]);
    
    const uiControls = useUIControls();
    
    const stackData = data
    useEffect(() => {
        setPlotted(["all"])
        setIsPercentage(true)        
    }, [stackData])
        
    const animDuration = 750;    

    const chartHeight = uiControls ? height : height  - controlsHeight;
    
    const renderDeps = [ width, height, plotted, colorIdx, margin, labelAxis, valueAxis ]

    const chartData:LayeredData[] = cloneObj(stackData);                        
    const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];
    
    const layers = useLayerIndex(keys)
    const isMediumScreen = width > 576;        
    
    const tooltipFormat = { prefix, suffix, formatType }
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;                                 
        
        const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];

        const selectedKeys = keys.filter(k => !plotted.includes(k))
        
        chartData.forEach(function(d: LayeredData) {
            d.total = selectedKeys.reduce((acc, curr) => {
                if(!(curr in d)){
                    d[curr] = 0
                }
                const value = d[curr];
                return acc + (typeof value === 'number' ? value : Number(value));
            }, 0);
        });  
                        
        const filteredData = chartData.filter((d: LayeredData) => {
            //return plotted === "all" ? (d?.total && d.total > 0) : (d[plotted as keyof LayeredData] as number) > 0;                
            return (d?.total && d.total > 0)
        });

        const sortedData:LayeredData[] = filteredData

        const marginLeft = margin?.left??defaultMargin.left 
        const marginRight = margin?.right ?? defaultMargin.right
        const marginTop = margin?.top ?? defaultMargin.top
        const marginBottom = margin?.bottom ?? defaultMargin.bottom

        const graphWidth = width - marginLeft - marginRight,
            graphHeight = height - marginTop - marginBottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + marginLeft + "," + marginTop + ")");

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")

        const legendWidth = isMediumScreen?80:50

        const fillByKey = (key: string) => {
            const layerIndex = layers.current.findIndex(l => l === key) + colorIdx
            return indexColor(layerIndex);
        }
        function layerFill(d: ExtendedSeries) {            
            return fillByKey(d.key); 
        }

        const legendClass = function(d:string){
            const containerClass = stackedBarStyles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = stackedBarStyles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]
            const containerInactiveClass = stackedBarStyles[isMediumScreen?"legend-container-inactive":"legend-container-inactive-sm"]
            return  `
                ${plotted.includes(d)?containerInactiveClass:containerClass}
                legend-item
            `            
        }

        const legends = legendsContainer.selectAll<HTMLDivElement, string>(".legend-item")
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
                            if(plotted.includes(d)){
                                return inactiveColor
                            }
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
                            if(plotted.includes(d)){
                                return inactiveColor
                            }
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
            .on("pointerenter", (e, d)=>{
                canvas.selectAll<SVGGElement, ExtendedSeries>(".serie")
                    .attr("fill", layerFill)
                    .filter(dSerie => dSerie.key === d)                                                            
                    .style("opacity", 0.25)
                
            })
            .on("pointerleave", function(e, d){                
                canvas.selectAll<SVGGElement, ExtendedSeries>(".serie")
                    .attr("fill", layerFill)
                    .filter(dSerie => dSerie.key === d)                                                            
                    .style("opacity", 1)
            })
            .on("click", function(e, d){
                setPlotted(prev=>{
                    let newPlot:string[] = []
                    if(prev.includes(d)){
                        newPlot = prev.filter(p => p !== d)                           
                    }else{
                        newPlot = [...prev, d]                           
                    }
                    return newPlot
                })
            })

        const tooltip = container.select("div#tooltip")
            .style("opacity", 0);        

        const xAxisTextClass = (!isMediumScreen && orientation === 'vertical')?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;

        const paddingInner = labelAxis?.paddingInner ?? (isMediumScreen?0.4:0.25)
        const paddingOuter = labelAxis?.paddingOuter ?? defaultLabelAxis.paddingOuter
        const labelAxisAlign = labelAxis?.align ?? defaultLabelAxis.align
        const labelAxisTickSizeInner = labelAxis?.tickSizeInner ?? defaultLabelAxis.tickSizeInner
        const displayLabelAxisGrid = labelAxis?.displayGrid ?? defaultLabelAxis.displayGrid
        const labelAxisTickPadding = labelAxis?.tickPadding ?? defaultLabelAxis.tickPadding

        const labels = sortedData.map(function(d: LayeredData) { return d.label; });
        const labelScale = scaleBand<string | number>()
            .domain(labels)
            .rangeRound(orientation === 'vertical'?[0, graphWidth]:[graphHeight, 0])
            .paddingInner(paddingInner)
            .paddingOuter(paddingOuter)            
            .align(labelAxisAlign)

        const valueMax = max(chartData, (d: LayeredData) => d.total)                                                                   
        const valueScale = scaleLinear()
            .domain([0, isPercentage?1:valueMax || 0]).nice()
            .range(orientation === 'vertical'?[graphHeight, 0]:[0, graphWidth]);            

        const prevXLabels: string[] = [];

        const valueAxisTicks = valueAxis?.ticks ?? defaultValueAxis.ticks
        const valueAxisTickSizeInner = valueAxis?.tickSizeInner ?? defaultValueAxis.tickSizeInner
        const displayValueAxisGrid = valueAxis?.displayGrid ?? defaultValueAxis.displayGrid
        const valueAxisTickPadding = valueAxis?.tickPadding ?? defaultValueAxis.tickPadding
        
        const xAxis = orientation === 'vertical' 
            ?axisBottom(labelScale)
                .tickValues(labelScale.domain())
                .tickSizeOuter(0)
                .tickSizeInner(displayLabelAxisGrid?-graphHeight:labelAxisTickSizeInner)                                
                .tickPadding(labelAxisTickPadding):
            axisBottom(valueScale)                
                .ticks(valueAxisTicks, isPercentage?".0%":"s")
                .tickSizeOuter(0)
                .tickSizeInner(displayValueAxisGrid?-graphHeight:valueAxisTickSizeInner)
                .tickPadding(valueAxisTickPadding);

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0,${graphHeight})`)
            .transition().duration(animDuration)
            .call(xAxis)
            .selectAll("text")
            .style("cursor", "pointer")
            .attr("dy", !isMediumScreen ? "1em" : ".6em")
            .attr("dx", !isMediumScreen ? "-.8em" : "0em")
            .attr("class", xAxisTextClass)
            .select<SVGGElement>(".x-axis")
            /*.selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove();*/

        canvas.select<SVGGElement>(".x-axis") 
            .selectAll("path")
            .style("display", "none")

        const yMax = max(chartData, (d: LayeredData) => d.total)                                                                   

        const y = scaleLinear()
            .domain([0, isPercentage?1:yMax || 0]).nice()
            .range([graphHeight, 0]);                                        
            
        const yAxis = orientation === 'vertical'
            ? axisLeft(valueScale)
                .ticks(valueAxisTicks, isPercentage?".0%":"s")
                .tickSizeOuter(0)
                .tickSizeInner(displayValueAxisGrid?-graphWidth:valueAxisTickSizeInner)
                .tickPadding(valueAxisTickPadding)
            : axisLeft(labelScale)
                .tickSizeOuter(0)
                .tickSizeInner(displayLabelAxisGrid?-graphWidth:labelAxisTickSizeInner)
                .tickPadding(labelAxisTickPadding);            
                                
        canvas.select<SVGGElement>(".y-axis")  
            .attr("transform", `translate(0,0)`)                      
                .transition().duration(animDuration)
            .call(yAxis)
            /*.selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove()*/        

        const dataLayers: Series<LayeredData, string>[] = stack<LayeredData>()        
            .keys(selectedKeys)
            .order(stackOrderNone)
            .offset(isPercentage?stackOffsetExpand:stackOffsetNone)(sortedData);

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
                        .attr("fill", layerFill)
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
                        .attr("fill", layerFill)
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
            const dimension = orientation === 'vertical'?
                valueScale(d[0]) - valueScale(d[1]):
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
            const rectStrokeWidth = rectWidth(d);            
            const rectStrokeHeight = rectHeight(d);    
            
            const isTopLayer = selectedKeys.indexOf(d.barKey) === selectedKeys.length - 1
                || d.barKey === plotted[0]

            const isBottomLayer = selectedKeys.indexOf(d.barKey) === 0

            if(isTopLayer && isBottomLayer){
                return "none"
            }
            if(isTopLayer){
                if(orientation === 'vertical'){
                    return `${rectStrokeWidth + rectStrokeHeight} ${rectStrokeWidth} ${rectStrokeHeight}`
                }else{
                    return `${rectStrokeWidth + rectStrokeHeight + rectStrokeWidth}`;
                }
            }
            if(isBottomLayer){
                if(orientation === 'vertical'){
                    return `${rectStrokeHeight + rectStrokeWidth + rectStrokeHeight} ${rectStrokeWidth}`
                }else {
                    return `${rectStrokeWidth} ${rectStrokeHeight} ${rectStrokeWidth + rectStrokeHeight}`
                }
            } 

            return orientation === 'vertical'?
                `${rectStrokeHeight} ${rectStrokeWidth}`:
                    `${rectStrokeWidth} ${rectStrokeHeight}`
        }

        function strokeDashoffset(d: ExtendedSeriesPoint){
            const rectStrokeWidth = rectWidth(d);            
            const isTopLayer =
                selectedKeys.indexOf(d.barKey) === selectedKeys.length - 1;

            if(orientation === 'vertical'){
                return isTopLayer ? 0 : rectStrokeWidth * -1;
            }
            return 0
        }

        const updateRectClass = (d:ExtendedSeriesPoint) => {                
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
                                return labelScale(d.data.label) ?? 0;
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
                .on("mouseover touchstart", pointerenter)
                .on("mousemove", (e, d)=>{
                    positionChartTooltip(d)
                })
                .on("mouseleave", function(e, d){
                    canvas.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.name).attr("class", xAxisTextClass)

                    tooltip.style("opacity", 0);
                })

        function positionChartTooltip(d: ExtendedSeriesPoint){
            const verticalBbox = {
                x: labelScalePos(d), y: valueScalePos(d),
                width: labelScaleBandWidth, height: valueScaleDimension(d)
            }                                        
            positionTooltip(
                tooltip as unknown as Selection<SVGAElement | HTMLDivElement, any, any, any>, 
                orientation, "stacked",
                { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom },
                verticalBbox,
                {
                    x: valueScalePos(d), y: labelScalePos(d), 
                    width: valueScaleDimension(d), height: labelScale.bandwidth() 
                }
            )
        }

        function pointerenter(e: MouseEvent | TouchEvent, d: ExtendedSeriesPoint){
                                
            canvas.select(".x-axis").selectAll("text")
                .filter(dText=>dText === d.data.name).attr("class", xAxisTextClass + " " + styles.hoveredAxisText)            

            positionChartTooltip(d)
            
            const value:number = d.data[d.barKey] as number || 0
            const total = d.data.total || 0
            const percentage = (value/total) * 100
            const percentText = format(".1f")(percentage) + "%"                    

            tooltip.select("p.label").text(d.data.label)
            tooltip.select("p.layer span.label span.chev").style("background", fillByKey(d.barKey))
            tooltip.select("p.layer span.label span.label").text(d.barKey)
            tooltip.select("p.layer span.value").text(percentText)                    
            tooltip.select("p.total span.value")
                .text(`(${basicFormat(value, tooltipFormat)} of ${basicFormat(total, tooltipFormat)})`)
            
        }

    }, [ ...renderDeps, chartData, isPercentage, orientation, tooltipFormat ]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column',
                position: "relative"
             }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column"}}>

                <div 
                    ref={controlsRef}
                    className={`controls ${styles["controls-container"]}`}
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
                        className={`legends-container ${stackedBarStyles["legends-container"]}`}
                    />
                </div>
                <div
                    ref={chartContainerRef} 
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column", position: "relative", 
                    }}>
                    <svg
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        <g className="plot-area">
                            <g className="plot-rects" />
                            <g className={`${
                                orientation === 'vertical'?
                                stackedBarStyles["value-axis"]:
                                stackedBarStyles["label-axis"]} y-axis
                            `} />
                            <g className={`
                                ${orientation === 'horizontal'?
                                stackedBarStyles["value-axis"]:
                                stackedBarStyles["label-axis"]} x-axis`
                            } />    
                        </g>                        
                    </svg>
                    <Tooltip totalLabel='' />                    
                </div>
            </div>
            <WarningModal data={data} canShow={isPercentage} 
                width={parentWidth} height={parentHeight - controlsHeight} top={controlsHeight}/>            
        </div>
    );
}