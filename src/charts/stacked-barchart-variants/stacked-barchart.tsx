import React, {useState, useEffect, useRef} from 'react';
import { 
    axisBottom, axisLeft, min, max, scaleBand, scaleLinear, stack, stackOffsetDiverging, 
    color as D3Color,
    type ScaleBand, type ScaleLinear, type Series, type SeriesPoint, type Selection,
    select
} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { positionTooltip, Tooltip } from './tooltip';
import { cloneObj, indexColor, formatTooltipNum, rotateLabels } from '../../utils';
import { inactiveColor } from '../../../dev/data/constants';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { defaultMargin, defaultLabelAxis, defaultValueAxis, obscureOpacity } from './constants';
import { 
    type LayeredData, type ExtendedSeries, type ExtendedSeriesPoint, type StackedBarChartProps, 
    type  stackOrderByCategory } from './types';
import { useUIControls } from '../../hooks/useUIControls';
import { zeroLineStroke } from '../constants';
import { HoverShade, positionHoverShade } from './hover-shade';

type StackedBarChartPropsExtended =
    StackedBarChartProps & {
        focusOnPlot?: boolean;
};

export function StackedBarChart({ 
    data, focusOnPlot = false, colorIdx = 0, orientation = 'vertical', 
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"},
        margin, labelAxis, valueAxis,
    }
    : StackedBarChartPropsExtended
) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();        
    const { height: controlsHeight } = controlsSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize    
    const [prevData, setPrevData] = useState<LayeredData[] | null>(null);
            
    const [plotted, setPlotted] = useState<string[]>(["all"]);    
    const [isSorted, setIsSorted] = useState<boolean>(false);

    const isAnimating = useRef(false)
    
    const uiControls = useUIControls(); 
    
    const stackData = data        
    useEffect(() => {
        setPlotted(["all"])                
    }, [stackData])    

    useEffect(() => {setPlotted(["all"])}, [focusOnPlot])

    const animDuration = 750;          

    const renderDeps = [ width, height, plotted, colorIdx, focusOnPlot ]

    const chartData:LayeredData[] = cloneObj(stackData);                        
    const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];
    const layersRef = useLayerIndex(keys)
    
    const isMediumScreen = width > 576;
    
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;        
                                
        const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];
        const selectedKeys = focusOnPlot?keys:keys.filter(k => !plotted.includes(k))
                
        chartData.forEach((row, i) => {
            const totals = selectedKeys.reduce((sum, key) => {
                if(!(key in row)){
                    row[key] = 0
                } 
                const baseValue = row[key];
                const value = (typeof baseValue === "number" ? baseValue : 0)
                const newTotal = sum.total + value
                const newTotalPos = sum.totalPos + (value >= 0?value:0)
                const newTotalMin = sum.totalMin + (value < 0?value:0)
                return {total: newTotal, totalPos: newTotalPos, totalMin: newTotalMin};
            }, {total: 0, totalPos: 0, totalMin: 0});
            row.total = totals.total;
            row.totalPos = totals.totalPos
            row.totalMin = totals.totalMin
        });
        
        const filteredData = chartData/*.filter((d: LayeredData) => {
            return plotted === "all" ? (d?.total && d.total > 0) : (d[plotted as keyof LayeredData] as number) > 0;                
        });*/

        const sortedData = isSorted?
            cloneObj(filteredData).sort(function(a:LayeredData, b:LayeredData){
                if(!focusOnPlot){
                    return a.total! - b.total!
                }else{
                    if(plotted[0] === "all"){
                        return a.total! - b.total!
                    }

                    return Number(a[plotted[0]]!) - Number(b[plotted[0]]!)
                }
                
            }):filteredData
                
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
        
        const legendClass = function(d:string){
            const containerClass = stackedBarStyles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = stackedBarStyles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]
            const containerInactiveClass = stackedBarStyles[isMediumScreen?"legend-container-inactive":"legend-container-inactive-sm"]
            return  `
                ${plotted.includes(d)?
                    focusOnPlot?containerActiveClass:containerInactiveClass:
                        containerClass}
                legend-item
            `            
        }

        const fillByKey = (key: string) => {
            const layerIndex = layersRef.current.findIndex(l => l === key) + colorIdx
            const color = indexColor(layerIndex)
            
            return color
        }
        function layerFill(d:ExtendedSeries){                        
            return fillByKey(d.key)
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
                        .style("opacity", 0)
                                                                                                                           
                    divs.append("div")
                        .attr("class", stackedBarStyles["legend-rect"])
                        .style("background", (d) => {
                            if(!focusOnPlot && plotted.includes(d)){
                                return inactiveColor
                            }
                            const layerIndex = layersRef.current.findIndex(l => l === d) + colorIdx
                            return indexColor(layerIndex);
                        })
                    divs.append("span")
                        .attr("class", stackedBarStyles["legend-label"])
                        .style("color", (d)=>{
                            if(!focusOnPlot && plotted.includes(d)){
                                return "#d1d5db"
                            }
                            return "#333"
                        })
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
                            if(!focusOnPlot && plotted.includes(d)){
                                return inactiveColor
                            }
                            const layerIndex = layersRef.current.findIndex(l => l === d) + colorIdx
                            return indexColor(layerIndex);
                        });

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`.${stackedBarStyles["legend-label"]}`)
                        .style("color", (d)=>{
                            if(!focusOnPlot && plotted.includes(d)){
                                return inactiveColor
                            }
                            return "#333"
                        })
                        .text(d => d);                            

                    return update;
                },
                exit => exit
                    .style("color", inactiveColor)
                    .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("top", "53px")
                    .remove()
            )
            .on("pointerenter", function(e, d){
                if(isAnimating.current) return                
                if(plotted[0] === "all"){
                    const serie = canvas.selectAll<SVGGElement, ExtendedSeries>(".serie")
                    if(focusOnPlot){
                        serie
                            .attr("fill", layerFill)
                            .filter(dSerie => dSerie.key !== d)                                                            
                            .style("opacity", obscureOpacity)

                        const rects = serie
                            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                            .filter(dRect => dRect.barKey === d)
                            .attr("stroke-dasharray", "none")
                    }else{
                        serie                        
                            .attr("fill", layerFill)
                            .filter(dSerie => dSerie.key === d)                                                            
                            .style("opacity", obscureOpacity)                        
                    }   
                }                       
            })
            .on("pointerleave", function(e, d){
                if(isAnimating.current) return
                const serie = canvas.selectAll<SVGGElement, ExtendedSeries>(".serie")                
                if(plotted[0] === "all"){
                    serie
                        .attr("fill", layerFill)                                                
                    .style("opacity", 1)                                        
                }

                const rects = serie
                    .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                    .attr("stroke-dasharray", strokeDasharray)
                                                                    
            })
            .on("click", (e, d)=>{
                setPlotted(prev=>{
                    let newPlot:string[] = []
                    if(focusOnPlot){
                        if(prev[0] === d){
                            newPlot = ["all"]
                        }else{
                            newPlot = [d]
                        }
                    }else{
                        if(prev.includes(d)){
                            newPlot = prev.filter(p => p !== d)                           
                        }else{
                            newPlot = [...prev, d]                           
                        }
                    }
                    return newPlot
                })                
            })         

        const tooltip = container.select("div#tooltip")
            .style("opacity", 0);

        let isFirstRender = false;
        if(prevData === null){
            isFirstRender = true;
            setPrevData(cloneObj(chartData));
        }                       

        const paddingInner = labelAxis?.paddingInner ?? (isMediumScreen?0.3:0.2)
        const paddingOuter = labelAxis?.paddingOuter ?? defaultLabelAxis.paddingOuter
        const labelAxisAlign = labelAxis?.align ?? defaultLabelAxis.align        
        const displayLabelAxisGrid = labelAxis?.displayGrid ?? defaultLabelAxis.displayGrid
        const labelAxisTickSizeInner = labelAxis?.tickSizeInner ?? defaultLabelAxis.tickSizeInner
        const labelAxisTickPadding = labelAxis?.tickPadding ?? defaultLabelAxis.tickPadding
        
        const labels = sortedData.map(function(d: LayeredData) { return d.label; });
        const labelScale: ScaleBand<string> = scaleBand<string>()
            .domain(labels)
            .rangeRound(orientation === 'vertical'?[0, graphWidth]:[graphHeight, 0])
            .paddingInner(paddingInner)
            .paddingOuter(paddingOuter)            
            .align(labelAxisAlign)

        const baseValueMax = focusOnPlot?(
            plotted[0] === "all"?
                max(chartData, (d: LayeredData) => d.totalPos):
                    max(chartData, (d: LayeredData) => (d[plotted[0]] as number))):
                max(chartData, (d: LayeredData) => d.totalPos);                        
        const valueMax = Math.max(0, baseValueMax ?? 0)
                
        const baseValueMin = focusOnPlot?(plotted[0] === "all"?
                min(chartData, (d: LayeredData) => d.totalMin):
                    min(chartData, (d: LayeredData) => (d[plotted[0]] as number))):
                min(chartData, (d: LayeredData) => d.totalMin);

        const valueMin = Math.min(0, baseValueMin ?? 0)        
        
        const valueScale: ScaleLinear<number, number> = scaleLinear()
            .domain([valueMin, valueMax])
            .range(orientation === 'vertical'?[graphHeight, 0]:[0, graphWidth])
            .nice();
            
        const rotateXLabels = rotateLabels(graphWidth, labels)
        const xAxisTextClass = (rotateXLabels && orientation === 'vertical')?
            stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;
                                            
        const prevXLabels: string[] = [];
        
        const valueAxisTicks = valueAxis?.ticks ?? defaultValueAxis.ticks
        const displayValueAxisGrid = valueAxis?.displayGrid ?? defaultValueAxis.displayGrid
        const valueAxisTickSizeInner = valueAxis?.tickSizeInner ?? defaultValueAxis.tickSizeInner
        const valueAxisTickPadding = valueAxis?.tickPadding ?? defaultValueAxis.tickPadding
        
        const xAxis = orientation === 'vertical' 
            ?axisBottom(labelScale)
                .tickValues(labelScale.domain())                                
                .tickSizeOuter(0)                                
                .tickSizeInner(displayLabelAxisGrid?-graphHeight:labelAxisTickSizeInner)                                
                .tickPadding(labelAxisTickPadding)
            :
             axisBottom(valueScale)                
                .ticks(valueAxisTicks, "s")
                .tickSizeOuter(0)                
                .tickSizeInner(displayValueAxisGrid?-graphHeight:valueAxisTickSizeInner)
                .tickPadding(valueAxisTickPadding);
            
        canvas.select<SVGGElement>(".x-axis")                        
            .attr("transform", `translate(0,${graphHeight})`)
            .transition().duration(animDuration)
            .call(xAxis) 
            .selectAll("text")
            .style("cursor", "pointer")
            .attr("dy", !isMediumScreen?"1em":".6em")
            .attr("dx", !isMediumScreen ? "-.8em" : "0em")
            .attr("class", xAxisTextClass)
            .select<SVGGElement>(".x-axis")
            /*.selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove()*/
            
        canvas.select<SVGGElement>(".x-axis") 
            .selectAll("path")
            .style("display", "none")            
        
        const yAxis = orientation === 'vertical'
            ? axisLeft(valueScale)
                .ticks(valueAxisTicks, "s")
                .tickSizeOuter(0)
                .tickSizeInner(displayValueAxisGrid?-graphWidth:valueAxisTickSizeInner)
                .tickPadding(valueAxisTickPadding)
            : axisLeft(labelScale)
                .tickSizeOuter(0)
                .tickSizeInner(displayLabelAxisGrid?-graphWidth:labelAxisTickSizeInner)
                .tickPadding(labelAxisTickPadding)
                                        
        canvas.select<SVGGElement>(".y-axis")            
            .attr("transform", `translate(0,0)`)               
                .transition().duration(animDuration)
            .call(yAxis)
            /*.selectAll(".tick")
            .filter(d => d === 0)
            .select("line")
            .remove()*/
            
        /*canvas.select<SVGGElement>(".y-axis") 
            .selectAll("path")
            .style("display", "none")*/

        const zeroLine = canvas.select("line.zero-line")
            .attr("x1", 0)
            .attr("y1", orientation === "vertical"?graphHeight:0)
            .attr("x2", orientation === "vertical"?graphWidth:0)
            .attr("y2", graphHeight)
                .transition().duration(animDuration)
            .style("opacity", valueMin === 0?0:1)
            .attr("transform", 
                orientation === "vertical"?
                `translate(0, ${(valueScale(0) || 0) - graphHeight})`:
                `translate(${valueScale(0) || 0}, 0)`
            )            

        const dataLayers: Series<LayeredData, string>[] =
            stack<LayeredData>()            
            .keys(selectedKeys)
            .offset(stackOffsetDiverging)
            (cloneObj(sortedData));                     
        
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
                                   
        const serie = canvas
            .selectAll<SVGGElement, ExtendedSeries>(".serie")
            .data(extendedDataLayers, (d: ExtendedSeries) => d.key)
            .join(
                enter => {
                    const g = enter
                        .append("g")
                        .attr("class", "serie")
                        .attr("fill", layerFill)                        
                        .style("opacity", (d) => {
                            if(focusOnPlot){
                                if (plotted[0] === "all") return 1;
                                return d.key === plotted[0] ? 1 : 0;
                            }
                            return 1
                        })
                        .style("pointer-events", (d) => {
                            if(focusOnPlot){
                                if (plotted[0] === "all") return "auto";
                                return d.key === plotted[0] ? "auto" : "none";
                            }
                            return "auto"                            
                        });

                    return g;
                },
                update => {
                    const g = update
                        .transition()
                        .duration(animDuration)
                        .attr("fill", (d) => {
                            const layerIndex = layersRef.current.findIndex(l => l === d.key) + colorIdx
                            const color = indexColor(layerIndex)
                            
                            return color
                        })
                        .style("opacity", (d) => {
                            if(focusOnPlot){
                                if (plotted[0] === "all") return 1;
                                return d.key === plotted[0] ? 1 : 0;
                            }
                            return 1
                        })                                            
                        .style("pointer-events", (d) => {
                            if(focusOnPlot){
                                if (plotted[0] === "all") return "auto";
                                return d.key === plotted[0] ? "auto" : "none";
                            }
                            return "auto"
                        });

                    return g;
                },
                exit => exit                                        
                    .transition().duration(animDuration)
                    .attr("fill", inactiveColor)
                    .style("opacity", 0)                    
                    .selectAll<SVGRectElement, SeriesPoint<LayeredData>>("rect")
                    .attr("y", graphHeight)
                    .attr("height", 0)
                    .remove()
            );
        
        const labelScalePos = (d: ExtendedSeriesPoint) => {             
            return labelScale(d.data.label + "") ?? 0
        }

        const labelScaleBandWidth = labelScale.bandwidth()

        /*
            if !singleLayerActive, use stacked bar chart positioning and dimensioning system
            otherwise, if singleLayerActive, use the grouped bar chart version
            CONSIDER TO REFACTOR IN THE FUTURE!
        */
        const singleLayerActive = (focusOnPlot && plotted[0] !== "all") || selectedKeys.length === 1        

        const valueScalePos = (d: ExtendedSeriesPoint) => {
            if(!singleLayerActive){
                const orientationDimension = orientation === 'vertical'?graphHeight:graphWidth
                //if(isFirstRender) return 0
                
                return plotted[0] === "all"
                    ? valueScale(orientation === 'vertical'?d[1]:d[0])
                    :  (focusOnPlot && orientation !== 'vertical')?
                        valueScale(0):
                        (orientationDimension - (valueScale(d[0]) - valueScale(d[1])))
            } else {
                const value = Number(d.data[d.barKey])
            
                return orientation === 'vertical'?
                    value >= 0 ? valueScale(value) : valueScale(0):
                        value >= 0 ? valueScale(0) : valueScale(value)
            }                               
        }

        const valueScaleDimension = (d: ExtendedSeriesPoint) => {
            if(!singleLayerActive){
                const dimension = orientation === 'vertical'?
                    valueScale(d[0]) - valueScale(d[1]):
                    valueScale(d[1]) - valueScale(d[0])
            
                return isNaN(dimension) ? 0 : dimension < 0?0:dimension;
            }else {
                const value = Number(d.data[d.barKey])
                const rectDimension = Math.abs(valueScale(value) - valueScale(0));
                return isNaN(rectDimension)?0:rectDimension<0?0:rectDimension;
            }
            
            //return Math.abs(valueScale(d[0] - valueScale(d[1])))
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

        const rectHeight = (d: ExtendedSeriesPoint):number => {            
            return orientation === 'vertical' ? valueScaleDimension(d) : labelScaleBandWidth
        }

        const stackOrderByCategory:stackOrderByCategory[] = sortedData.map((row: LayeredData, index: number) => {

            const layers = extendedDataLayers.map(layer => ({
                key: layer.key,
                start: layer[index][0],
                end: layer[index][1],
                value: row[layer.key]
            }));

            const positiveLayers = layers
                .filter(d => d.value ?? 0 > 0)
                .sort((a,b) => b.end - a.end);

            const negativeLayers = layers
                .filter(d => d.value ?? 0 < 0)
                .sort((a,b) => a.start - b.start);

            return {
                label: row.label,

                top: positiveLayers.length > 0?
                    positiveLayers[0]?.key:
                    negativeLayers[negativeLayers.length - 1]?.key,

                bottom: negativeLayers.length > 0?
                    negativeLayers[0]?.key:
                    positiveLayers[positiveLayers.length - 1]?.key
            };

        });
        
        const strokeDasharray = (d: ExtendedSeriesPoint, i: number): string => {
            /*if(d.barKey === hovered){
                return "none"
            }*/
                                  
            const rectStrokeWidth = rectWidth(d);            
            const rectStrokeHeight = rectHeight(d);    
           
            const rectStackOrder = stackOrderByCategory.find(dStack => dStack.label === d.data.label)
            const rectValue = d.data[d.barKey]
            const isTopLayer = rectStackOrder?.top === d.barKey && Number(rectValue) > 0
            const isBottomLayer = rectStackOrder?.bottom === d.barKey// && Number(rectValue) <= 0
            
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
        };

        const strokeDashoffset = (d: ExtendedSeriesPoint): number => {
            const rectStrokeWidth = rectWidth(d);            
            const rectStackOrder = stackOrderByCategory.find(dStack => dStack.label === d.data.label)
            const rectValue = d.data[d.barKey]
            const isTopLayer = rectStackOrder?.top === d.barKey && Number(rectValue) >= 0
            const isBottomLayer = rectStackOrder?.bottom === d.barKey && Number(rectValue) < 0

            if(isBottomLayer){
                return orientation === 'vertical'? rectStrokeWidth * -1 : 0
            }

            if(orientation === 'vertical'){
                return isTopLayer ? 0 : rectStrokeWidth * -1;
            }
            return 0
            
        };

        const updateRectClass = (d: ExtendedSeriesPoint) => {            
            /*if(hovered !== "" && hovered === d.barKey && focusOnPlot){                
                return `rect ${stackedBarStyles.rectLegendHovered}`
            }*/
            return `rect ${stackedBarStyles.rect}`
        }       
        
        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
            .data(
                (d) => d, // each group binds its stacked points
                (d) => d.data.label // unique key per bar
            )
            .join(
                enter => {
                    const theBars = enter
                        .append("rect")
                        .attr("class", `rect ${styles.rect}`)
                        .attr("x", function(d){
                            if(orientation === 'vertical'){
                                return rectXPos(d)
                            }else{
                                return valueScale(0)
                            }
                        })
                        .attr("width", function(d){
                            if(orientation === 'vertical'){
                                return rectWidth(d)
                            }else{
                                return 0
                            }
                        })
                        .attr("y", (d) => {
                            if(orientation === 'vertical'){
                                return valueScale(0)
                                /*if (!prevXLabels.includes(d.data.label)) {                                    
                                    return graphHeight//valueScale(0)
                                };

                                const yFinal =
                                    plotted[0] === "all"
                                    ? valueScale(d[1])
                                    : d.key.startsWith(plotted[0])
                                    ? graphHeight - (valueScale(d[0]) - valueScale(d[1]))
                                    : valueScale(d[1]);

                                const rectHeight = valueScale(d[0]) - valueScale(d[1]);
                                const height = isNaN(rectHeight) ? 0 : rectHeight < 0 ? 0 : rectHeight;
                                const yPos = yFinal + height;

                                if(isFirstRender) return  graphHeight// - (margin.bottom + margin.top);
                                return yPos;*/

                            }
                            else{
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
                            
                    theBars.transition()
                            .duration(animDuration)
                        .attr("x", rectXPos)
                        .attr("width", rectWidth)
                        .attr("height", rectHeight)
                        .attr("y", rectYPos)                        

                    return theBars;
                },
                undefined, // no custom update handler
                exit =>
                    exit
                        .transition().duration(animDuration)
                        .attr("opacity", 0)                        
                        .attr("y", graphHeight)
                        .attr("height", 0)
                        .remove()
            )
                .attr("class", updateRectClass)
                .attr("stroke-dasharray", strokeDasharray)
                .attr("stroke-dashoffset", strokeDashoffset)
            .transition().duration(animDuration)                
                .attr("x", rectXPos)
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("y", rectYPos)
                .on("start", function(){
                    if(!isAnimating.current){
                        isAnimating.current = true
                    }
                })
                .on("end", function(){
                    if(isAnimating.current){
                        isAnimating.current = false
                    }
                });

        const tooltipFormat = {prefix, suffix, formatType}
        const hoverShade = canvasSvg.select("rect#hoverShade")            
            .style("opacity", 0)
                
        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .on("mouseover touchstart", function(e, d){
                    const bBox = select(this).node()?.getBBox()
                    positionHoverShade(hoverShade, bBox, marginLeft, marginTop, isAnimating.current)                                       
                    pointerenter(e, d)
                })                
                .on("mousemove", function(e, d){                                                                               
                    positionChartTooltip(d)
                    const bBox = select(this).node()?.getBBox()
                    positionHoverShade(hoverShade, bBox, marginLeft, marginTop, isAnimating.current)
                })
                .on("mouseleave", function(e, d){
                    canvas.select(orientation === 'vertical'?".x-axis":".y-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        .attr("class", orientation==='vertical'?xAxisTextClass:"")

                    serie.selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                        .filter(dRect => dRect.data.label === d.data.label)
                        .style("stroke-width", 1)

                    tooltip.style("opacity", 0);
                    hoverShade.style("opacity", 0)
                })
        

        function positionChartTooltip(d: ExtendedSeriesPoint, animate: boolean = true){
            positionTooltip(
                tooltip as unknown as Selection<SVGAElement | HTMLDivElement, any, any, any>, 
                orientation, "stacked",
                { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom },
                {
                    x: labelScalePos(d), y: valueScalePos(d),
                    width: labelScaleBandWidth, height: valueScaleDimension(d)
                },
                {
                    x: valueScalePos(d), y: labelScalePos(d), 
                    width: valueScaleDimension(d), height: labelScale.bandwidth() 
                },
                graphHeight
            )
        }

        function pointerenter(e: MouseEvent | TouchEvent, d: ExtendedSeriesPoint){                                   
            serie.selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .filter(dRect => dRect.data.label === d.data.label)
                .style("stroke-width", 2)
            const value = d.data[d.barKey] as number
            const {total} = d.data
            const percentage = (value/total!) * 100
                                
            tooltip.select("p.label").text(d.data.label)
            tooltip.select("p.layer span.label span.chev").style("background", fillByKey(d.barKey))
            tooltip.select("p.layer span.label span.label").text(d.barKey)
            tooltip.select("p.layer span.value").text(formatTooltipNum(value, tooltipFormat))                    
            tooltip.select("p.total span.value").text(formatTooltipNum(total ?? 0, tooltipFormat))
        }

        hoverShade.raise()

    }, [ ...renderDeps, isSorted, chartData, keys, orientation, 
        margin, labelAxis, valueAxis, {prefix, suffix, formatType} ]);
            
    return (
        <div 
            ref={ref} 
            style={{ 
                width: `${parentWidth}px`, 
                height: `${parentHeight}px`, 
                display:'flex', 
                flexDirection:'column' 
            }}
        >                        
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column" }}>
                <div 
                    ref={controlsRef}
                    className={`controls ${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                >
                    <label className={styles["controls-label"]} style={{paddingRight: '12px'}}>
                        <input 
                            type="checkbox" 
                            className={styles["controls-checkbox"]} 
                            checked={isSorted}
                            onChange={(e) => setIsSorted(e.target.checked)}
                        />
                            Sort
                    </label>
                    <div                         
                        className={`legends-container ${stackedBarStyles["legends-container"]}`}
                    />
                </div>
                <div 
                    ref={chartContainerRef}
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column", position: "relative" }}>                                                
                    <svg                              
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        {
                            width > 0 &&
                            <g className="plot-area">
                                <g className="plot-rects" />
                                <g className={`
                                    ${orientation === 'vertical'?
                                        stackedBarStyles["value-axis"]:stackedBarStyles["label-axis"]}                                     
                                        y-axis
                                `} />
                                <g className={`
                                    ${orientation === 'horizontal'?
                                        stackedBarStyles["value-axis"]:stackedBarStyles["label-axis"]} 
                                        x-axis
                                `} />  
                                <line className='zero-line' stroke={zeroLineStroke} strokeWidth={1} />
                            </g>
                        }
                        <HoverShade />
                    </svg>                    
                    <Tooltip />                                    
                </div>
            </div>
            
        </div>
    );
}