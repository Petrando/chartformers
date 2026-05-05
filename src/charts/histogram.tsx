import React, {useEffect, useState} from 'react';
import {select, scaleBand, scaleLinear, axisLeft, axisBottom, axisTop, axisRight,
    max, format, Bin, bin, Selection, thresholdFreedmanDiaconis, thresholdScott, thresholdSturges
} from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import styles from './global.module.css';
import barchartStyles from './barchart.module.css';
import { pointData, tooltipFormat, histogramDatum, histogramChartData } from '../types';
import { useContainerSize } from '../hooks/useContainerSize';

type HistogramProps<T extends histogramDatum> = {
    data: histogramChartData<T>;
    compareMode?: "default" | "compare";
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    orientation?: 'horizontal' | 'vertical';
    tooltipFormat?: tooltipFormat;
}

export function Histogram<T extends histogramDatum>({
        data, 
        compareMode = "default",
        color: {
            idx = 0,               // default idx
            type = 'fixed',        // default type
        } = { idx: 0, type: 'fixed' },
        orientation = 'vertical',
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:HistogramProps<T>) {
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
    }, [data])

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

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom
                
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const layer1 = canvas.select<SVGGElement>('.layer-1')
        const layer2 = canvas.select<SVGGElement>('.layer-2')
        if(orientation === "vertical"){
            layer2.transition().duration(animDuration)
                .attr(
                    "transform", 
                    `translate(0, ${compareMode === "compare"?(graphHeight/2):0})`
                )
        }else{
            layer1.transition().duration(animDuration)
                .attr(
                    "transform",
                    `translate(${compareMode === "compare"?(graphWidth/2):0})`
                )
        }

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);
        
        const xAxisTextClass = !isMediumScreen?barchartStyles.rotatedAxisText:
                    barchartStyles.axisText;

            
                
        /*
            NOTE:
            data can be single or double. For single data, the main data will has a 'valueKey' property.
            For double data, the main data does not have this, instead it will be embeded in each member of
            the main data's data property e.g each data.data will has a 'valueKey' property
        */
        const validateData = (rawData: histogramChartData<T>) => {
            const validatedData = (rawData.data as T[]).filter((d) => {
                const rawValue = (d as Record<string, unknown>)[rawData.valueKey!] as unknown;
                const value = typeof rawValue === 'string' || typeof rawValue === 'number' ? String(rawValue) : "";
                return !isNaN(parseFloat(value));
            })

            return { title: rawData.title, valueKey: rawData.valueKey, data:validatedData }
        }
        const isSingleData = data.valueKey
        const validatedData = isSingleData ? validateData(data) :
            data.data.reduce((acc: histogramChartData<T>[], curr) => {                
                const validCurrData = validateData(curr as histogramChartData<T>)                                
                acc.push(validCurrData)
                return acc
            }, [])

        const validData:histogramChartData<T> = isSingleData?(validatedData as histogramChartData<T>):
            ({title: data.title, data: validatedData} as histogramChartData<T>)
                
        const values:number[] = isSingleData
            ? validData
                .data
                .map(d => parseFloat(String((d as Record<string, unknown>)[data.valueKey!])))
            : validData.data.reduce((acc: number[], curr) => {
                if (!curr.valueKey) return acc;
                const currValueKey = curr.valueKey as string;
                const currValues: number[] = (curr.data as T[])
                    .map(d => parseFloat(String((d as Record<string, unknown>)[currValueKey])))
                acc.push(...currValues)
                return acc
            }, [])

        const baseXPositiveMin = Math.min(...values)
        const xMin = baseXPositiveMin//baseXPositiveMin >= 0?0:baseXPositiveMin
        const xMax = Math.max(...values)
                      
        const xBin = scaleLinear()
            .domain([xMin, xMax])
            .range([0, graphWidth])
            .nice()

        type binnedData = Bin<T, number>;

        const binnedDataFactory = (dataForBin: histogramChartData<T>) => {
            if(!dataForBin || !dataForBin.data || dataForBin.data.length === 0){
                return []
            }
            const vKey = dataForBin.valueKey || ""
            const histogramFn = bin<T, number>()
                .value((d: T) => d[vKey!] as number)//attention here!!!
                .domain([xMin, xMax])
                .thresholds(xBin.ticks(70));

            const bins:binnedData[] = histogramFn(dataForBin.data as T[])

            return bins
        }        

        const dataToRender = isSingleData?
            [
                binnedDataFactory(validData), []
            ]:
            [
                binnedDataFactory(validData.data[0] as histogramChartData<T>), 
                binnedDataFactory(validData.data[1] as histogramChartData<T>)
            ]        
        //const bins = binnedDataFactory(dataToRender as histogramChartData<T>)                

        /*const xAxis = axisBottom(x)
            .ticks(10)
            .tickSizeOuter(0)*/

        /*canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0, ${graphHeight})`)
            .transition().duration(animDuration).call(xAxis)
            .selectAll("text")
            .attr("class", xAxisTextClass);*/

        const max1 = Math.max(...dataToRender[0].map((bin) => bin?.length))
        const max2 = Math.max(...dataToRender[1].map((bin) => bin?.length))
        const valueMax = Math.max(max1, max2);        

        function renderLayer(layerBin:binnedData[], layerCanvas: Selection<SVGGElement, unknown, null, undefined>){
            const layerIdx = layerCanvas === layer1?1:2
            const dualView = !isSingleData && compareMode === "compare"

            if(isSorted){
                layerBin.sort((a: binnedData, b: binnedData) => b.length - a.length)
            }
            
                            
            const ranges = layerBin.map(d => d.x0 + "-" + d.x1)
            console.log(ranges)

            const xRange = scaleLinear()
                .domain([xMin, xMax])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
                .range([0, graphWidth])
                .nice()
                    
            const xSorted = scaleBand()
                .domain(ranges)
                .rangeRound(orientation === 'vertical'?
                    [0, graphWidth]:[graphHeight, 0]);  

            const y = scaleLinear()
                .domain([0, valueMax])
                .nice();
            if(layerIdx === 1){
                //if(orientation === "vertical"){}

                const xAxis = !isSorted ? axisBottom(xRange) : axisBottom(xSorted)
                //!dualView?axisBottom(x):axisTop(x);
                xAxis
                    .ticks(10)
                    .tickSizeOuter(0)                                

                layerCanvas.select<SVGGElement>(".x-axis")
                    .attr(
                        "transform", 
                        //`translate(0, ${!dualView?graphHeight:0})`
                        `translate(0, ${graphHeight})`
                    )
                    .transition().duration(animDuration).call(xAxis)
                    .selectAll("text")
                    .attr("class", xAxisTextClass);

                y                    
                    .range([
                        !dualView?graphHeight:(graphHeight/2), 
                        0
                    ]);
                    //.range([0, graphHeight])
                

            }else {
                const xAxis = !isSorted ? axisBottom(xRange) : axisBottom(xSorted)
                xAxis
                    .ticks(10)
                    .tickSizeOuter(0)

                y                    
                    .range(
                        !dualView?
                        [graphHeight, 0]:
                        [0, graphHeight/2]
                    );
                    //.range([0, graphHeight])
            }

            const yAxis = axisLeft(y).ticks(5, "s").tickSize(-graphWidth)

            layerCanvas.select<SVGGElement>(".y-axis")
                    .transition().duration(animDuration)
                .style("opacity", (layerIdx === 2 && !dualView)?0:1)
                .attr("transform", `translate(0, 0)`)
                .call(yAxis)
            const bars = layerCanvas.selectAll<SVGRectElement, binnedData>("rect.bar")
                .data(layerBin, (d)=> d.x0 + "-" + d.x1)
                .join(
                    enter=>enter.append("rect")
                        .attr("class", "bar")
                        .attr("x", function(d){ 
                            return (!isSorted?xRange(d.x0 as number) || 0:
                                xSorted(d.x0 + "-" + d.x1)) || 0                            
                            
                        })
                        .attr("width", function(d){ 
                            if(!isSorted){
                                return xRange(d.x1 as number) - xRange(d.x0 as number) || 0
                            }else{
                                return xSorted.bandwidth()
                            }
                            
                        })
                        .style("fill", "#4ade80")
                        .style("stroke", "#394447")
                        .attr("y", y(0))
                        .attr("height", 0),                        
                    undefined,
                    exit=>exit                
                            .transition().duration(animDuration)
                        .attr("y", y(0))
                        .attr("height", 0)
                        .style("fill", "#a1a1aa")
                        .style("opacity", 0)
                        .remove()
                ) 
                .on("mouseover", function(e, d){
                    //console.log(d)
                })
                .transition().duration(animDuration)
                //.style("fill", barFill)         
                .style("fill", function(d){
                    const xPos = xRange(d.x0 as number) || 0
                    return xPos < xRange(0)?layerIdx === 1?"#f43f5e":"#dc2626":
                        isSingleData?"#7c3aed":layerIdx === 1?"#2563eb":"#22c55e"
                })           
                .attr("x", function(d){ 
                            return (!isSorted?xRange(d.x0 as number) || 0:
                                xSorted(d.x0 + "-" + d.x1)) || 0                            
                            
                        })
                        .attr("width", function(d){ 
                            if(!isSorted){
                                return xRange(d.x1 as number) - xRange(d.x0 as number) || 0
                            }else{
                                return xSorted.bandwidth()
                            }
                            
                        })
                .attr("y", function(d){ 
                    if(layerIdx === 2 && compareMode === "compare"){
                        return y(0)
                    }
                    return y(d.length) || 0                    
                })
                .attr("height", function(d){
                    if(layerIdx === 2 && compareMode === "compare"){
                        return y(d.length)
                    }
                    const layerHeight = !dualView?graphHeight:(graphHeight/2) 
                    return layerHeight - y(d.length) || 0                    
                })
        }

        renderLayer(dataToRender[0], layer1)
        renderLayer(dataToRender[1], layer2)
            
        
    }, [data, compareMode, color, width, height, isSorted, orientation, {prefix, suffix, formatType}]);
    
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
                            <g className={`${orientation === 'vertical'?styles["value-axis"]:""} y-axis`} />
                            <g className={`${orientation === 'horizontal'?styles["value-axis"]:""} x-axis`} />    
                            <g className='layer-1'>
                                <g className={`${orientation === 'vertical'?styles["value-axis"]:""} y-axis`} />
                                <g className={`${orientation === 'horizontal'?styles["value-axis"]:""} x-axis`} />    
                            </g>
                            <g className='layer-2'>
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