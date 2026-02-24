import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import { axisBottom, axisLeft, format, max, ScaleBand, scaleBand, ScaleLinear, scaleLinear, select, Series, stack } from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import { inactiveColor } from '../../../dev/data/constants';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { LayeredData, ExtendedSeriesPointWithSorted, ExtendedSeriesWithSorted, StackedBarChartProps } from './types';
import { useUIControls } from '../../hooks/useUIControls';

type modeType =  'stacked' | 'grouped' | 'percentage';

type MorphStackedBarChartProps =
    StackedBarChartProps & {
        focusOnPlot?: boolean;
        mode?: modeType;
};

export function MorphStackedBarChart({ 
    data, colorIdx = 0, mode = 'stacked', orientation = 'vertical', focusOnPlot = true, tooltipFormat 
}: MorphStackedBarChartProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const [prevMode, setPrevMode] = useState<modeType>("stacked")
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();
    const { height: controlsHeight } = controlsSize;
    const [ chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize

    const [prevData, setPrevData] = useState<LayeredData[] | null>(null);
    
    const [dataJustChanged, setDataJustChanged] = useState(false)
    const [plotted, setPlotted] = useState<string[]>(["all"]);
    const [justPlotted, setJustPlotted] = useState<boolean>(false)
    const [hovered, setHovered] = useState<string>("")    
    const [isSorted, setIsSorted] = useState<boolean>(false);
    
    const uiControls = useUIControls();  
    
    const stackData = data
    useEffect(() => {
        setPlotted(["all"])
        setDataJustChanged(true)
        setIsSorted(false)
    }, [stackData])    
    
    const animDuration = 750;
    useEffect(()=>{
        let timer: ReturnType<typeof setTimeout>;
        if(dataJustChanged){
            timer = setTimeout(()=>{setDataJustChanged(false)}, animDuration + 500)
        }
        return () => { clearTimeout(timer)}
    }, [dataJustChanged]) 
        
    const renderDeps = [ width, height, plotted, colorIdx ]

    const chartData:LayeredData[] = cloneObj(stackData);                        
    const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];

    const layers = useLayerIndex(keys)
    const isMediumScreen = width > 576;

    const legendRef = useD3<HTMLDivElement>((container) => { 
        if(dataJustChanged) return
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

        const legends = container.selectAll<HTMLDivElement, string>(".legend-item")
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
                    .remove().remove()
            )        

        legends
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
                setJustPlotted(true)
            })
            .on("mouseover", (e, d)=>{
                setHovered(d)
            })
            .on("mouseout", (e, d)=>{
                setHovered("")
            })
                        
    }, [...renderDeps, keys, dataJustChanged]);

    // Define the controls element (checkbox)
    const controls = (
        <div 
            ref={controlsRef}
            className={`${styles[isMediumScreen?"controls-container":"controls-container-sm"]} ${uiControls?styles["fill-container"]:""}`}
        >
            <label className={`${styles["controls-label"]}`} style={{paddingRight: '12px'}}>
                <input 
                    type="checkbox" 
                    className={`${styles["controls-checkbox"]}`} 
                    checked={isSorted}
                    onChange={(e) => setIsSorted(e.target.checked)}                    
                />
                    Sort
            </label>
            <div 
                ref={legendRef}            
                className={`${stackedBarStyles["legends-container"]}`}
            />
        </div>
    );

    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        if(hovered !== "" && dataJustChanged) return
        
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };          
                    
        chartData.forEach(function(d: LayeredData) {
            d.total = keys.reduce((acc, curr) => {
                if(!(curr in d)){
                    d[curr] = 0
                }
                const value = d[curr];
                return acc + (typeof value === 'number' ? value : Number(value));
            }, 0);
        });  

        const filteredData = chartData

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
                        
        if(prevMode !== mode){
            setPrevMode(mode)
        }

        const graphWidth = width - margin.left - margin.right,
            graphHeight = height - margin.top - margin.bottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const xLabels = sortedData.map(function(d:LayeredData) { return d.label; });            

        const prevXLabels = prevData === null?[]:
                prevData.map(d => d.name)

        const x: ScaleBand<string> = scaleBand<string>()
                .rangeRound([0, graphWidth])
                .domain(xLabels)
                .paddingInner(0.1)
                .align(0.2) 

        const xAxis = axisBottom(x)
                .tickValues(x.domain())
                .tickSizeOuter(0)

        const xAxisTextClass = (!isMediumScreen && orientation === 'vertical')?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;

        canvas.select<SVGGElement>(".x-axis")                        
                .attr("transform", `translate(0,${graphHeight})`)
                .transition().duration(animDuration)
                .call(xAxis) 
                .selectAll("text")
                .style("cursor", "pointer")
                .attr("dy", !isMediumScreen ? ".20em" : "1em")
                .attr("dx", !isMediumScreen ? "-.8em" : "0em")
                .attr("class", xAxisTextClass)
                .selectAll(".tick")
                .filter(d => d === 0)
                .select("line")
                .remove()             
                
        const y:ScaleLinear<number, number> = scaleLinear()
                .range([graphHeight, 0]);

        const yMax = mode === "stacked"?(focusOnPlot?(plotted[0] === "all"?
                        max(chartData, (d: LayeredData) => d.total):
                            max(chartData, (d: LayeredData) => (d[plotted[0]] as number))):
                        max(chartData, (d: LayeredData) => d.total)):
                    mode === "grouped"?(plotted[0] === "all"
                                    ? max(chartData, d =>
                                        max(
                                        Object.entries(d)
                                            .filter(([key]) => key !== "total" && key !== "label")
                                            .map(([, value]) => value as number)     
                                        )
                                    )
                                    : max(chartData, d => d[plotted[0]] as number)):
                                    1
                                                                    
        y.domain([0, yMax as number]);
        let yAxis = axisLeft(y).ticks(null, mode === "percentage" ?".0%":"s");            
        
        canvas.select<SVGGElement>(".y-axis")  
            .attr("transform", `translate(0,0)`)
            .style("color", "steelblue")          
                .transition().duration(animDuration)
                    .delay((prevMode === "stacked" && mode === "grouped")?1000:0)
            .call(yAxis)

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);

        let isFirstRender = false;
        if(prevData === null){
            isFirstRender = true;
            setPrevData(cloneObj(chartData));
        }
        
        const dataLayers: Series<LayeredData, string | string[]>[] =
            stack<LayeredData>().keys(keys)(sortedData);        
        
        const processedDataLayers:ExtendedSeriesWithSorted[] = dataLayers.map((series) => {
            const seriesKey = series.key
            const newSeries = series.map((point) => {
                const sortedLayers = Object.keys(point.data)
                .filter((prop) => prop !== "label" && prop !== "total")
                .map((prop) => ({
                    label: prop,
                    value: point.data[prop],
                }))
                .sort((a, b) => Number(a.value!) - Number(b.value!));

                return {
                    ...point,
                    key: `${seriesKey} - ${point.data.label}`,
                    barKey: seriesKey as string,
                    data: {
                        ...point.data,
                        sortedLayers: sortedLayers.map((d) => d.label),
                    },
                };
            }) as ExtendedSeriesWithSorted

            newSeries.key = seriesKey as string
            return newSeries
        });
        
        function strokeDasharray(d:ExtendedSeriesPointWithSorted){
            if(d.barKey === hovered){
                return "none"
            }
            const rectWidth = x.bandwidth()
            const baseHeight = y(d[0]) - y(d[1])
            const rectHeight = isNaN(baseHeight)?0:baseHeight<0?0:baseHeight    
            
            const isTopLayer = keys.indexOf(d.barKey) === keys.length - 1
                    || d.barKey === plotted[0]
            
            if(mode === "grouped"){
                return "none"                    
            }
            if(isTopLayer){
                return `${rectWidth + rectHeight} ${rectWidth} ${rectHeight}`
            }                
            return `${rectHeight} ${rectWidth}`
        }

        function strokeDashoffset(d:ExtendedSeriesPointWithSorted){
            const rectWidth = x.bandwidth()
            const isTopLayer = keys.indexOf(d.barKey) === keys.length - 1
                || d.barKey === plotted[0]

            return isTopLayer?0:(rectWidth * -1)
        }

        function yPos(d: ExtendedSeriesPointWithSorted){
            if(mode === "grouped"){
                return graphHeight - (y(d[0]) - y(d[1]))
            }                                                               
            return plotted[0]==="all"?y(d[1]):
                d.key.startsWith(plotted[0])?graphHeight - (y(d[0]) - y(d[1])):y(d[1]);
        }

        function rectHeight(d:ExtendedSeriesPointWithSorted){
            const height = y(d[0]) - y(d[1]);
            return height;
        }
        
        const serie = canvas.selectAll<SVGGElement, ExtendedSeriesWithSorted>(".serie")
            .data(processedDataLayers, function(d){return d.key})
            .join(
                enter=>{
                    let g = enter.append("g")
                        .attr("class", "serie")
                        .attr("fill", function(d, i) {
                            return indexColor(i); })
                        .style("opacity", d=>{
                            if(plotted[0] === "all"){
                                return 1;
                            }else {
                                return d.key === plotted[0]?1:0;
                            }
                        })
                        .style("pointer-events", d=>{
                            if(plotted[0] === "all"){
                                return "auto";
                            }else {
                                return d.key === plotted[0]?"auto":"none";
                            }
                        });
                    return g;
                },
                update=>{
                    let g = update                        
                        .transition().duration(animDuration)
                        .attr("fill", function(d, i) {
                            return indexColor(i); })
                        .style("opacity", d=>{
                            if(plotted[0] === "all"){
                                return 1;
                            }else {
                                return d.key === plotted[0]?1:0;
                            }
                        })
                        .style("pointer-events", d=>{
                            if(plotted[0] === "all"){
                                return "auto";
                            }else {
                                return d.key === plotted[0]?"auto":"none";
                            }
                        });
                    return g;
                },
                exit=>exit.transition().duration(animDuration).style("opacity", 0)
                    .attr("fill", "grey")
                    .selectAll("rect").attr("y", 0).attr("height", 0)
                    .remove()
            )                 

        serie.selectAll<SVGRectElement, ExtendedSeriesPointWithSorted>("rect")
            .data((d) => d, (d) => d.data.label)
            .join(
                enter=>{                        
                    if(prevMode === mode){
                        const theBars = enter
                            .append("rect")
                            .attr("class", styles.rect)
                            .attr("x", function(d) {return x(d.data.label) ?? 0; })
                            .attr("width", x.bandwidth())
                            .attr("y", function(d){
                                if(!prevXLabels.includes(d.data.label)){
                                    return graphHeight
                                }
                                return yPos(d) + rectHeight(d)
                            })
                            .attr("height", 0)
                            .attr("stroke-dasharray", strokeDasharray)
                            .attr("stroke-dashoffset", strokeDashoffset)
                                .transition().duration(animDuration)                                
                            .attr("x", function(d){                                                        
                                const xPos = x(d.data.label as string) ?? 0
                                if(mode==="grouped" && plotted[0] === "all"){
                                    const sortReference = !isSorted?keys:d.data.sortedLayers
                                    const idx = sortReference.indexOf(d.barKey)
                                    return xPos + (idx * (x.bandwidth()/keys.length))
                                }                            
                                return xPos
                            })
                            .attr("width", function(d){
                                return (mode === "grouped" && plotted[0] === "all")?
                                    x.bandwidth()/keys.length:x.bandwidth()
                            })                        
                            .attr("height", rectHeight)
                            .attr("y", yPos)

                        return theBars
                    }
                    else if((prevMode === "stacked" || prevMode === "percentage") && mode === "grouped"){
                        const theBars = enter
                            .append("rect")
                            .attr("class", styles.rect)
                            .attr("x", function(d) {return x(d.data.label) ?? 0; })
                            .attr("width", x.bandwidth())
                            .attr("y", graphHeight)
                            .attr("height", 0)                      
                            .attr("stroke-dasharray", strokeDasharray)
                            .attr("stroke-dashoffset", strokeDashoffset)          
                                .transition().duration(animDuration)                                
                            .attr("x", function(d){                                                        
                                const xPos = x(d.data.label) ?? 0
                                if(mode==="grouped" && plotted[0] === "all"){
                                    const sortReference = !isSorted?keys:d.data.sortedLayers
                                    const idx = sortReference.indexOf(d.barKey)
                                    return xPos + (idx * (x.bandwidth()/keys.length))
                                }                            
                                return xPos
                            })
                            .attr("width", function(d){
                                return (mode === "grouped" && plotted[0] === "all")?
                                    x.bandwidth()/keys.length:x.bandwidth()
                            })                        
                            .attr("height", rectHeight)
                                .transition().duration(animDuration)
                            .attr("y", yPos)

                        return theBars
                        
                    }
                    else if(prevMode === "grouped" && (mode === "stacked" || mode === "percentage")){
                        const theBars = enter
                            .append("rect")
                            .attr("class", styles.rect)
                            .attr("x", function(d) {return x(d.data.label) ?? 0; })
                            .attr("width", x.bandwidth())
                            .attr("y", graphHeight)
                            .attr("height", 0)
                            .attr("stroke-dasharray", strokeDasharray)
                            .attr("stroke-dashoffset", strokeDashoffset)
                                .transition().duration(animDuration)
                            .attr("y", yPos)
                                .transition().duration(animDuration)                                
                            .attr("x", function(d){                                                        
                                const xPos = x(d.data.label as string) ?? 0
                                if(plotted[0] === "all"){
                                    const sortReference = !isSorted?keys:d.data.sortedLayers
                                    const idx = sortReference.indexOf(d.barKey)
                                    return xPos + (idx * (x.bandwidth()/keys.length))
                                }                            
                                return xPos
                            })
                            .attr("width", function(d){                                    
                                return (plotted[0] === "all")?
                                    x.bandwidth()/keys.length:x.bandwidth()
                            })                        
                            .attr("height", rectHeight)

                        return theBars
                                
                    }
                    const theBars = enter
                    return theBars
                },
                undefined,
                exit=>exit.attr("opacity", 0).remove()
            )           

        function transitionNormal(){
            serie.selectAll<SVGRectElement, ExtendedSeriesPointWithSorted>("rect")
                //.attr("class", updateRectClass)                    
                .transition().duration(animDuration)
                .attr("stroke-dasharray", strokeDasharray)
                .attr("stroke-dashoffset", strokeDashoffset)
                .attr("x", function(d){                                                        
                    const xPos = x(d.data.label) ?? 0
                    if(mode==="grouped" && plotted[0] === "all"){
                        const sortReference = !isSorted?keys:d.data.sortedLayers
                        const idx = sortReference.indexOf(d.barKey)
                        return xPos + (idx * (x.bandwidth()/keys.length))
                    }                            
                    return xPos
                })                    
                .attr("width", function(d){
                    return (mode === "grouped" && plotted[0] === "all")?
                            x.bandwidth()/keys.length:x.bandwidth()
                })
                .attr("height", rectHeight)
                .attr("y", yPos)
        }

        function transitionXWidth_then_YHeight(){
            serie.selectAll<SVGRectElement, ExtendedSeriesPointWithSorted>("rect")
                //.attr("class", updateRectClass)                    
                    .transition().duration(animDuration)                    
                .attr("x", function(d){                                                        
                    const xPos = x(d.data.label) ?? 0
                    if(mode==="grouped" && plotted[0] === "all"){
                        const sortReference = !isSorted?keys:d.data.sortedLayers
                        const idx = sortReference.indexOf(d.barKey)
                        return xPos + (idx * (x.bandwidth()/keys.length))
                    }                            
                    return xPos
                })                    
                .attr("width", function(d){
                    return (mode === "grouped" && plotted[0] === "all")?
                            x.bandwidth()/keys.length:x.bandwidth()
                })                    
                    .transition().duration(animDuration)
                .attr("stroke-dasharray", strokeDasharray)
                .attr("stroke-dashoffset", strokeDashoffset)
                .attr("height", rectHeight)
                .attr("y", yPos)
        }

        function transitionYHeight_then_XWidth(){
            serie.selectAll<SVGRectElement, ExtendedSeriesPointWithSorted>("rect")
                //.attr("class", updateRectClass)                    
                    .transition().duration(animDuration)
                .attr("y", yPos)
                .attr("height", rectHeight)
                    .transition().duration(animDuration)
                .attr("stroke-dasharray", strokeDasharray)
                .attr("stroke-dashoffset", strokeDashoffset)                    
                .attr("x", function(d){                                                        
                    const xPos = x(d.data.label) ?? 0
                    if(mode==="grouped" && plotted[0] === "all"){
                        const sortReference = !isSorted?keys:d.data.sortedLayers
                        const idx = sortReference.indexOf(d.barKey)
                        return xPos + (idx * (x.bandwidth()/keys.length))
                    }                            
                    return xPos
                })                    
                .attr("width", function(d){
                    return (mode === "grouped" && plotted[0] === "all")?
                            x.bandwidth()/keys.length:x.bandwidth()
                })
        }

        console.log('mode: ', mode)
        console.log('prevMode: ', prevMode)
        console.log('hovered: ', hovered)
        if(mode === "percentage"){
            if(prevMode === "stacked" || prevMode === "percentage"){
                transitionNormal()
            }else {
                transitionYHeight_then_XWidth()
            }
        }
        else if(mode === "grouped" && (prevMode === "stacked" || prevMode === null || prevMode === "percentage") ){
            console.log('grouped to stacked')
            transitionXWidth_then_YHeight()
        }
        else if(mode === "stacked" && (prevMode === "grouped" /*|| prevSortSegment === true*/)){                                
            console.log('stacked to grouped')
            transitionYHeight_then_XWidth()                            
        }
        else if(prevMode === mode ){
            console.log('mode and prevMode is the same')
            transitionNormal()
        }

    }, [ ...renderDeps, isSorted, chartData, keys, hovered, justPlotted, mode, orientation, dataJustChanged, tooltipFormat ]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column' }}
        >
            {uiControls
                ? createPortal(controls, uiControls)
                    : controls}
            <div
                ref={chartContainerRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column"}}>
                <div
                    ref={chartRef} 
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column"}}>
                <svg
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                    viewBox={`0 0 ${width} ${height}`}
                >
                    {
                        width > 0 &&
                        <g className="plot-area">
                            <g className="plot-rects" />
                            <g className={`y-axis`} />
                            <g className={`x-axis`} />  
                        </g>        
                    }                                        
                </svg>
                <Tooltip pCount={3} />
                </div>
            </div>
        </div>
    );
}