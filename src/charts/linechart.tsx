import React from 'react';
import { 
    schemeCategory10, timeParse, select, extent, scaleTime, scaleLinear, axisBottom, axisLeft, 
    max, min, line, bisector, pointer, Selection, BaseType, area, brushX, D3BrushEvent,
    scaleBand,
    //curveLinear, curveBasis, curveCardinal, curveCatmullRom, curveNatural
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
    tooltipFormat?: tooltipFormat;
}

export function LineChart({ data, xKey, yValue, tooltipFormat = { prefix: "", suffix: ""} }: lineChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;    
    
    const animDuration = 750;            

    const renderDeps = [ data, xKey, yValue, width, height, tooltipFormat]                        

    const  margin = {top: 10, right: 30, bottom: 20, left: 60}

    const isMediumScreen = width > 576;        

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