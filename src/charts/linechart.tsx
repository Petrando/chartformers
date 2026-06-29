import React from 'react';
import { 
    schemeCategory10, timeParse, select, extent, scaleTime, scaleLinear, axisBottom, axisLeft, 
    max, min, line, area, bisector, pointer, Selection, BaseType, brushX, D3BrushEvent,
    scaleBand,
    curveLinear, curveBasis, curveCardinal, curveCatmullRom, curveNatural
} from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import styles from './global.module.css';
import stockStyles from './stockprice/stockprice.module.css'
import { tooltipFormat } from '../types';
import { rotateLabels, basicFormat } from '../utils';
import { lineChartDatum } from '../types';

type lineChartProps = {
    data: lineChartDatum[];
    xKey: string;
    yValue: string;    
    withBrush?: boolean;
    tooltipFormat?: tooltipFormat;
}

export function LineChart({ 
    data, 
    xKey, 
    yValue, 
    withBrush = false,
    tooltipFormat = { prefix: "", suffix: ""} 
}: lineChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;    
    
    const animDuration = 750;            

    const renderDeps = [ data, xKey, yValue, withBrush, width, height, tooltipFormat]                        

    const  margin = {top: 10, right: 30, bottom: 25, left: 60}

    const isMediumScreen = width > 576;        

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
        
        const firstXValue = data[0][xKey];
        const xIsDate = firstXValue instanceof Date
        const baseXDomain = xIsDate
            ? extent(data, (d): Date | undefined => d[xKey] as Date) as [Date, Date]
            : extent(data, (d): number | undefined => typeof d[xKey] === 'number' ? d[xKey] as number : Number(d[xKey]) ) as [number, number];                

        const x = xIsDate
            ? scaleTime().domain(baseXDomain as [Date, Date])
            : scaleLinear()
                .domain(baseXDomain);

        x.range([ 0, chartWidth ]);        

        const xAxisNonDateClass = rotateLabels(chartWidth, xIsDate?(baseXDomain as unknown as string[]):[]);

        const xAxisTextClass = xIsDate?!isMediumScreen?stockStyles.rotatedAxisText:
            stockStyles.axisText:xAxisNonDateClass;

        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", "translate(0," + chartHeight + ")")
            // cast x to any to satisfy TypeScript union incompatibility between ScaleTime and ScaleBand
            .transition().duration(animDuration)
            .call(axisBottom(x as any))
            .selectAll("text")
            .attr("class", xAxisTextClass);

        const valueMin = min(data, (d) => {
            const val = d[yValue];
            return typeof val === 'number' ? val : undefined;
        }) ?? 0

        const valueMax = max(data, (d) => {
            const val = d[yValue];
            return typeof val === 'number' ? val : undefined;
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

        const theLine = canvas.append("path")              
            .datum(data)
                .attr("class", "chartline")
                .attr("fill", "none")
                .attr("stroke", "black" )
                .attr("stroke-width", 2)
                .attr("d", lineFn)
                .attr("clip-path", "url(#clip)");

        canvas.select("rect.overlay")
            .attr("width", chartWidth).attr("height", chartHeight)
            .style("fill", "none")                                
            .on("pointerenter pointermove", pointermoved)
            .on("pointerleave", pointerleft)
            .on("touchstart", event => event.preventDefault())

        function pointermoved(){

        }

        function pointerleft(){}

        const brushCanvas = svg.select(".brush-area")
                .attr("transform", "translate(" + margin.left + "," + (chartHeight + margin.top + margin.bottom) + ")");
        brushCanvas.selectAll("path.line").remove()
        brushCanvas.selectAll("g.brush").remove()
        if(withBrush){            
            const xBrush = xIsDate
                ? scaleTime().domain(baseXDomain as [Date, Date])
                : scaleLinear()
                    .domain(baseXDomain)
            xBrush.range([ 0, chartWidth ])
                        
            const yBrush = scaleLinear()
                .domain([valueMin, valueMax])
                .range([ miniSectionHeight, 0 ]);
            
            const brushLineFn = line<lineChartDatum>()
                .x((d) => xBrush(d[xKey as keyof lineChartDatum] as any) as number)
                .y((d) => yBrush(Number(d[yValue as keyof lineChartDatum])))
                //.curve(curveBasis)            

            brushCanvas.append("path")              
                .datum(data)
                    .attr("class", "line")
                    .attr("fill", "none")
                    .attr("stroke", "black" )
                    .attr("stroke-width", 2)
                    .attr("d", brushLineFn)
                    .attr("clip-path", "url(#clip)");

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