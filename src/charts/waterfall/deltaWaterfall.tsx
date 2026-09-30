import React, { useEffect, useState, useRef } from 'react';
import {scaleBand, scaleLinear, axisLeft, axisBottom, format, min, max, color} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { formatWaterfallData, colors } from './utils';
import { formatTooltipNum, renderLineChart, rotateLabels } from '../../utils';
import { WaterfallTooltip as Tooltip } from './tooltip';
import { getTooltip, moveTooltip } from '../../components/tooltip';
import styles from '../global.module.css';
import waterfallStyles from './waterfall.module.css'
import { tooltipFormat, lineDecor } from '../../types';
import { deltaWaterfallDatum, waterfallDatum } from './types'

type WaterfallProps = {
    data: deltaWaterfallDatum[];    
    tooltipFormat?: tooltipFormat;
    lineProps?: lineDecor;
}

interface openCloseData {
    label: string;
    data: waterfallDatum;
}

type LegendKey = "open" | "close" | "inflows" | "outflows";

type BarKey = "open" | "close";

export function DeltaWaterfall({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"},
        lineProps: {
            showLine = false, showDots = true, curve = "linear"
        } = {
            showLine: false, showDots: true, curve: "linear"
        }
    }:WaterfallProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize
    const [ plottedTimeframe, setPlottedTimeframe ] = useState(-1)
                
    const [ isSorted, setIsSorted ] = useState(false)
    const changeBy = useRef("data")    
    const canLegendHover = useRef(true)

    const isFirstRender = useRef(true);
    const [ selected, setSelected ] = useState<LegendKey | "">("")

    const dataRef = useRef(data)

    useEffect(() => {            
        if(isFirstRender.current){
            isFirstRender.current = false
        }else{            
            changeBy.current = "mode"            
        }
        //canLegendHover.current = false           
    }, [ selected ])
    
    useEffect(() => {
        dataRef.current = data;
        setPlottedTimeframe(-1)
        setSelected("")
        setIsSorted(false)
        changeBy.current = "dataS"
    }, [data])    

    const effectiveTimeframe =
        dataRef.current !== data
            ? -1
            : plottedTimeframe;

    const isMediumScreen = width > 576;        
        
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
        const openData = selected !== "inflows" && selected !== "outflows" ? 
            effectiveTimeframe === -1?
                baseOpenData:[baseOpenData[effectiveTimeframe]]:
                []
        openData.sort((a, b) => (selected === "open" && isSorted)?b.data.value - a.data.value:0)

        const baseCloseData:openCloseData[] = formattedData.map(d => {
                const baseData = d.data.find(dt => dt.label === "Closing") as waterfallDatum
                const data = baseData?baseData:d.data[d.data.length - 1]

                return { label: d.label, data:{...data, label: "Closing" } }
            })
        const closeData = selected !== "inflows" && selected !== "outflows"?
            effectiveTimeframe === -1?
                baseCloseData:[baseCloseData[effectiveTimeframe]]:
                []
        closeData.sort((a, b) => (selected === "close" && isSorted)?b.data.value - a.data.value:0)        
                
        const keys: BarKey[] = ["open", "close"];        

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")
                
        const legendsData: LegendKey[] = effectiveTimeframe === -1?
            ["open", "close"]:["open", "inflows", "outflows", "close"]

        const legendWidth = 60//isMediumScreen?80:50

        const legendClass = function(d: LegendKey){
            const containerClass = styles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = styles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]
            const containerInactiveClass = styles[isMediumScreen?"legend-container-inactive":"legend-container-inactive-sm"]
            return  `
                ${selected !== ""?
                    selected === d?containerActiveClass:containerInactiveClass:
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

        legends
            .on("click", (e, d)=>{
                if(d === "open" || d === "close"){
                    setPlottedTimeframe(-1)  
                }              
                
                const newSelected = selected === d?"":d
                if(newSelected === ""){ setIsSorted(false) }
                setSelected(newSelected)                
            })

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

        const waterfallMode = selected === "inflows" || selected === "outflows"?selected:"waterfall"

        const filteredWaterfallData = baseWaterfallData.filter(d => d.type !== "total")
        const waterfallData = waterfallMode === "waterfall"?filteredWaterfallData:
            filteredWaterfallData
                .filter(d =>  (waterfallMode === "inflows"?d.start! <= d.end!:d.start > d.end))
                .sort((a, b) => isSorted?(Math.abs(b.value) - Math.abs(a.value)):0)
        
        const valueMin = waterfallMode === "waterfall"?Math.min(...waterfallMins):0
        const valueMax = waterfallMode === "waterfall"?Math.max(...waterfallMaxes):
            Math.max(...waterfallData.map(d => Math.abs(d.value)))

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

        const xLabels = 
            selected === "open" && isSorted?openData.map(d => d.label):
            selected === "close" && isSorted?closeData.map(d => d.label):
            formattedData.map(d => d.label)                
                
        const waterfallXLabels = waterfallMode === "waterfall"?
            baseWaterfallData
                .map(d => {
                    const xLabel = d.label === "Opening"? "open":
                        d.label === "Closing" ? "close":
                            d.label

                    return xLabel
                }):
            waterfallData
                .map(d => d.label)
        
        const labels = effectiveTimeframe === -1?xLabels:waterfallXLabels
        const x0 = scaleBand()
            .domain( labels )
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

        const rotateXLabels = rotateLabels(width, labels)
        const axisClass = rotateXLabels
            ? `${styles.rotatedAxisText} ${waterfallStyles["axis-label-sm"]}`
            : `${styles.axisText} ${waterfallStyles["axis-label"]}`;

        const xAxisTextClass = `${axisClass} ${waterfallStyles["clickable-label"]}`;
                    
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
                if(plottedTimeframe === -1){
                    setPlottedTimeframe(xLabels.indexOf(d as string))
                    setSelected("")
                    setIsSorted(false)
                }                
            })

        const zeroLine = canvas.select("line.zero-line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", graphWidth).attr("y2", 0)
                .transition().duration(animDuration)
            .attr("transform", `translate(0, ${y(0) || 0})`)

        const labelSize = 12
        type drawLabelsParams<T extends openCloseData | waterfallDatum> = {
            labelData: T[];
            xPos: (d: T, i: number) => number;
            barWidth: number;
            yPos: (d: T, i: number) => number;
            barHeight: (d: T, i: number) => number;
            labelFor?: "open" | "close";
            
        }
        const drawLabels = <T extends openCloseData | waterfallDatum>(
            {
                labelData, xPos, barWidth, yPos, barHeight, labelFor 
            }: drawLabelsParams<T>
        ) => {
            //when not waterfall mode, labelData is []
            //therefore labelData[0] is undefined
            const labelMode = labelData[0] && "data" in labelData[0]?"openClose":"waterfall"

            function textXPos(d: T, i: number){
                const baseXPosition = xPos(d, i)

                return baseXPosition + ( barWidth / 2 )
            }
            function textYPos(d: T, i: number){
                const yPosition = yPos(d, i)
                const textPadding = 12                            
                const height = barHeight(d, i)
                return yPosition + (height/2) + (labelSize/2)
            }            
            
            function textOpacity(d: T, i: number){

                if(selected === "open" && labelFor === "close"){
                    return 0
                }
                if(selected === "close" && labelFor === "open"){
                    return 0
                }
                const height = barHeight(d, i)
                return height >= 20 && barWidth >= 20?1:0
            }

            const labelText = (d: T) => {
                const value = labelMode === "openClose"?(d as openCloseData).data.value:
                    (d as waterfallDatum).value

                return format("~s")
                    (waterfallMode !== "waterfall"?Math.abs(value):value)
            }

            const labelClass = labelFor ? `${labelFor}label`:"label"
            const labels = canvas
                .selectAll<SVGTextElement, T>(`.${labelClass}`)
                .data(
                    labelData,
                    d => d?.label + `${labelFor?"-" + labelFor:""}`
                ).join(
                    enter=>enter.append("text")
                        .attr("class", `${labelClass} ${waterfallStyles["label"]}`)
                        .text(labelText)
                        .attr("text-anchor", "middle")
                        .style("font-size", labelSize)                    
                        .style("font-weight", "bold")
                        .style("pointer-events", "none")
                        .style("opacity", 0)                    
                        .attr("x", textXPos)
                        .attr("y", y(0))
                        .transition()
                        .duration(animDuration)
                        //.delay((d, i)=> ((i + 1) * barAnimDuration) + barAnimDuration)
                        .style("opacity", textOpacity)
                        .attr("x", textXPos)
                        .attr("y", textYPos),
                    update=>update
                        .attr("class", `${labelClass} ${waterfallStyles["label"]}`)
                            .text(labelText)
                            .attr("text-anchor", "middle")
                            .style("font-size", labelSize)                    
                            .style("font-weight", "bold")
                        .transition().duration(animDuration)//.delay((d, i)=> (i + 1) * barAnimDuration)
                            .style("opacity", textOpacity)
                            .attr("x", textXPos)
                            .attr("y", textYPos), 
                    exit=>exit.remove()
                )

            return labels
        }

        const xPosOpenClose = (d: openCloseData, type: "open" | "close") => {
            return effectiveTimeframe === -1?(x0(d.label) ?? 0) + (x1(type) ?? 0):
                x0(type) ?? 0
        }
        const barWidthOpenClose = effectiveTimeframe === -1 && selected !== "open" && selected !== "close"? 
            x1.bandwidth():x0.bandwidth()

        const openX = (d: openCloseData, i: number) => xPosOpenClose(d, "open")
        const openY = (d: openCloseData, i: number) => {
            return effectiveTimeframe === -1
                ? (d.data.value >= 0
                    ? y(d.data.value)
                    : y(0))
                : y(Math.max(d.data.start!, d.data.end!));
        }
        const openHeight = (d: openCloseData, i: number) => {
            return effectiveTimeframe === -1
                ? Math.abs(y(d.data.value) - y(0))
                : Math.abs(y(d.data.start!) - y(d.data.end!));
        }
        const openBars = canvas.selectAll<SVGRectElement, openCloseData>(`rect.open`)
            .data(
                openData,
                d => d?.label || "" + " - open"
            )
            .join(
                enter =>
                    enter
                        .append("rect")
                        .attr("class", `open ${styles.bar}`)
                        .attr("fill", colors.open)
                        .attr("y", y(0) ?? 0)
                        .attr("height", 0)
                        .attr("x", openX)
                        .attr("width", barWidthOpenClose),
                undefined,
                exit =>
                    exit.remove()
            )        
            
        openBars
                .transition().duration(animDuration)            
            .attr("x", openX)
            .attr("width", barWidthOpenClose)
            .attr("y", openY)
            .attr("height", openHeight)
            .style("opacity", selected !== "close"?1:0)
            .style("pointer-events", selected !== "close"?"auto":"none");

        const openLabels = drawLabels({
            labelData: openData,
            xPos: openX, barWidth:barWidthOpenClose,
            yPos: openY, barHeight: openHeight,
            labelFor: "open"
        })        

        const closeX = (d: openCloseData, i: number) => xPosOpenClose(d, selected === "close"?"open":"close")
        
        const closeY = (d: openCloseData, i: number) =>
                effectiveTimeframe === -1?
                (d.data.value >= 0
                    ? y(d.data.value)
                    : y(0)):
                    d.data.start! <= d.data.end!?
                        y(d.data.value):y(0)

        const closeHeight = (d: openCloseData, i: number) =>{
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
        }
        const closeBars = canvas.selectAll<SVGRectElement, openCloseData>(`rect.close`)
            .data(closeData,
                (d) => d?.label || "" + " - close"
            )
            .join(
                enter =>
                    enter
                        .append("rect")
                        .attr("class", `close ${styles.bar}`)
                        .attr("fill", colors.close)
                        .attr("y", y(0))
                        .attr("height", 0)
                        .attr("x", closeX)
                        .attr("width", barWidthOpenClose),
                undefined,
                exit => exit.remove()
            )            

        closeBars
                .transition().duration(animDuration)                        
            .attr("x", closeX)
            .attr("width", barWidthOpenClose)
            .attr("y", closeY)
            .attr("height", closeHeight)
            .attr("fill", "orange")
            .style("opacity", selected !== "open"?1:0)
            .style("pointer-events", selected !== "open"?"auto":"none");

        const closeLabels = drawLabels({
            labelData: closeData,
            xPos: closeX, barWidth:barWidthOpenClose,
            yPos: closeY, barHeight: closeHeight,
            labelFor: "close"
        })
                        
        function xPos(d: waterfallDatum){
            const xPosition = x0(d.label as string) ?? 0        
            return xPosition
        }

        function yPos(d: waterfallDatum, i: number){
            if(waterfallMode === "waterfall"){
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
            if(waterfallMode === "waterfall"){
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
            .selectAll<SVGRectElement, waterfallDatum>(`.bar`)
            .data(waterfallData, (d) => d.label)
            .join(
                enter=>enter.append("rect")
                    .attr("class", `bar ${styles.bar}`)
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
                        .transition().duration(animDuration)
                        /*.delay((_, i)=> {
                            return 0//changeBy.current === "data"?((i + 1) * barAnimDuration):0
                        })*/
                    .attr("y", yPos)
                    .attr("height", rectHeight)
                    .on("end", function(_, i){                        
                        if(changeBy.current === "data" && waterfallMode === "waterfall"){
                            if(i === formattedData.length - 1){
                                canLegendHover.current = true
                            }                            
                        }else{
                            canLegendHover.current = true
                        }
                    }),
                update=>{                                        
                    update.transition().duration(animDuration)
                        .style("fill", rectFill)
                        .attr("x", xPos)
                        .attr("width", x0.bandwidth())
                        .attr("y", yPos)
                        .attr("height", rectHeight)
                        .attr("rx", 5)
                        .attr("ry", 5)

                    return update
                },
                exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
            )
        
        const barLabels = drawLabels({
            labelData: waterfallData,
            xPos: xPos, barWidth:x0.bandwidth(),
            yPos: yPos, barHeight: rectHeight,            
        })

        const openLineData = ((selected === "" || selected === "open") && effectiveTimeframe === -1)?
            baseOpenData.map(d => ({label: d.label, value:d.data.value})):[]

        renderLineChart(
            canvas, 
            {
                scale:x0, 
                offset:(effectiveTimeframe === -1 && selected === "")?
                    x1.bandwidth()/2:
                    x0.bandwidth()/2
            }, 
            y, 
            {
                data: openLineData, idExtension: "open"
            }, 
            width, "vertical", 
            { showLine, showDots, curve,
                lineStroke: String(color(colors.open)?.darker()), 
                dotFill: colors.open
            })

        const closeLineData = ((selected === "" || selected === "close") && effectiveTimeframe === -1)?
            baseCloseData.map(d => ({label: d.label, value:d.data.value})):[]
        renderLineChart(
            canvas, 
            {
                scale:x0, 
                offset:(effectiveTimeframe === -1 && selected === "")?
                    ((x0.bandwidth()/2) + (x1.bandwidth()/2)):
                    x0.bandwidth()/2
            }, 
            y, 
            {
                data: closeLineData, idExtension: "close"
            }, 
            width, "vertical", 
            { showLine, showDots, curve, 
                lineStroke: String(color(colors.close)?.darker()), 
                dotFill: colors.close
            })
        
        const baseWaterfallLineData = waterfallMode === "waterfall"?baseWaterfallData:waterfallData
        const waterfallLineData = baseWaterfallLineData
            .map((d, i) => ({
                label: d.label === "Opening"?"open":
                        d.label === "Closing"?"close":
                        d.label, 
                value: 
                    waterfallMode !== "waterfall"?Math.abs(d.value):
                    i !== baseWaterfallData.length - 1?d.end:d.value
            }))
        
        const waterfallLineColor = waterfallMode === "waterfall"?"#2b2b22":
            colors[waterfallMode]
            
        renderLineChart(
            canvas, 
            {
                scale:x0, 
                offset:x0.bandwidth()/2
            }, 
            y, 
            {
                data: waterfallLineData, idExtension: "waterfall"
            }, 
            width, "vertical", 
            { 
                showLine, showDots, curve,
                lineStroke: String(color(waterfallLineColor)?.darker()), 
                dotFill: waterfallLineColor
             }
        )

        const tooltip = getTooltip(container as any)
                    .style("opacity", 0);        

        const tooltipFormat = { formatType, prefix, suffix}

        const displayLabelAndValue = (label: string, value: number) => {
            tooltip.select("p.label span.label span.chev")
                .style("color", value >= 0?colors.inflows:colors.outflows)
                .text(
                    value > 0?"▲":
                    value < 0?"▼":
                    ""
                )
            tooltip.select("p.label span.label span.text").text(label)                
            tooltip.select("p.label span.value").text(formatTooltipNum(value, tooltipFormat))
        }

        const openClosePointerEnter = (e: MouseEvent, d: openCloseData) => {
            const { value, label } = d.data
            displayLabelAndValue(
                d.label + " " + label + " :",
                value
            )            

            tooltip.select("p.from").style("display", "none")
            tooltip.select("p.to").style("display", "none")

            tooltip.style("opacity", 1)
        }
        const pointerMove = (e: MouseEvent) => {
            moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
        }

        const pointerLeave = () => {
            tooltip.style("opacity", 0)
        }
        openBars
            .on("pointerenter", openClosePointerEnter)
            .on("pointermove", pointerMove)
            .on("pointerleave", pointerLeave)

        closeBars
            .on("pointerenter", openClosePointerEnter)
            .on("pointermove", pointerMove)
            .on("pointerleave", pointerLeave)

        bars
            .on("pointerenter", function(e, d){                
                const {label, value} = d
                displayLabelAndValue(label, value)
                if(waterfallMode === "waterfall"){
                    tooltip.select("p.from").style("display", "flex")
                    tooltip.select("p.from span.label").text("from: ")
                    tooltip.select("p.from span.value")
                        .text(formatTooltipNum(d.start, tooltipFormat))

                    tooltip.select("p.to").style("display", "flex")
                    tooltip.select("p.to span.label").text("to: ")
                    tooltip.select("p.to span.value")
                        .text(formatTooltipNum(d.end, tooltipFormat))
                }else{
                    tooltip.select("p.from").style("display", "none")
                    tooltip.select("p.to").style("display", "none")
                }
                tooltip.style("opacity", 1) 
            })
            .on("pointermove", pointerMove)
            .on("pointerleave", pointerLeave)

        
        
        
    }, [effectiveTimeframe, data, width, height, selected, isSorted,  
        { showLine, showDots, curve},
        {prefix, suffix, formatType}]);
    
    const CHEVRON_SIZE = 15    
    
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
                            ${selected !== ""?waterfallStyles.visible:""}
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
                            onClick={() => {                                
                                if(plottedTimeframe > 0){
                                    setPlottedTimeframe(plottedTimeframe - 1)
                                }
                                setSelected("")
                                setIsSorted(false)
                            }}
                            
                            className='chevron chevron-left'
                        >
                            <path
                                className={`
                                    ${waterfallStyles["chevron-initial"]} 
                                    ${                                    
                                        plottedTimeframe === 0?
                                            waterfallStyles["chevron-inactive"]:
                                        plottedTimeframe > 0?waterfallStyles["chevron"]:""
                                }`}
                                d={`
                                    M ${CHEVRON_SIZE / 2} ${-CHEVRON_SIZE / 2}
                                    L ${-CHEVRON_SIZE / 2} 0
                                    L ${CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                    Z
                                `}                                
                            />
                        </g>

                        {/* Right Chevron */}
                        <g
                            transform={`translate(${width - 10}, ${height / 2})`}                            
                            onClick={() => {                                
                                if(plottedTimeframe < data.length - 1){
                                    setPlottedTimeframe(plottedTimeframe + 1)
                                }
                                setSelected("")
                                setIsSorted(false)
                            }}
                            
                            className='chevron chevron-right'                            
                        >
                            <path
                                className={`
                                    ${waterfallStyles["chevron-initial"]} 
                                    ${  
                                        plottedTimeframe > -1 ?                                 
                                        plottedTimeframe < data.length - 1?
                                            waterfallStyles["chevron"]:
                                            waterfallStyles["chevron-inactive"]:
                                        ""
                                }`}
                                d={`
                                    M ${-CHEVRON_SIZE / 2} ${-CHEVRON_SIZE / 2}
                                    L ${CHEVRON_SIZE / 2} 0
                                    L ${-CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                    Z
                                `}
                            />
                        </g>

                        {/* Up Chevron */}
                        <g
                            transform={`translate(${width / 2}, 10)`}                            
                            onClick={() => {                                
                                setPlottedTimeframe(-1)
                                setSelected("")
                                setIsSorted(false)
                            }}
                            className='chevron chevron-top'
                        >
                            <path
                                className={`
                                    ${waterfallStyles["chevron-initial"]} 
                                    ${plottedTimeframe > -1?waterfallStyles["chevron"]:""}
                                `}
                                d={`
                                    M ${-CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                    L 0 ${-CHEVRON_SIZE / 2}
                                    L ${CHEVRON_SIZE / 2} ${CHEVRON_SIZE / 2}
                                    Z
                                `}
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