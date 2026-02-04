import React from 'react';
import { 
    schemeCategory10, timeParse, select, extent, scaleTime, scaleLinear, axisBottom, axisLeft, 
    max, min, line, bisector, pointer, Selection, BaseType, area, brushX, D3BrushEvent,
    //curveLinear, curveBasis, curveCardinal, curveCatmullRom, curveNatural
} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import styles from '../global.module.css';
import stockStyles from './stockprice.module.css'
import { createWeeklyData, createMonthlyData } from './utils';
import { basicFormat } from '../../utils';
import { tooltipFormat } from '../../types';
import { lineDatum, stockData, stockDataFormatted, tooltipData, tooltipPosData } from './types'

type stockPriceProps = {
    data: stockData[];
    timeframe?: "daily" | "weekly" | "monthly";
    mode?: "linechart" | "candlestick";
    tooltipFormat?: tooltipFormat;
}

export function StockPriceChart({ data, timeframe = "daily", mode = "linechart", tooltipFormat = { prefix: "", suffix: ""} }: stockPriceProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;    
    
    const animDuration = 750;    
        
    const renderDeps = [ data, timeframe, mode, width, height, tooltipFormat]                

    const color = schemeCategory10

    type ValueKey = 'open' | 'hi' | 'low' | 'close';    
    const colorDomain: ValueKey[] = Object.keys(data[0])
            .filter((key): key is ValueKey => key !== "date" && key !== "volume" && key !== "adj_close") as ValueKey[];
        //color.domain(keys(JKSEData[0]).filter(function(key) { return key !== "date" && key !== "volume"; }));

    const  margin = {top: 0, right: 30, bottom: 20, left: 60}

    const isMediumScreen = width > 576;

    const candleColor = {
        bullish: "#047857", bearish: "#be123c"
    }

    const chartRef = useD3<HTMLDivElement>((container) => {        
        if (width === 0 || height === 0) return;                
                                     
        const miniSectionHeight = 40//there are 2 mini-section: volume group and brush group
        const miniSectionTotalHeight = miniSectionHeight + margin.bottom

        const chartWidth = width - margin.left - margin.right
        const visualHeight = height - margin.top - margin.bottom
        const chartHeight = visualHeight - (2 * miniSectionTotalHeight)

        const svg = container.select<SVGSVGElement>("svg")
        const svgNode = svg.node()
        const canvas = svg.select<SVGGElement>('.plot-area')  
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");  
                
        svg.selectAll("defs").remove()
        svg.append("defs").append("clipPath")
            .attr("id", "clip")
        .append("rect")
            .attr("width", chartWidth)
            .attr("height", visualHeight);

        const volumeCanvas = svg.select(".volume-area")
            .attr("transform", "translate(" + margin.left + "," + (chartHeight + margin.top + margin.bottom) + ")");
        
        const brushCanvas = svg.select(".brush-area")
            .attr("transform", "translate(" + margin.left + "," + (chartHeight + margin.top + margin.bottom + miniSectionTotalHeight) + ")");
                
        const formatData = (d:stockData) => {
            const parsedDate = timeParse("%Y-%m-%d")(d.date);
            return { 
                date : new Date(parsedDate || new Date()),
                open: +d.open,
                hi: +d.hi,
                low: +d.low,
                close: +d.close,
                adj_close: +d.adj_close,
                volume: +d.volume 
            }
        }

        const formattedData:stockDataFormatted[] = data.map(d => formatData(d))
        
        const weeklyData = timeframe === "weekly"?createWeeklyData(formattedData):[]        
        const monthlyData = timeframe === "monthly"?createMonthlyData(formattedData):[]
        const chartData = timeframe === "daily"?formattedData:
                timeframe === "weekly"?weeklyData:
                    timeframe === "monthly"?monthlyData:
                        []        

        const sources = colorDomain.map(function(name: ValueKey) {                
            return {
                name: name,
                values: formattedData.map(function(d) {
                    return {date: d.date, value: +d[name]};
                })
            };
        });

        const baseXDomain = extent(formattedData, function(d) { return d.date; }) as [Date, Date]
        const x = scaleTime()
            .domain(baseXDomain)
            .range([ 0, chartWidth ]);        

        const xAxisTextClass = !isMediumScreen?stockStyles.rotatedAxisText:
            stockStyles.axisText;

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", "translate(0," + chartHeight + ")")
            .call(axisBottom(x))
            .selectAll("text")
            .attr("class", xAxisTextClass);;

        const maxValue = max(sources, function(c) { return max(c.values, function(v) { return v.value; }); }) || 0
        const minValue = min(sources, function(c) { return min(c.values, function(v) { return v.value; }); }) || 0                        
        const y = scaleLinear()
            .domain([minValue, maxValue])
            .range([ chartHeight, 0 ]);
        
        const yAxis = axisLeft(y).tickSize(-chartWidth)
        canvas.select<SVGGElement>(".y-axis")
            .call(yAxis);

        canvas.selectAll("path.chartline").remove()
        const priceLine = line<lineDatum>()
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })       
                    

        if(mode === "linechart"){
            sources.forEach((d, i) => {
                canvas.insert("path", "g.tooltip")
                    .attr("class", "chartline")  
                    .datum(d.values)
                    .attr("fill", "none")
                    .attr("stroke", color[i] )
                    .attr("stroke-width", 1)
                    .attr("d", priceLine)
                    .attr("clip-path", "url(#clip)");
            })
        }        
        
        canvas.selectAll("path.candle").remove()

        const candleFill = (d: stockDataFormatted) => {
            if(d.open >= d.close)return candleColor.bullish;
            else return candleColor.bearish;
        }
        if(mode === "candlestick"){                        
            canvas.selectAll<SVGGElement, stockDataFormatted>("path.candle")
                .data(chartData)
                .join(
                    enter=>enter.insert("path", "g.tooltip")
                        .attr("class", "candle")
                        .attr("d", function(d){
                            return drawCandle(d, y);
                        })		
                        .style("fill", candleFill)
                        .attr("clip-path", "url(#clip)"),
                    undefined,
                    exit=>exit.remove()
                )
                .on("pointerenter", function(e, d){                    
                    const {date, open, hi, low, close, volume} = d
                    const candleWidth = select(this).node()?.getBBox().width ?? 0
                    setTooltip({ date, open, hi, low, close, volume })
                    setTooltipPosition({ xPos:x(date) + (candleWidth / 2), low, volume })            
                })
                .on("pointerout", pointerleft)
                .attr("d", function(d){
                    return drawCandle(d, y);
                })		
                .style("fill", candleFill)
            
        }
        
        const tooltip = canvas.select("g.tooltip").style("pointer-events", "none")
        const volumeTooltip = volumeCanvas.select("g.tooltip").style("pointer-events", "none")

        canvas.select("rect.overlay")
            .attr("width", chartWidth).attr("height", chartHeight)
            .style("fill", "none")
            .style("pointer-events", mode === "linechart"?"all":"none")            
            .on("pointerenter pointermove", pointermoved)
            .on("pointerleave", pointerleft)
            .on("touchstart", event => event.preventDefault())
        
        function formatDate(date: Date) {
            return date.toLocaleString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC"
            });
        }
            
        function pointermoved(e: PointerEvent){
            if(mode === "candlestick"){
                return
            }
            const tooltipData = mode === "linechart"? formattedData:chartData            

            const bisect = bisector((d: typeof tooltipData[0]) => d.date).center;
            const i = bisect(tooltipData, x.invert(pointer(e)[0]));                

            const {date, open, hi, low, close, volume} = tooltipData[i]                                        

            setTooltip({ date, open, hi, low, close, volume })
            setTooltipPosition({ xPos:x(date), low, volume })            
        }
        
        const setTooltipPosition = (tooltipPosData: tooltipPosData) => {
            const {xPos, low, volume} = tooltipPosData
            tooltip.style("display", null);
            tooltip.attr("transform", `translate(${xPos},${y(low as number)})`);            

            volumeTooltip.style("display", null);
            volumeTooltip.attr("transform", `translate(${xPos},${yVolumeScale(volume as number)})`);        
        }
        
        const setTooltip = (tooltipData: tooltipData) => {
            const { prefix, suffix } = tooltipFormat
            const { date, open, hi, low, close, volume} = tooltipData
            const tooltipPath = tooltip.selectAll("path")
                .data([null])
                .join("path")
                    .attr("fill", "white")
                    .attr("stroke", "black");
            
            const tooplipText = tooltip.selectAll<SVGTextElement, unknown>("text")
                .data([null] as unknown[])
                .join("text")
                .call(text => text
                    .selectAll("tspan")
                    .data([
                        formatDate(date), 
                        `open: ${basicFormat(open as number, { prefix, suffix })}`, 
                        `hi: ${basicFormat(hi as number, { prefix, suffix })}`, 
                        `low: ${basicFormat(low as number, { prefix, suffix })}`, 
                        `close: ${basicFormat(close as number, { prefix, suffix })}`
                    ])
                    .join("tspan")
                    .attr("x", 0)
                    .attr("y", (_, i) => `${i * 1.1}em`)
                    .attr("font-weight", (_, i) => i ? null : "bold")
                    .style("align", "right")
                    .text(d => d));

            size(tooplipText, tooltipPath as Selection<SVGPathElement | null, unknown, null, undefined>);

            const volTooltipPath = volumeTooltip.selectAll("path")
                .data([null] as unknown[])
                .join("path")
                    .attr("fill", "white")
                    .attr("stroke", "black");
            
            const volTooplipText = volumeTooltip.selectAll<SVGTextElement, unknown>("text")
                .data([null] as unknown[])
                .join("text")
                .call(text => text
                    .selectAll("tspan")
                    .data(["Trading Volume", basicFormat(volume as number)])
                    .join("tspan")                        
                    .attr("x", 0)
                    .attr("y", (_, i) => `${i * 1.1}em`)
                    .attr("font-weight", (_, i) => i ? null : "bold")
                    .text(d => d));
            
            size(volTooplipText, volTooltipPath as Selection<SVGPathElement | null, unknown, null, undefined>)

            brushCanvas.transition().duration(animDuration/4).style("opacity", 0)
        }

        function pointerleft(e: PointerEvent){            
            tooltip.style("display", "none");
            volumeTooltip.style("display", "none")

            brushCanvas.transition().duration(animDuration/4).style("opacity", 1)
        }

        function size(text: Selection<SVGTextElement, unknown, BaseType, unknown>, path: Selection<SVGPathElement | null, unknown, null, undefined>) {
            const {x, y, width: w, height: h} = text.node()!.getBBox();
            text.attr("transform", `translate(${-w / 2},${15 - y})`);
            path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
        }

        const yVolumeScale = scaleLinear()
            .domain([
                0, 
                max(data, 
                    function(d){return typeof d.volume === "string"?
                        parseInt(d.volume):d.volume;}) as number
            ])
            .range([miniSectionHeight, 0]);

        const areaVolume = area<stockDataFormatted>()
            .x(function(d){return x(new Date(d.date));})
            .y0(yVolumeScale(0))
            .y1(function(d){return yVolumeScale(typeof d.volume === "string" ? parseInt(d.volume) : d.volume);});

        volumeCanvas.selectAll("path.area").remove()
        volumeCanvas.insert("path", "g.tooltip")
            .datum(formattedData)      
            .attr("class", "area")
            .attr("d", areaVolume)	  
            .style("fill", "lightgray")
            .style("stroke", "none")
            //.style("opacity", 0)
            .attr("clip-path", "url(#clip)");

        volumeCanvas.select<SVGGElement>(".x-axis")
            .attr("transform", "translate(0," + miniSectionHeight + ")")
            .call(axisBottom(x))
            .selectAll("text")
            .attr("class", xAxisTextClass);;

        const xBrush = scaleTime()
            .domain(baseXDomain as [Date, Date])
            .range([0, chartWidth])
            
        const yBrush = scaleLinear()
            .domain([minValue, maxValue])
            .range([ miniSectionHeight, 0 ]);

        const brushLine = line<{ date: Date; value: number }>()
                .x(function(d) { return xBrush(d.date) })
                .y(function(d) { return yBrush(d.value) })

        brushCanvas.selectAll("path.line").remove()
        brushCanvas.selectAll("g.brush").remove()
        
        if(mode === "linechart"){
            sources.forEach((d, i) => {
                brushCanvas.append("path")
                    .attr("class", "line")  
                    .datum(d.values)
                    .attr("fill", "none")
                    .attr("stroke", color[i] )
                    .attr("stroke-width", 1)
                    .attr("d", brushLine)
                    .attr("clip-path", "url(#clip)");
            })
        }
        
        brushCanvas.selectAll("path.candle").remove()

        if(mode === "candlestick"){                        
            brushCanvas.selectAll<SVGGElement, stockDataFormatted>("path.candle")
                .data(chartData)
                .join(
                    enter=>enter.insert("path", "g.tooltip")
                        .attr("class", "candle")
                        .attr("d", function(d){
                            return drawCandle(d, yBrush);
                        })		
                        .style("fill", candleFill)
                        .attr("clip-path", "url(#clip)"),
                    undefined,
                    exit=>exit.remove()
                )
                .attr("d", function(d){
                    return drawCandle(d, yBrush);
                })		
                .style("fill", candleFill)
            
        }

        brushCanvas.select<SVGGElement>(".x-axis")
            .attr("transform", "translate(0," + miniSectionHeight + ")")
            .call(axisBottom(xBrush))
            .selectAll("text")
            .attr("class", xAxisTextClass);;

        const brush = brushX()                   // Add the brush feature using the brush function
            .extent( [ [0,0], [width,miniSectionHeight] ] )  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area                            
            .on("brush", updateChart)  
        
        brushCanvas.append("g")
            .attr("class", "brush")
            .call(brush);            

        function updateChart(e: D3BrushEvent<unknown>) {

            // What are the selected boundaries?
            //const extent = event.selection                
            const extent = e.selection
        
            if(extent){                    
                x.domain([ xBrush.invert(extent[0] as number), xBrush.invert(extent[1] as number) ])
                
            }                
            else if(!extent || extent === null){                    
                x.domain(baseXDomain)
            }            
            
            // Update axis and line position
            redraw()
            
        }

        svg.on("dblclick",function(){
            x.domain(baseXDomain as [Date, Date])

            brushCanvas.select<SVGGElement>(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
            redraw()
        });

        const redraw = () => {
            canvas.select<SVGGElement>(".x-axis")                   
                .call(axisBottom(x))
                .selectAll("text")
                .attr("class", xAxisTextClass);;
            if(mode === "candlestick"){
                canvas.selectAll<SVGGElement, stockDataFormatted>("path.candle")
                    .attr("d", function(d){
                        return drawCandle(d, y);
                    })
            }
            else if(mode === "linechart"){
                canvas
                    .selectAll<SVGPathElement, lineDatum[]>('path.chartline')
                    .attr("d", priceLine)
            }                            

            volumeCanvas.select<SVGGElement>(".x-axis")                   
                .call(axisBottom(x))
                .selectAll("text")
                .attr("class", xAxisTextClass);;

            volumeCanvas
                .selectAll<SVGPathElement, stockDataFormatted[]>('path.area')
                .attr("d", areaVolume)
        }
        
        function calculateBarNShoulderWidth(){
            const barWidth = x(chartData[1].date) - x(chartData[0].date)

            const shoulderWidth = (barWidth - (barWidth * 0.2))/2;

            return {barWidth, shoulderWidth}
        }

        function drawCandle(d:stockDataFormatted, scale: (value: number) => number){
            let pathStart, pathEnd;
            if(d.open >= d.close){
                pathStart = d.open;pathEnd = d.close;
            }else{ pathStart = d.close; pathEnd = d.open; }

            const {barWidth, shoulderWidth} = calculateBarNShoulderWidth()
                
            const barHeight = scale(pathStart) - scale(pathEnd);
            const hiHeight = scale(d.hi) - scale(pathStart);//..candle to hi distance....
            const loHeight = scale(d.low) - scale(pathEnd);//...candle to low distance....    
                                                    
            return "M " + x(d.date) + "," + scale(pathStart) + " " + (x(d.date) + shoulderWidth) + "," + scale(pathStart)
                + " " + (x(d.date) + shoulderWidth) + "," + (scale(pathStart) + hiHeight) + " " + ((x(d.date) + shoulderWidth) + (barWidth * 0.2)) + "," + (scale(pathStart) + hiHeight)
                + " " + ((x(d.date) + shoulderWidth) + (barWidth * 0.2)) + "," + scale(pathStart)+ " " + (x(d.date) + barWidth) + "," + scale(pathStart)
                + " " + (x(d.date) + barWidth) + "," + scale(pathEnd) + " " + (x(d.date) + shoulderWidth + (barWidth * 0.2)) + "," + scale(pathEnd)
                + " " + (x(d.date) + shoulderWidth + (barWidth * 0.2)) + "," + (scale(pathEnd) + loHeight)
                + " " + (x(d.date) + shoulderWidth) + "," + (scale(pathEnd) + loHeight)+ " " + (x(d.date) + shoulderWidth) + "," + scale(pathEnd) 
                + " " + x(d.date) + "," + scale(pathEnd) + "z";	
        }
    }, [ ...renderDeps, tooltipFormat ]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: width, height: height, display:'flex', flexDirection:'column' }}
        >                        
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column"}}>
                <div          
                    className={`${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                    style={{ gap: 2, height: 24 }}
                >
                    { 
                        mode === "linechart" && 
                        colorDomain.map((d: string, i: number)=>{
                            return (
                                <div 
                                    key={d}
                                    style={{ 
                                        display: "flex", flexDirection:"column", 
                                        justifyContent: "start", alignItems: "center"
                                    }}
                                >
                                    <div style={{width: 16, height: 2.5, borderRadius: 1, backgroundColor: color[i]}} />
                                    <p style={{ padding: 0, margin: 0}}>{d}</p>
                                </div>
                            )
                        })                    
                    }
                    {
                        mode === "candlestick" &&
                        ["bullish", "bearish"].map((d: string) => (
                            <div 
                                key={d}
                                style={{ 
                                    display: "flex", justifyContent: "center", alignItems: "center",
                                    backgroundColor: candleColor[d as keyof typeof candleColor], 
                                    borderRadius: 2.5, padding: "2px 3px"
                                }}
                            >
                                <p style={{color: "white", margin: 0, padding: 0}}>{d}</p>
                            </div>
                        ))
                    }

                </div>
                <svg
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                    viewBox={`0 0 ${width} ${height}`}
                >
                    {
                        width > 0 &&
                        <>
                            <g className="plot-area">
                                <g className={`x-axis ${stockStyles["time-axis"]}`} />
                                <g className={`y-axis ${stockStyles["value-axis"]}`} /> 
                                <rect className="overlay" />        
                                <g className="tooltip" />                     
                            </g>
                            <g className="volume-area">
                                <g className={`x-axis ${stockStyles["time-axis"]}`} />
                                <g className="tooltip" />
                            </g>
                            <g className="brush-area">
                                <g className={`x-axis ${stockStyles["time-axis"]}`} />
                            </g>
                        </>
                    }                                        
                </svg>                
            </div>            
        </div>
    );
}