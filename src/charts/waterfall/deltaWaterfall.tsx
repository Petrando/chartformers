import React, { useEffect, useState, useRef } from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, format, min, max} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import styles from '../global.module.css';
import waterfallStyles from './waterfall.module.css'
import { tooltipFormat, deltaWaterfallDatum, waterfallDatum } from '../../types';
import { useContainerSize } from '../../hooks/useContainerSize';
import { formatWaterfallData, colors } from './utils';

type WaterfallProps = {
    data: deltaWaterfallDatum[];    
    tooltipFormat?: tooltipFormat;
}

interface openCloseData {
    label: string;
    data: waterfallDatum;
}

export function DeltaWaterfall({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:WaterfallProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize
    const [ plottedTimeframe, setPlottedTimeframe ] = useState(-1)

    type modeType = "waterfall" | "inflows" | "outflows";
    const [ mode, setMode ] = useState<modeType>("waterfall")        
    const [ isSorted, setIsSorted ] = useState(false)
    const changeBy = useRef("data")
    const isFirstRender = useRef(true);
    const canLegendHover = useRef(true)

    const dataRef = useRef(data)
    
    useEffect(() => {
        dataRef.current = data;
        setPlottedTimeframe(-1)
    }, [data])

    const effectiveTimeframe =
        dataRef.current !== data
            ? -1
            : plottedTimeframe;

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)    
        
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;

        const margin = { 
            top: 40, 
            right: 50, 
            bottom: 50, 
            left: 50
        };
        
        const formattedData = data.map(d => ({
            label: d.label, data: formatWaterfallData(d.data)
        }))        
       
        const baseOpenData:openCloseData[] = formattedData.map(d => {
            const baseData = d.data.find(dt => dt.label === "Opening") as waterfallDatum
            const data = baseData?baseData:d.data[0]

            return { label: d.label, data:{...data, label:"Opening "} }
        })
        const openData = effectiveTimeframe === -1?baseOpenData:[baseOpenData[effectiveTimeframe]]

        const baseCloseData:openCloseData[] = formattedData.map(d => {
            const baseData = d.data.find(dt => dt.label === "Closing") as waterfallDatum
            const data = baseData?baseData:d.data[d.data.length - 1]

            return { label: d.label, data:{...data, label: "Closing" } }
        })
        const closeData = effectiveTimeframe === -1?baseCloseData:[baseCloseData[effectiveTimeframe]]        
        
        type BarKey = "open" | "close";
        const keys: BarKey[] = ["open", "close"];        

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")
        
        type LegendKey = "open" | "close" | "inflows" | "outflows";
        const legendsData: LegendKey[] = effectiveTimeframe === -1?
            ["open", "close"]:["open", "inflows", "outflows", "close"]

        const legendWidth = 50//isMediumScreen?80:50

        const legendClass = function(d: LegendKey){
            const containerClass = styles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = styles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]
            const containerInactiveClass = styles[isMediumScreen?"legend-container-inactive":"legend-container-inactive-sm"]
            return  `
                ${//plotted.includes(d)?
                    //focusOnPlot?containerActiveClass:containerInactiveClass:
                        containerClass}
                legend-item
            `            
        }

        const legends = legendsContainer.selectAll<HTMLDivElement, LegendKey>(".legend-item")
            .data([...legendsData], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", legendClass)
                        .style("left", (_, i)=> `${i * legendWidth}px`)
                        .style("top", "-53px")
                        .style("opacity", 0);

                    divs.append("div")
                        .attr("class", styles["legend-rect"])
                        .style("background", (d) => colors[d])
                    divs.append("span")
                        .attr("class", styles["legend-label"])
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
                        .select(`.${styles["legend-rect"]}`)
                        .style("background", (d) => colors[d]);

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`.${styles["legend-label"]}`)
                        .text(d => d);

                    return update;
                },
                exit => exit
                    .transition().duration(animDuration)
                    .style("opacity", 0)
                    .style("top", "53px")
                    .remove().remove()
            )

        const graphWidth = width - margin.left - margin.right
        const graphHeight = height - margin.top - margin.bottom
        
        const openDataValues = openData.map(d => d?.data.value)
        const closeDataValues = closeData.map(d => d?.data.value)
        const allValues = [ ...openDataValues, ...closeDataValues ]
        
        const plottedData = effectiveTimeframe === -1?null:
            formattedData[effectiveTimeframe]
        const baseWaterfallData = plottedData?plottedData.data:[]

        const waterfallMins = baseWaterfallData.map((d, i) => {
            const isLastData = i === baseWaterfallData.length - 1
            return Math.min(d.start, !isLastData?d.end:d.value)
        })
        const waterfallMaxes = baseWaterfallData.map((d, i) => {
            const isLastData = i === baseWaterfallData.length - 1
            return Math.max(d.start, !isLastData?d.end:d.value)
        })        

        const valueMin = Math.min(...waterfallMins)//mode === "waterfall"?Math.min(...mins):0
        const valueMax = Math.max(...waterfallMaxes)//mode === "waterfall"?Math.max(...maxes):
            //Math.max(...renderData.map(d => Math.abs(d.value)))

        const yMin = Math.min(0, min(allValues) ?? 0)
        const yMax = Math.max(0, max(allValues) ?? 0)
        const y = scaleLinear()
            .domain(
                effectiveTimeframe === -1?
                [ yMin, yMax ]:
                [ valueMin, valueMax ]
            )            
            .range([graphHeight, 0])
            .nice();

        const yAxis = axisLeft(y).ticks(5, "s").tickSize(-graphWidth)

        canvas.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(0, 0)`)
            .transition().duration(animDuration).call(yAxis)

        const axisClass = !isMediumScreen
            ? `${styles.rotatedAxisText} ${waterfallStyles["axis-label-sm"]}`
            : `${styles.axisText} ${waterfallStyles["axis-label"]}`;

        const xAxisTextClass = `${axisClass} ${waterfallStyles["clickable-label"]}`;

        const xLabels = formattedData.map(d => d.label)
        
        const waterfallXLabels = baseWaterfallData.map(d => d.label)
            .map(d => d === "Opening" ? "open" :
                    d === "Closing" ? "close" :
                        d
            )
        
        const x0 = scaleBand()
            .domain(
                effectiveTimeframe === -1?xLabels:waterfallXLabels
            )
            .rangeRound([0, graphWidth])
            .padding(0.2);

        const xAxis = axisBottom(x0)            
            .tickValues(x0.domain())
            .scale(x0)
            .tickSizeOuter(0)        

        const x1 = scaleBand()
            .domain(keys)
            .range([0, x0.bandwidth()])
            .padding(0.05);
                    
        canvas.select<SVGGElement>(".x-axis")            
            .transition().duration(animDuration).call(xAxis)            
            .attr("transform", `translate(0, ${graphHeight})`)
            .selectAll("text")
            .attr("class", `${xAxisTextClass}`)                

        canvas.select<SVGGElement>(".x-axis") 
            .selectAll("path")
            .style("display", "none")

        canvas.select<SVGGElement>(".x-axis")
            .selectAll("text")
            .on("click", function(_, d){
                setPlottedTimeframe(xLabels.indexOf(d as string))
            })

        const zeroLine = canvas.select("line.zero-line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", graphWidth).attr("y2", 0)
                .transition().duration(animDuration)
            .attr("transform", `translate(0, ${y(0) || 0})`)

        const xPosOpenClose = (d: openCloseData, type: "open" | "close") => {
            return effectiveTimeframe === -1?(x0(d.label) ?? 0) + (x1(type) ?? 0):
                x0(type) ?? 0
        }
        const barWidthOpenClose = effectiveTimeframe === -1? x1.bandwidth():x0.bandwidth()                

        canvas.selectAll<SVGRectElement, openCloseData>("rect.open")
            .data(
                openData,
                d => d?.label || "" + " - open"
            )
            .join(
                enter =>
                    enter
                        .append("rect")
                        .attr("class", "open")
                        .attr("fill", colors.open)
                        .attr("y", y(0) ?? 0)
                        .attr("height", 0)
                        .attr("x", d => xPosOpenClose(d, "open"))
                        .attr("width", barWidthOpenClose),
                undefined,
                exit =>
                    exit.remove()
            )
                .transition().duration(animDuration)
            .attr("x", d => xPosOpenClose(d, "open"))
            .attr("width", barWidthOpenClose)
            .attr("y", d => {                

                return effectiveTimeframe === -1
                    ? (d.data.value >= 0
                        ? y(d.data.value)
                        : y(0))
                    : y(Math.max(d.data.start!, d.data.end!));
            })
            .attr("height", d =>{                

                return effectiveTimeframe === -1
                    ? Math.abs(y(d.data.value) - y(0))
                    : Math.abs(y(d.data.start!) - y(d.data.end!));
            });

        canvas.selectAll<SVGRectElement, openCloseData>("rect.close")
            .data(closeData,
                (d) => d?.label || "" + " - close"
            )
            .join(
                enter =>
                    enter
                        .append("rect")
                        .attr("class", "close")
                        .attr("fill", colors.close)
                        .attr("y", y(0))
                        .attr("height", 0)
                        .attr("x", d => xPosOpenClose(d, "close"))
                        .attr("width", barWidthOpenClose),
                undefined,
                exit => exit.remove()
            )
                .transition().duration(animDuration)
            .attr("class", "close")
            .attr("x", d => xPosOpenClose(d, "close"))
            .attr("width", barWidthOpenClose)
            .attr("y", d =>
                effectiveTimeframe === -1?
                (d.data.value >= 0
                    ? y(d.data.value)
                    : y(0)):
                    d.data.start! <= d.data.end!?
                        y(d.data.value):y(0)
            )
            .attr("height", d =>{
                if(effectiveTimeframe === -1){
                    return Math.abs(y(d.data.value) - y(0))
                }else{
                    const barHeight = Math.abs( y(d.data.start!) - y(d.data.end!) )
                    if(d.data.start! <= d.data.end!){
                        const baseBarHeight = y(0) - y(d.data.value)
                        return baseBarHeight < 0?barHeight:baseBarHeight
                    }else{
                        return y(0) - y(-d.data.value)
                    }
                }
            })
            .attr("fill", "orange");
        
        const waterfallData = baseWaterfallData.filter(d => d.type !== "total")        

        function xPos(d: waterfallDatum){
            const xPosition = x0(d.label as string) ?? 0        
            return xPosition
        }

        function yPos(d: waterfallDatum, i: number){
            if(mode === "waterfall"){
                if(d.type === "total" && i > 0){
                    if(d.start! <= d.end!){
                        return y(d.value)
                    }else{
                        return y(0)
                    }                                
                }
                return y( Math.max(d.start!, d.end!));
            }
            return y(Math.abs(d.value))            
                        
        }

        function rectHeight(d: waterfallDatum, i: number){            
            if(mode === "waterfall"){
                const barHeight = Math.abs( y(d.start!) - y(d.end!) )                
                if(d.type === "total" && i > 0){
                    if(d.start! <= d.end!){
                        const baseBarHeight = y(0) - y(d.value)
                        return baseBarHeight < 0?barHeight:baseBarHeight
                    }else{
                        return y(0) - y(-d.value)
                    }
                    
                }            
                return barHeight;
            }

            return y(0) - y(Math.abs(d.value))
                        
        }

        function rectFill(d: waterfallDatum){
            if(d.start! <= d.end!){
                return colors.inflows
            }else {
                return colors.outflows
            }
        }

        const barAnimDuration = 300
        const bars =  canvas
            .selectAll<SVGRectElement, waterfallDatum>(".bar")
            .data(waterfallData, (d) => d.label)
            .join(
                enter=>enter.append("rect")
                    .attr("class", "bar")
                    .attr("x", xPos)
                    .attr("width", x0.bandwidth())
                    .attr("y", (d, i)=> changeBy.current === "data" ?
                        (d.type === "total"?y(0):y(d.start)):
                        y(0)
                    )                    
                    .attr("height", 0)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .style("fill", rectFill)
                        .transition().duration(barAnimDuration)
                        .delay((_, i)=> {
                            return 0//changeBy.current === "data"?((i + 1) * barAnimDuration):0
                        })
                    .attr("y", yPos)
                    .attr("height", rectHeight)
                    .on("end", function(_, i){                        
                        if(changeBy.current === "data" && mode === "waterfall"){
                            if(i === formattedData.length - 1){
                                canLegendHover.current = true
                            }                            
                        }else{
                            canLegendHover.current = true
                        }
                    }),
                update=>{                                        
                    if(mode === "waterfall" && changeBy.current === "data"){
                        update.transition().duration(animDuration)
                            .style("fill", rectFill)
                            .attr("x", xPos)
                            .attr("width", x0.bandwidth())
                            .attr("y", (d)=> {                      
                                return d.type === "total"?y(0):y(d.start)
                            })
                            .attr("height", 0)
                            .attr("rx", 5)
                            .attr("ry", 5)
                        .transition().duration(barAnimDuration)
                        .delay((d, i)=> 0
                            //(i + 1) * barAnimDuration
                        )            
                            .attr("y", yPos)
                            .attr("height", rectHeight)
                        .on("end", function(_, i){
                            if(changeBy.current === "data" && mode === "waterfall"){
                            if(i === formattedData.length - 1){
                                    canLegendHover.current = true
                                }                            
                            }else{
                                canLegendHover.current = true
                            }
                        })
                    }else{
                        update.transition().duration(barAnimDuration)
                            .style("fill", rectFill)
                            .attr("x", xPos)
                            .attr("width", x0.bandwidth())
                            .attr("y", yPos)
                            .attr("height", rectHeight)
                            .on("end", function(_, i){
                                canLegendHover.current = true                                
                            })
                    }

                    return update
                },
                exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
            )
        

    }, [effectiveTimeframe, data, width, height, mode, isSorted,  {prefix, suffix, formatType}]);
    
    const CHEVRON_SIZE = 20
    const chevronFill = "#4ade80"
    
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column' }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column" }}>
                <div                     
                    className={`controls ${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                >          
                    <label 
                        className={`
                            ${styles["controls-label"]} 
                            ${waterfallStyles.sort} 
                            ${mode!=="waterfall"?waterfallStyles.visible:""}
                        `} 
                        style={{paddingRight: '12px'}}
                    >
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
                    style={{ display:"flex", flexDirection:"column" }}>
            
                    <svg                
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}
                        style={{ }}
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        {/* Left Chevron */}
                        <g
                            transform={`translate(10, ${height / 2})`}
                            style={{ 
                                cursor: "pointer", 
                                opacity: plottedTimeframe > 0?1:0,
                                pointerEvents: plottedTimeframe > 0?"auto":"none"
                            }}
                            onClick={() => {                                
                                if(plottedTimeframe > 0){
                                    setPlottedTimeframe(plottedTimeframe - 1)
                                }
                            }}
                            className='chevron chevron-left'
                        >
                            <path
                                d={`
                                    M ${CHEVRON_SIZE / 2} ${-CHEVRON_SIZE / 2}
                                    L ${-CHEVRON_SIZE / 2} 0
                                    L ${CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                `}
                                fill={chevronFill}
                                stroke="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* Right Chevron */}
                        <g
                            transform={`translate(${width - 10}, ${height / 2})`}
                            style={{ 
                                cursor: "pointer", 
                                opacity: (plottedTimeframe < data.length - 1 && plottedTimeframe > -1)?
                                    1:0,
                                pointerEvents: (plottedTimeframe < data.length - 1 && plottedTimeframe > -1)?"auto":"none"
                            }}
                            onClick={() => {                                
                                if(plottedTimeframe < data.length - 1){
                                    setPlottedTimeframe(plottedTimeframe + 1)
                                }
                            }}
                            className='chevron chevron-right'
                        >
                            <path
                                d={`
                                    M ${-CHEVRON_SIZE / 2} ${-CHEVRON_SIZE / 2}
                                    L ${CHEVRON_SIZE / 2} 0
                                    L ${-CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                `}
                                fill={ chevronFill }
                                stroke="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* Up Chevron */}
                        <g
                            transform={`translate(${width / 2}, 10)`}
                            style={{ 
                                cursor: "pointer", 
                                opacity: plottedTimeframe > -1?1:0,
                                pointerEvents: plottedTimeframe > -1?"auto":"none"
                            }}
                            onClick={() => {                                
                                setPlottedTimeframe(-1)
                            }}
                            className='chevron chevron-top'
                        >
                            <path
                                d={`
                                    M ${-CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                    L 0 ${-CHEVRON_SIZE / 2}
                                    L ${CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                `}
                                fill={ chevronFill }
                                stroke="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                        
                        <g className="plot-area">                            
                            <g className={`${styles["value-axis"]} y-axis`} />
                            <g className={`${waterfallStyles["x-axis"]} x-axis`} />
                            <line className='zero-line' stroke="currentColor" strokeWidth={1} />     
                        </g>  
                                             
                    </svg>            
                
                <Tooltip />
                </div>
            </div>
        </div>
    );
}