import React from 'react';
import { 
    schemeCategory10, timeParse, select, extent, scaleTime, scaleLinear, axisBottom, axisLeft, 
    max, min, line, area, bisector, pointer, Selection, BaseType, brushX, D3BrushEvent,
    scaleBand,
    curveLinear, curveBasis, curveCardinal, curveCatmullRom, curveNatural
} from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useLayerIndex } from '../hooks/useLayerIndex';
import styles from './global.module.css';
import stockStyles from './stockprice/stockprice.module.css'
import { tooltipFormat } from '../types';
import { rotateLabels, basicFormat, indexColor } from '../utils';
import { lineChartDatum, pointData } from '../types';

type tooltipDatum = pointData & {
    title: string;
}

type lineDatumProps = {
    datum: lineChartDatum[];
    title: string;
}

type lineChartProps = {
    data: lineDatumProps[];
    xKey: string;
    yValue: string;    
    withBrush?: boolean;
    colorIdx?: number;
    tooltipFormat?: tooltipFormat;
}

export function LineChart({ 
    data, 
    xKey, 
    yValue, 
    withBrush = false,
    colorIdx = 0,
    tooltipFormat = { prefix: "", suffix: ""} 
}: lineChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;    
    
    const animDuration = 750;            

    const renderDeps = [ data, xKey, yValue, withBrush, colorIdx, width, height, tooltipFormat]                        

    const  margin = {top: 10, right: 30, bottom: 25, left: 60}

    const isMediumScreen = width > 576;
    
    const layers = data.map(d => d.title)
    const layersRef = useLayerIndex(layers)

    const chartRef = useD3<HTMLDivElement>((container) => {        
        if (width === 0 || height === 0) return;                
                                     
        const miniSectionHeight = 40
        const miniSectionTotalHeight = miniSectionHeight + margin.bottom

        const chartWidth = width - margin.left - margin.right
        const visualHeight = height - margin.top - margin.bottom
        const chartHeight = visualHeight - (withBrush?miniSectionTotalHeight:0)

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
        
        const firstXValue = data[0].datum[0][xKey];
        const xIsDate = firstXValue instanceof Date
        const xMin = min(data, function(d){ 
            return min(
                d.datum, 
                function(d){ 
                    if(xIsDate){
                        return d[xKey] as Date
                    }else{
                        return typeof d[xKey] === 'number' ? d[xKey] as number : Number(d[xKey])
                    }
                    
                }
            )
        })

        const xMax = max(data, function(d){ 
            return max(
                d.datum, 
                function(d){ 
                    if(xIsDate){
                        return d[xKey] as Date
                    }else{
                        return typeof d[xKey] === 'number' ? d[xKey] as number : Number(d[xKey])
                    }
                    
                }
            )
        })

        const baseXDomain = [xMin, xMax]
        /*
        const baseXDomain = xIsDate
            ? extent(data, (d): Date | undefined => d.datum[xKey] as Date) as [Date, Date]
            : extent(data, (d): number | undefined => typeof d[xKey] === 'number' ? d[xKey] as number : Number(d[xKey]) ) as [number, number];                
        */

        const x = xIsDate
            ? scaleTime().domain(baseXDomain as [Date, Date])
            : scaleLinear()
                .domain(baseXDomain as unknown as [Number, Number]);

        x.range([ 0, chartWidth ]);        

        const xAxisNonDateClass = rotateLabels(chartWidth, xIsDate?([xMin, xMax] as unknown as string[]):[]);

        const xAxisTextClass = xIsDate?!isMediumScreen?stockStyles.rotatedAxisText:
            stockStyles.axisText:xAxisNonDateClass;

        const { prefix, suffix } = tooltipFormat

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", "translate(0," + chartHeight + ")")
            // cast x to any to satisfy TypeScript union incompatibility between ScaleTime and ScaleBand
            .transition().duration(animDuration)
            .call(axisBottom(x as any))
            .selectAll("text")
            .attr("class", xAxisTextClass);

        const valueMin = min(data, (d) => {
            return min(
                d.datum,
                function(d){
                    const val = d[yValue];
                    return typeof val === 'number' ? val : undefined;
                }
            )            
        }) ?? 0

        const valueMax = max(data, (d) => {
            return max(
                d.datum,
                function(d){
                    const val = d[yValue];
                    return typeof val === 'number' ? val : undefined;
                }
            )            
        }) ?? 0
        
        const y = scaleLinear()
            .domain([valueMin, valueMax])
            .rangeRound([chartHeight, 0])
            .nice()  

        const yAxis = axisLeft(y).tickSize(-chartWidth)
            canvas.select<SVGGElement>(".y-axis")
            .transition().duration(animDuration).call(yAxis);

        canvas.selectAll("path.chartline").remove()
        const lineFn = line<lineChartDatum>()
            .x((d) => x(d[xKey as keyof lineChartDatum] as any) as number)
            .y((d) => y(Number(d[yValue as keyof lineChartDatum])))
            //.curve(curveBasis)

        const lineStroke = (i: number) => {
            const layerIndex = layersRef.current.findIndex(layerD => layerD === data[i].title) + colorIdx
            return indexColor(layerIndex, false, true)
        }

        for(let i = 0; i < data.length; i++){
            const theLine = canvas
                .insert("path")              
                .attr("class", "chartline")
            .datum(data[i].datum)                
                .attr("fill", "none")
                .attr("stroke", lineStroke(i))
                .attr("stroke-width", 2)
                .attr("d", lineFn)
                .attr("clip-path", "url(#clip)");
        }
        
        const tooltip = canvas.select("g.tooltip").style("pointer-events", "none")
        tooltip.raise()
        canvas.select("rect.overlay")
            .attr("width", chartWidth).attr("height", chartHeight)
            .style("fill", "red")
            .style("opacity", 0)                                
            .on("pointerenter pointermove", pointermoved)
            .on("pointerleave", pointerleft)
            .on("touchstart", event => event.preventDefault())

        function pointermoved(e: PointerEvent){                        
            
            const bisect = bisector((d: lineChartDatum) => (d[xKey as keyof lineChartDatum] as any) as number).center;
            const i = bisect(data[0].datum, x.invert(pointer(e)[0]));
            
            const hoveredData:lineChartDatum = data[0].datum[i]
            const minY = min(data, function(d){
                return Number(d.datum[i][yValue])
            })
            const tooltipData:tooltipDatum[] = []
            for(let j = 0; j < data.length; j++){                                
                const { title } = data[j]
                const tooltipDatum = data[j].datum[i]
                const label = String(tooltipDatum[xKey])
                const value = Number(tooltipDatum[yValue])

                tooltipData.push({title, label, value})
            }            

            setTooltip(tooltipData)

            //setting tooltip position....            
            const tooltipXPos = x(hoveredData[xKey as keyof lineChartDatum] as any)
            const tooltipYPos = y(minY ?? 0)
            
            tooltip
                .transition().duration(250)
                .style("display", null)
                .attr("transform", `translate(${tooltipXPos},${tooltipYPos})`);             
        }
        
        function pointerleft(e: PointerEvent){
            tooltip.transition().duration(250).style("display", "none");            

            if(withBrush){
                brushCanvas.transition().duration(animDuration/4).style("opacity", 1)
            }            
        }

        function setTooltip(tooltipData:tooltipDatum[]){
            console.log(tooltipData)
            const tooltipPath = tooltip.selectAll("path")
                .data([null])
                .join("path")
                    .attr("fill", "white")
                    .attr("stroke", "black");            

            const tooltipDisplayData: string[] = tooltipData.reduce((acc: string[], curr: tooltipDatum) => {
                const title = curr.title
                const labelValue = curr.label + ": " + (prefix ?? "") + curr.value + (suffix ?? "")

                acc.push(title)
                acc.push(labelValue)
                return acc
            }, [])

            const tooplipText = tooltip.selectAll<SVGTextElement, unknown>("text")
                .data([null] as unknown[])
                .join("text")
                .call(text => text
                    .selectAll("tspan")
                    .data(tooltipDisplayData)
                    .join("tspan")
                    .attr("x", 0)
                    .attr("y", (_, i) => `${i * 1.1}em`)
                    //.attr("font-weight", (_, i) => i ? null : "bold")
                    .style("align", "right")
                    .text(d => d));

            size(tooplipText, tooltipPath as Selection<SVGPathElement | null, unknown, null, undefined>)
            if(withBrush){
                brushCanvas.transition().duration(animDuration/4).style("opacity", 0)
            }
            
        }

        function size(text: Selection<SVGTextElement, unknown, BaseType, unknown>, path: Selection<SVGPathElement | null, unknown, null, undefined>) {
            const {x, y, width: w, height: h} = text.node()!.getBBox();
            text.attr("transform", `translate(${-w / 2},${15 - y})`);
            path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
        }

        const brushCanvas = svg.select(".brush-area")
                .attr("transform", "translate(" + margin.left + "," + (chartHeight + margin.top + margin.bottom) + ")");
        brushCanvas.selectAll("path.line").remove()
        brushCanvas.selectAll("g.brush").remove()
        if(withBrush){            
            const xBrush = xIsDate
                ? scaleTime().domain(baseXDomain as [Date, Date])
                : scaleLinear()
                    .domain(baseXDomain as unknown as [Number, Number])
            xBrush.range([ 0, chartWidth ])
                        
            const yBrush = scaleLinear()
                .domain([valueMin, valueMax])
                .range([ miniSectionHeight, 0 ]);
            
            const brushLineFn = line<lineChartDatum>()
                .x((d) => xBrush(d[xKey as keyof lineChartDatum] as any) as number)
                .y((d) => yBrush(Number(d[yValue as keyof lineChartDatum])))
                //.curve(curveBasis)            

            for(let i = 0; i < data.length; i++){
                brushCanvas.append("path")              
                    .datum(data[i].datum)
                        .attr("class", "line")
                        .attr("fill", "none")
                        .attr("stroke", lineStroke(i))
                        .attr("stroke-width", 2)
                        .attr("d", brushLineFn)
                        .attr("clip-path", "url(#clip)");
            }
            

            brushCanvas.select<SVGGElement>(".x-axis")
                .attr("transform", "translate(0," + miniSectionHeight + ")")
                .call(axisBottom(xBrush))
                .selectAll("text")
                .attr("class", xAxisTextClass);

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
                    const updatedDomain = xIsDate?
                        baseXDomain as [Date, Date]:
                        baseXDomain as unknown as [Number, Number]                    
                    x.domain(updatedDomain)
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
                canvas
                    .selectAll<SVGPathElement, lineChartDatum[]>('path.chartline')
                    .attr("d", lineFn)                                        
            }
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