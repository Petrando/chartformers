import React, {useEffect, useState} from 'react';
import {select, scaleBand, scaleLinear, axisLeft, axisBottom, axisTop, axisRight,
    max, format, Bin, bin, Selection, 
    thresholdFreedmanDiaconis, thresholdScott, thresholdSturges,
    median, mean, range,
    color
} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexSelectedColor, renderLineChart } from '../../utils';
import { renderHistogramLine } from './utils'
import { inactiveColor } from '../../../dev/data/constants';
import styles from '../global.module.css';
import histogramStyles from './histogram.module.css'
import { lineDecor, tooltipFormat } from '../../types';
import { histogramDatum, histogramChartData, binnedData } from './types'

type sortOption = {
    sortable?: boolean;
    filterEmptyBin?: boolean;
}
type binOption = {
    mode: "arbitrary" | "fixed" | "interval" | "algorithm" | "custom";
    value: number | number[] | "Freedman-Diaconis" | "Scott" | "Sturges";
    compareConsolidate?: boolean;
}
type HistogramProps = {
    data: histogramChartData<histogramDatum>;
    compareMode?: "default" | "compare";
    binOption?: binOption;
    sortOption?: sortOption;    
    orientation?: 'horizontal' | 'vertical';
    tooltipFormat?: tooltipFormat;
    lineProps?: lineDecor;
}

type legendRange = "positive" | "negative"
type HistogramLegend = legendRange[] & { title: string; };

export function Histogram({
        data, 
        compareMode = "default",
        binOption = {
            mode: "algorithm", value: "Freedman-Diaconis", compareConsolidate: false
        },
        sortOption:{
            sortable= true, filterEmptyBin = false
        } = {
            sortable: true, filterEmptyBin: false
        },
        orientation = 'vertical',
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"},
        lineProps: {
            showLine = false, showDots = true, curve = "linear"
        } = {
            showLine: false, showDots: true, curve: "linear"
        }
    }:HistogramProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();        
    const { height: controlsHeight } = controlsSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize

    const [ isSorted, setIsSorted ] = useState(false)
                
    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)

    useEffect(()=>{
        setIsSorted(false)
    }, [data, compareMode])

    useEffect(() => { if(!sortable){ setIsSorted(false) } }, [sortable])

    const isSingleData = data.valueKey !== undefined
    
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        
        const margin = { 
            top: 30, 
            right: orientation === 'vertical'?30:50, 
            bottom: orientation==='vertical'?50:30, 
            left: orientation === 'vertical'?25:50
        };

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom
                
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");        

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);                    
                
        /*
            NOTE:
            data can be single or double. For single data, the main data will has a 'valueKey' property.
            For double data, the main data does not have this, instead it will be embeded in each member of
            the main data's data property e.g each data.data will has a 'valueKey' property
        */
        const validateData = (rawData: histogramChartData<histogramDatum>) => {
            const validatedData = (rawData.data as histogramDatum[]).filter((d) => {
                const rawValue = (d as Record<string, unknown>)[rawData.valueKey!] as unknown;
                const value = typeof rawValue === 'string' || typeof rawValue === 'number' ? String(rawValue) : "";
                return !isNaN(parseFloat(value));
            })

            return { title: rawData.title, valueKey: rawData.valueKey, data:validatedData }
        }
        
        const validatedData = isSingleData ? validateData(data) :
            data.data.reduce((acc: histogramChartData<histogramDatum>[], curr) => {                
                const validCurrData = validateData(curr as histogramChartData<histogramDatum>)                                
                acc.push(validCurrData)
                return acc
            }, [])                                                

        const validData:histogramChartData<histogramDatum> = isSingleData?(validatedData as histogramChartData<histogramDatum>):
            ({title: data.title, data: validatedData} as histogramChartData<histogramDatum>)
                
        const values:number[] = isSingleData
            ? validData
                .data
                .map(d => parseFloat(String((d as Record<string, unknown>)[data.valueKey!])))
            : validData.data.reduce((acc: number[], curr) => {
                if (!curr.valueKey) return acc;
                const currValueKey = curr.valueKey as string;
                const currValues: number[] = (curr.data as histogramDatum[])
                    .map(d => parseFloat(String((d as Record<string, unknown>)[currValueKey])))
                acc.push(...currValues)
                return acc
            }, [])
        
        const rangeMin = Math.min(...values)
        const rangeMax = Math.max(...values)
                      
        const rangeScaleBin = scaleLinear()
            .domain([rangeMin, rangeMax])
            .range([0, graphWidth])
            //.nice()        
        
        const binnedDataFactory = (dataForBin: histogramChartData<histogramDatum>) => {
            if(!dataForBin || !dataForBin.data || dataForBin.data.length === 0){
                return []
            }            

            const dataForBinValues = dataForBin.data.map(d => parseFloat(String((d as Record<string, unknown>)[dataForBin.valueKey!])))
            const dataForBinMin = Math.min(...dataForBinValues)
            const dataForBinMax = Math.max(...dataForBinValues)
            const binCount = 15;

            const thresholds = range(
                dataForBinMin,//rangeMin
                dataForBinMax,//rangeMax
                //(rangeMax - rangeMin) / binCount
                (dataForBinMax - dataForBinMin) / binCount
            );

            const { mode, value, compareConsolidate } = binOption 
            const vKey = dataForBin.valueKey || ""
            const histogramFn = bin<histogramDatum, number>()
                .value((d: histogramDatum) => d[vKey!] as number)
                .domain(
                    compareConsolidate?
                    [rangeMin, rangeMax]:
                    [dataForBinMin, dataForBinMax]
                )                       

            function createHistogramThresholds(
                rangeMin: number,
                rangeMax: number,
                interval: number
            ): number[] {
                if (interval <= 0) {
                    throw new Error("interval must be greater than 0");
                }

                let start = Math.floor(rangeMin / interval) * interval;
                let end = Math.ceil(rangeMax / interval) * interval;

                if (start >= rangeMin) {
                    start -= interval;
                }

                if (end <= rangeMax) {
                    end += interval;
                }

                const thresholds: number[] = [];

                for (let value = start; value <= end; value += interval) {
                    thresholds.push(value);
                }

                return thresholds;
            }

            if(mode === "arbitrary"){
                histogramFn.thresholds(rangeScaleBin.ticks(value as number))
            }
            else if(mode === "fixed"){
                histogramFn.thresholds(
                    range(
                        dataForBinMin,//rangeMin
                        dataForBinMax,//rangeMax
                        (dataForBinMax - dataForBinMin) / (value as number)
                    )
                )
            }else if(mode === "interval"){
                const thresholds = createHistogramThresholds(dataForBinMin, dataForBinMax, value as number)
                histogramFn.thresholds(thresholds)
            }else if(mode === "custom"){
                histogramFn.thresholds(value as number[])
            }
            else if(mode === "algorithm"){
                if(value === "Freedman-Diaconis"){
                    histogramFn.thresholds(thresholdFreedmanDiaconis)
                }else if(value === "Scott"){
                    histogramFn.thresholds(thresholdScott)
                }else if(value === "Sturges"){
                    histogramFn.thresholds(thresholdSturges)
                }
            }

            const bins:binnedData[] = histogramFn(dataForBin.data as histogramDatum[])

            return bins
        }        

        const dataToRender:binnedData[][] = isSingleData?
            [
                binnedDataFactory(validData), []
            ]:
            [
                binnedDataFactory(validData.data[0] as histogramChartData<histogramDatum>), 
                binnedDataFactory(validData.data[1] as histogramChartData<histogramDatum>)
            ]                
        
        const withNegativeData = 
            (dataToRender[0][0]?.x0 as number) < 0 ||
            (dataToRender[1][0]?.x0 as number) < 0        

        const legendsData:HistogramLegend[] = !Array.isArray(validatedData)?
            withNegativeData?[
                Object.assign(["positive", "negative"] as HistogramLegend, { title: validatedData.title })
            ]:[]:
            [
                Object.assign(
                    !withNegativeData?
                        ["positive"] as HistogramLegend:
                        ["positive", "negative"] as HistogramLegend,
                    { title: validatedData[0].title}
                ),
                Object.assign(
                    !withNegativeData?
                        ["positive"] as HistogramLegend:
                        ["positive", "negative"] as HistogramLegend,
                    { title: validatedData[1].title}
                )
            ]
        const layers = legendsData.map(d => d.title)                

        const legendWidth = isMediumScreen?80:60
        
        const legendClass = function(){
            const containerClass = styles[isMediumScreen?"legend-container":"legend-container-sm"]            
            return  `${containerClass} legend-item`            
        }                
        
        const colors = {
            base: "#7c3aed",
            layer1:{
                positive: "#2563eb", negative: "#f43f5e"
            },
            layer2:{
                positive: "#22c55e", negative: "#dc2626"
            }
        }

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")        

        const legends = legendsContainer.selectAll<HTMLDivElement, HistogramLegend>(".legend-item")
            .data(
                legendsData, 
                d=>d.title
            )
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", legendClass)
                        .style("left", (_, i)=> `${i * legendWidth}px`)
                        .style("top", "-53px")
                        .style("opacity", 0)
                        
                    const legendRectsContainer = divs.append("div")
                        .attr("class", function(_:HistogramLegend, i:number){
                            return `
                                legends-rect
                                ${histogramStyles[i === 0?"legends-layer1":"legends-layer2"]} 
                                ${histogramStyles["histogram-legends-container"]}
                            `
                        })
                        .style("width", `${legendWidth}px`)                   

                    const positiveLegend = legendRectsContainer.append("div")
                        .attr(
                            "class", 
                            `${
                                styles["legend-rect"]} 
                                ${isSingleData?histogramStyles.base:histogramStyles.positive} 
                            `)

                    positiveLegend.append("p")
                        .text("+")
                        .style("opacity", `${withNegativeData?1:0}`)

                    if(withNegativeData){
                        const negativeLegend = legendRectsContainer.append("div")
                            .attr("class", `${styles["legend-rect"]} ${histogramStyles.negative}`)
                        
                        negativeLegend.append("p")
                            .text("-")                            
                    }          
                    
                    divs.append("p")
                        .text((_, i) => {                            
                            return layers[i]
                        })
                        .attr("class", histogramStyles["legend-label"])
                                                                                                                                                                                                                                             
                    divs.transition().duration(animDuration)                                                        
                        .style("top", "0px")                              
                        .style("opacity", 1)
                    return divs;
                },
                update => {
                    update
                        .attr("class", legendClass)
                        
                    const legendRectsContainer = update.selectAll("div.legends-rect")
                    legendRectsContainer
                        .attr("class", function(_, i:number){                            
                            const layerIndex = layers.indexOf((_ as HistogramLegend).title)
                            return `
                                legends-rect
                                ${histogramStyles[layerIndex === 0?"legends-layer1":"legends-layer2"]} 
                                ${histogramStyles["histogram-legends-container"]}
                            `
                        })
                        .style("width", `${legendWidth}px`)

                    const noNegativeRect = legendRectsContainer.selectAll(`div.${histogramStyles["negative"]}`).empty()
                    if(noNegativeRect && withNegativeData){
                        const negativeLegend = legendRectsContainer.append("div")
                            .attr("class", `${styles["legend-rect"]} ${histogramStyles.negative}`)
                        
                        negativeLegend.append("p")
                            .text("-")
                    }
                    if(!noNegativeRect && !withNegativeData){
                        legendRectsContainer.selectAll(`div.${histogramStyles.negative}`)                            
                            .remove()
                    }
                    if(isSingleData){
                        legendRectsContainer.selectAll(`div.${histogramStyles.positive}`)
                            .attr("class", `${styles["legend-rect"]} ${histogramStyles.base}`)                            

                        
                    }else{
                        legendRectsContainer.selectAll(`div.${histogramStyles.base}`)
                            .attr("class", `${styles["legend-rect"]} ${histogramStyles.positive}`)                            
                    }

                    legendRectsContainer.selectAll("p")
                        .transition().duration(animDuration)
                        .style("opacity", `${withNegativeData?1:0}`)

                    update
                        .transition().duration(animDuration)
                            .style("top", "0px")
                            .style("left", (_, i)=> `${i * legendWidth}px`) 
                            .style("opacity", 1)
                                                                      

                    return update;
                },
                exit => exit
                    .style("color", inactiveColor)
                    .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("top", "53px")
                    .remove()
            )       
        
        const max1 = Math.max(...dataToRender[0].map((bin) => bin?.length))
        const max2 = Math.max(...dataToRender[1].map((bin) => bin?.length))
        const valueMax = Math.max(max1, max2);            

        //this sortedFirstDataRanges below is needed by layer 2's y axis when isSingleData and "horizontal"
        const sortedFirstDataRanges = isSingleData?
            binnedDataFactory(validData).filter(d => d.length > 0)
            .sort((a: binnedData, b: binnedData) => b.length - a.length)
            .map(d => d.x0 + "-" + d.x1):[]
        
        function renderLayer(layerBin:binnedData[], layerIdx: number){                        
            const dualView = !isSingleData && compareMode === "compare"            
            
            const layerCanvas = layerIdx === 1?
                canvas.select<SVGGElement>('.layer-1'):
                canvas.select<SVGGElement>('.layer-2')

            if(layerIdx === 1){
                layerCanvas.transition().duration(animDuration)
                    .attr(
                        "transform",
                        `translate(${
                            (orientation === "horizontal" && dualView)?
                            (graphWidth/2):0
                        }, 0)`
                    )
            }else {
                layerCanvas.transition().duration(animDuration)
                    .attr(
                        "transform", 
                        `translate(
                            0, 
                            ${(orientation === "vertical" && dualView)?(graphHeight/2):0})`
                    )
            }
                                        
            if(isSorted){
                if(filterEmptyBin){
                    layerBin = layerBin.filter(d => d.length > 0)
                }                
                layerBin.sort((a: binnedData, b: binnedData) => b.length - a.length)
            }

            const binRanges = scaleLinear()
                .domain([rangeMin, rangeMax])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
                .range(orientation === 'vertical'?
                    [0, graphWidth]:[0, graphHeight])
                //.nice()

            const baseRanges = layerBin.map(d => d.x0 + "-" + d.x1)                    
            const ranges = layerIdx === 2 && baseRanges.length === 0?
                sortedFirstDataRanges:baseRanges
            const binSorted = scaleBand()
                .domain(ranges)
                .rangeRound(orientation === 'vertical'?
                    [0, graphWidth]:[0, graphHeight]);              

            const valueScale = scaleLinear()
                .domain([0, valueMax])
                .nice();
                        
            if(layerIdx === 1){
                
                valueScale                    
                    .range(
                        orientation === "vertical"?
                            [!dualView?graphHeight:(graphHeight/2), 0]:                                                    
                            [0, dualView?graphWidth/2:graphWidth]                        
                    )
                    .nice();                                        
                    
                const xAxisTextClass = (orientation === "vertical" && (!isMediumScreen || isSorted))?
                    (isSingleData?styles.rotatedAxisText:styles.rotatedTopAxisText):
                        styles.axisText;

                const xAxis = orientation === "vertical"?
                    ((isSorted?axisTop(binSorted):axisTop(binRanges))):
                        axisTop(valueScale)
                
                orientation === "vertical"?xAxis.tickSizeOuter(0).ticks(10)
                    :xAxis
                        .tickSizeOuter(0)
                        .ticks(5, "s")                
                        .tickSize(-graphHeight)                                

                layerCanvas.select<SVGGElement>(".x-axis")                    
                    .transition().duration(animDuration).call(xAxis)
                    .attr(
                        "transform", 
                        `translate(0, 0)`                        
                    )
                    .style(
                        "opacity", 
                            orientation === "horizontal"?1:
                            (!isSingleData && isSorted)?1:0
                    )
                    .selectAll("text")
                    .attr("class", xAxisTextClass); 
                    
                const yAxis = orientation === "vertical"?
                    axisLeft(valueScale):                    
                        (isSorted?axisRight(binSorted):axisRight(binRanges))

                orientation === 'vertical'?
                    yAxis.ticks(5, "s").tickSize(-graphWidth):
                    yAxis.tickSizeOuter(0)

                layerCanvas.select<SVGGElement>(".y-axis")
                    .transition().duration(animDuration)                
                .attr(
                    "transform", 
                    `translate(
                        ${(orientation === "horizontal" && dualView)?graphWidth/2:0}, 
                        0
                    )`
                )
                .style("opacity", dualView?1:0)
                .call(yAxis)

            }else {
                valueScale                    
                    .range(
                        orientation === "vertical"?
                        !dualView?
                            [graphHeight, 0]:
                            [0, graphHeight/2]:
                        !dualView?
                            [0, graphWidth]:
                            [graphWidth/2, 0]
                    )
                    .nice();
                //.range([0, graphHeight])

                const xAxisTextClass = (orientation === "vertical" && (!isMediumScreen || isSorted))?
                    styles.rotatedAxisText:
                        styles.axisText;

                const xAxis = orientation === "vertical"?
                    !isSorted ? axisBottom(binRanges) : axisBottom(binSorted):
                    axisTop(valueScale)

                orientation === "vertical"?xAxis.tickSizeOuter(0).ticks(10)
                    :xAxis
                        .tickSizeOuter(0)
                        .ticks(5, "s")                
                        .tickSize(graphHeight) 

                layerCanvas.select<SVGGElement>(".x-axis")
                    .attr(
                        "transform", 
                        `translate(0, ${(orientation === "vertical" && dualView)?graphHeight/2:graphHeight})`                        
                    )
                    .transition().duration(animDuration).call(xAxis)                    
                    .selectAll("text")
                    .attr("class", xAxisTextClass);
                
                const yAxis = orientation === "vertical"?
                    axisLeft(valueScale):
                    (isSorted?axisLeft(binSorted):axisLeft(binRanges))                
                
                orientation === 'vertical'?
                    yAxis.ticks(5, "s").tickSize(-graphWidth):
                    yAxis.tickSizeOuter(0)

                layerCanvas.select<SVGGElement>(".y-axis")
                    .transition().duration(animDuration)                    
                    .call(yAxis)
            }                                    
            
            const bars = layerCanvas.selectAll<SVGRectElement, binnedData>("rect.bar")
                .data(layerBin, (d)=> d.x0 + "-" + d.x1)
                .join(
                    enter=>enter.append("rect")
                        .attr("class", "bar")
                        .attr("x", function(d){
                            if(orientation === "vertical"){
                                return (!isSorted?binRanges(d.x0 as number) || 0:
                                    binSorted(d.x0 + "-" + d.x1)) || 0
                            } else {
                                return valueScale(0)
                            }                                                                                    
                        })
                        .attr("width", function(d){ 
                            if(orientation === "vertical"){
                                if(!isSorted){
                                    return binRanges(d.x1 as number) - binRanges(d.x0 as number) || 0
                                }else{
                                    return binSorted.bandwidth()
                                }
                            }else {
                                return 0
                            }
                            
                            
                        })
                        .style("fill", "#4ade80")
                        .style("stroke", "#394447")
                        .attr("y", function(d){
                            if(orientation === "vertical"){
                                return valueScale(0)
                            }else {
                                return (!isSorted?binRanges(d.x0 as number) || 0:
                                    binSorted(d.x0 + "-" + d.x1)) || 0
                            }
                        })
                        .attr("height", function(d){
                            if(orientation === "vertical"){
                                return 0
                            }else{
                                if(!isSorted){
                                    return binRanges(d.x1 as number) - binRanges(d.x0 as number) || 0
                                }else{
                                    return binSorted.bandwidth()
                                }
                            }
                        }),                        
                    undefined,
                    exit=>exit                
                            .transition().duration(animDuration)
                        .attr("y", valueScale(0))
                        .attr("height", 0)
                        .style("fill", "#a1a1aa")
                        .style("opacity", 0)
                        .remove()
                ) 
                .on("mouseover", function(e, d){
                    console.log(d)
                })
                .transition().duration(animDuration)
                //.style("fill", barFill)         
                .style("fill", function(d){
                    const xPos = binRanges(d.x0 as number) || 0
                    return xPos < binRanges(0)?layerIdx === 1?
                            colors.layer1.negative:colors.layer2.negative:
                        isSingleData?colors.base:layerIdx === 1?
                            colors.layer1.positive:colors.layer2.positive
                })           
                .attr("x", function(d){
                    if(orientation === "vertical"){
                        return (!isSorted?binRanges(d.x0 as number) || 0:
                            binSorted(d.x0 + "-" + d.x1)) || 0
                    } else{
                        if(layerIdx === 2 && dualView){
                            return valueScale(d.length)
                        }
                        return valueScale(0)
                    }                                                                    
                })
                .attr("width", function(d){
                    if(orientation === "vertical"){
                        if(!isSorted){
                            const x0 = d.x0 as number
                            const baseX1 = d.x1 as number
                            const x1 = baseX1 === x0?x0 + 1:baseX1
                            return binRanges(x1) - binRanges(x0) || 0
                        }else{
                            return binSorted.bandwidth()
                        }
                    } else {
                        if(layerIdx === 2 && dualView){
                            const layerWidth = graphWidth/2
                            return layerWidth - valueScale(d.length)
                        }else {
                            return valueScale(d.length)
                        }
                    }
                    
                    
                })
                .attr("y", function(d){
                    if(orientation === "vertical"){
                        if(layerIdx === 2 && compareMode === "compare"){
                            return valueScale(0)
                        }
                        return valueScale(d.length) || 0
                    } else {
                        return (!isSorted?binRanges(d.x0 as number) || 0:
                            binSorted(d.x0 + "-" + d.x1)) || 0
                    }
                                        
                })
                .attr("height", function(d){
                    if(orientation === "vertical"){
                        if(layerIdx === 2 && compareMode === "compare"){
                            return valueScale(d.length)
                        }
                        const layerHeight = !dualView?graphHeight:(graphHeight/2) 
                        return layerHeight - valueScale(d.length) || 0
                    }else {
                        if(!isSorted){
                            const x0 = d.x0 as number
                            const baseX1 = d.x1 as number
                            const x1 = baseX1 === x0?x0 + 1:baseX1
                            return binRanges(x1) - binRanges(x0) || 0
                        }else{
                            return binSorted.bandwidth()
                        }
                    }
                                        
                })
                       
            const lineColor = layerIdx === 1?
                isSingleData?"#2b2b22":(!withNegativeData?colors.base:colors.layer1.positive):
                colors.layer2.positive

            renderHistogramLine(
                layerCanvas,
                { binRanges, binSorted,isSorted }, 
                valueScale,
                layerBin,
                width,
                orientation,
                {
                    showLine, showDots,
                    lineStroke: String(color(lineColor)?.darker()), dotFill: lineColor
                }
            )
            
        }

        renderLayer(dataToRender[0], 1)
        renderLayer(dataToRender[1], 2)
            
        
    }, [
        data, compareMode, binOption, filterEmptyBin, width, height, isSorted, orientation, 
        { showLine, showDots, curve},
        {prefix, suffix, formatType}]);
        
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
                    {
                        sortable &&
                        <label className={styles["controls-label"]} style={{paddingRight: '12px'}}>
                            <input 
                                type="checkbox" 
                                className={styles["controls-checkbox"]}
                                checked={isSorted}
                                onChange={(e) => setIsSorted(e.target.checked)}                                             
                            />
                                Sort
                        </label> 

                    }
                    
                    <div                         
                        className={`legends-container ${styles["legends-container"]}`}
                    />
                </div>
                <div
                    ref={chartContainerRef} 
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column", position: "relative",}}>         
                    <svg                
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}
                        style={{}}
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        <g className="plot-area">                                
                            <g className='layer-2'>
                                <g className={`${orientation === 'vertical'?styles["value-axis"]:""} y-axis`} />
                                <g className={`${orientation === 'horizontal'?styles["value-axis"]:""} x-axis`} />    
                            </g>
                            <g className='layer-1'>
                                <g className={`${orientation === 'vertical'?styles["value-axis"]:""} y-axis`} />
                                <g className={`${orientation === 'horizontal'?styles["value-axis"]:""} x-axis`} />    
                            </g>
                        </g>                        
                    </svg>                            
                    <Tooltip />
                </div> 
            </div>
        </div>
    );
}