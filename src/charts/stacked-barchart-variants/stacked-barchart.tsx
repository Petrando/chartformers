import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import { inactiveColor } from '../../data/constants';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { LayeredData, ExtendedSeries, ExtendedSeriesPoint, StackedBarChartProps } from './types';
import { useUIControls } from '../../hooks/useUIControls';

type StackedBarChartPropsExtended =
    StackedBarChartProps & {
        focusOnPlot?: boolean;
};

export function StackedBarChart({ data, focusOnPlot = false, colorIdx = 0, orientation = 'vertical' }: StackedBarChartPropsExtended) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();        
    const { height: controlsHeight } = controlsSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
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
    }, [stackData])    

    useEffect(() => {setPlotted(["all"])}, [focusOnPlot])

    const animDuration = 750;
    useEffect(()=>{
        let timer: ReturnType<typeof setTimeout>;
        if(dataJustChanged){
            timer = setTimeout(()=>{setDataJustChanged(false)}, animDuration + 500)
        }
        return () => { clearTimeout(timer)}
    }, [dataJustChanged])    

    const chartHeight = uiControls ? height : height - controlsHeight ;

    const renderDeps = [ width, height, plotted, colorIdx, focusOnPlot ]

    const chartData:LayeredData[] = cloneObj(stackData);                        
    const keys = chartData.length === 0 ? [] :
        (Object.keys(chartData[0]) as (keyof LayeredData)[])
            .filter((key) => key !== "label" && key !== "total") as string[];
    const layersRef = useLayerIndex(keys)       
    
    const legendRef = useD3<HTMLDivElement>((container) => { 
        if(dataJustChanged){
            return
        }
        const legendWidth = 80              
        const legends = container.selectAll<HTMLDivElement, string>(".legend-item")
            .data([...keys], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", function(d){                            
                            return  `
                                ${plotted.includes(d)?
                                    stackedBarStyles[focusOnPlot?"legend-container-active":"legend-container-inactive"]:
                                        stackedBarStyles["legend-container"]}
                                legend-item
                            `
                            
                        })
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
                        .attr("class", (d) => `                                
                                ${plotted.includes(d)?
                                    stackedBarStyles[focusOnPlot?"legend-container-active":"legend-container-inactive"]:
                                        stackedBarStyles["legend-container"]}
                                legend-item`
                        ) 
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

        legends
            .on("mouseover", function(e, d){
                if(dataJustChanged){                    
                    return
                }else{
                    setHovered(d)
                }
                
            })
            .on("mouseout", function(e, d){
                if(dataJustChanged){                       
                    return
                }else{
                    setHovered("")
                }
                                    
                
                if(justPlotted){
                    setJustPlotted(false)
                }
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
                setJustPlotted(true)
            })
                        
    }, [...renderDeps, keys, dataJustChanged]);

    // Define the controls element (checkbox)
    const controls = (
        <div 
            ref={controlsRef}
            className={`${styles["controls-container"]} ${uiControls?styles["fill-container"]:""}`}
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
                ref={legendRef}
                id='stacked-barchart-legends'
                className={`${stackedBarStyles["legends-container"]}`}
            />
        </div>
    );

    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        if(hovered !== "" && dataJustChanged) return        
        
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const isMediumScreen = width > 1024; 
        
        const selectedKeys = focusOnPlot?keys:keys.filter(k => !plotted.includes(k))
                
        chartData.forEach((row) => {
            const total = selectedKeys.reduce((sum, key) => {
                const value = row[key];
                return sum + (typeof value === "number" ? value : 0);
            }, 0);
            row.total = total;
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
                
        const graphWidth = width - margin.left - margin.right,
            graphHeight = height - margin.top - margin.bottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);

        let isFirstRender = false;
        if(prevData === null){
            isFirstRender = true;
            setPrevData(cloneObj(chartData));
        }                       

        const labels = sortedData.map(function(d: LayeredData) { return d.label; });
        const labelScale: d3.ScaleBand<string> = d3.scaleBand<string>()
            .domain(labels)
            .rangeRound(orientation === 'vertical'?[0, graphWidth]:[graphHeight, 0])
            .paddingInner(0.1)
            .align(0.2)

        const valueMax = focusOnPlot?(plotted[0] === "all"?
                d3.max(chartData, (d: LayeredData) => d.total):
                    d3.max(chartData, (d: LayeredData) => (d[plotted[0]] as number))):
                d3.max(chartData, (d: LayeredData) => d.total); 

        const valueScale: d3.ScaleLinear<number, number> = d3.scaleLinear()
            .domain([0, valueMax ?? 0])
            .range(orientation === 'vertical'?[graphHeight, 0]:[0, graphWidth]);
            
        const xAxisTextClass = !isMediumScreen?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;
                                            
        const prevXLabels: string[] = [];
        
        const xAxis = orientation === 'vertical' 
            ?d3.axisBottom(labelScale)
                .tickValues(labelScale.domain())
                .tickSizeOuter(0):
             d3.axisBottom(valueScale)
                .tickValues(valueScale.domain())
                .ticks(null, "s")
                .tickSizeOuter(0);
            
        canvas.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0,${graphHeight})`)
            .transition().duration(animDuration)
            .call(xAxis)
            .selectAll("text")
            .style("cursor", "pointer")
            .attr("dy", !isMediumScreen ? ".20em" : "1em")
            .attr("dx", !isMediumScreen ? "-.8em" : "0em")
            .attr("class", xAxisTextClass);                                                                              

        const yAxis = orientation === 'vertical'
            ? d3.axisLeft(valueScale)
                .ticks(null, "s")
            : d3.axisLeft(labelScale).tickSizeOuter(0);                    
                                        
        canvas.select<SVGGElement>(".y-axis")  
            //.attr("transform", `translate(0,0)`)               
                .transition().duration(isFirstRender?0:animDuration)
            .call(yAxis)

        const dataLayers: d3.Series<LayeredData, string>[] =
            d3.stack<LayeredData>().keys(selectedKeys)(sortedData);
        
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
                        .attr("fill", (d) => {
                            const layerIndex = layersRef.current.findIndex(l => l === d.key) + colorIdx
                            const color = indexColor(layerIndex)
                            
                            return color
                        })
                        .style("opacity", (d) => {
                            if(hovered !== ""){                                
                                if(focusOnPlot){                                    
                                    if(plotted[0] === "all"){
                                        return d.key === hovered?1:
                                            justPlotted?1:0.25
                                    }                                    
                                }else{
                                    if(justPlotted){
                                        return 1
                                    }
                                    return d.key === hovered?0.25:1
                                }
                            }
                            
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
                            if(hovered !== ""){
                                if(focusOnPlot){
                                    if(plotted[0] === "all"){
                                        return d.key === hovered?1:
                                            justPlotted?1:0.25
                                    }                                    
                                }else{
                                    if(justPlotted){
                                        return 1
                                    }
                                    return d.key === hovered?0.25:1
                                }
                            }
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
                    .selectAll<SVGRectElement, d3.SeriesPoint<LayeredData>>("rect")
                    .attr("y", graphHeight)
                    .attr("height", 0)
                    .remove()
            );

        const labelScalePos = (d: ExtendedSeriesPoint) => {             
            return labelScale(d.data.label + "") ?? 0
        }

        const labelScaleBandWidth = labelScale.bandwidth()

        const valueScalePos = (d: ExtendedSeriesPoint) => {
            const orientationDimension = orientation === 'vertical'?graphHeight:graphWidth
            if(isFirstRender) return 0
            
            return plotted[0] === "all"
                ? valueScale(orientation === 'vertical'?d[1]:d[0])
                : /*d.key.startsWith(plotted)
                ?*/ (focusOnPlot && orientation !== 'vertical')?valueScale(0):(orientationDimension - (valueScale(d[0]) - valueScale(d[1])))
                //: y(d[1]);
        }

        const valueScaleDimension = (d: ExtendedSeriesPoint) => {
            const dimension = orientation === 'vertical'?valueScale(d[0]) - valueScale(d[1]):
                valueScale(d[1]) - valueScale(d[0])
            
            return isNaN(dimension) ? 0 : dimension < 0?0:dimension;
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

        const rectHeight = (d: ExtendedSeriesPoint) => {            
            return orientation === 'vertical' ? valueScaleDimension(d) : labelScaleBandWidth
        }
        
        const strokeDasharray = (d: ExtendedSeriesPoint): string => {
            if(d.barKey === hovered){
                return "none"
            }
            const rectStrokeWidth = rectWidth(d);            
            const rectStrokeHeight = rectHeight(d);    
            
            const isTopLayer = selectedKeys.indexOf(d.barKey) === selectedKeys.length - 1
                || d.barKey === plotted[0]
            if(isTopLayer){
                if(orientation === 'vertical'){
                    return `${rectStrokeWidth + rectStrokeHeight} ${rectStrokeWidth} ${rectStrokeHeight}`
                }else{
                    return `${rectStrokeWidth + rectStrokeHeight + rectStrokeWidth}`;
                }
            }                
            return orientation === 'vertical'?
                `${rectStrokeHeight} ${rectStrokeWidth}`:
                    `${rectStrokeWidth} ${rectStrokeHeight}`
        };

        const strokeDashoffset = (d: ExtendedSeriesPoint): number => {
            const rectStrokeWidth = rectWidth(d);            
            const isTopLayer =
                selectedKeys.indexOf(d.barKey) === selectedKeys.length - 1 || d.barKey === plotted[0];

            if(orientation === 'vertical'){
                return isTopLayer ? 0 : rectStrokeWidth * -1;
            }
            return 0
            
        };

        const updateRectClass = (d: ExtendedSeriesPoint) => {            
            if(hovered !== "" && hovered === d.barKey && focusOnPlot){                
                return `rect ${stackedBarStyles.rectLegendHovered}`
            }
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
                                if (!prevXLabels.includes(d.data.label)) return graphHeight;

                                const yFinal =
                                    plotted[0] === "all"
                                    ? valueScale(d[1])
                                    : d.key.startsWith(plotted[0])
                                    ? graphHeight - (valueScale(d[0]) - valueScale(d[1]))
                                    : valueScale(d[1]);

                                const rectHeight = valueScale(d[0]) - valueScale(d[1]);
                                const height = isNaN(rectHeight) ? 0 : rectHeight < 0 ? 0 : rectHeight;
                                const yPos = yFinal + height;

                                if(isFirstRender) return  graphHeight - (margin.bottom + margin.top);
                                return yPos;

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
                            .transition()
                            .duration(animDuration)
                        .attr("x", rectXPos)
                        .attr("width", rectWidth)
                        .attr("height", rectHeight)
                        .attr("y", rectYPos);

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
                .on("start", function(){})
                .on("end", function(){});

        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .on("mouseover", function(e, d){
                    //unhoverLegend()
                    //console.log("hovered on ", d);
                    
                    d3.select(orientation === "vertical"?".x-axis":".y-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        .attr("class", (orientation === "vertical"?xAxisTextClass:"") + " " + stackedBarStyles.hoveredAxisText)

                    tooltip.style("opacity", 1)
                        .select("p.title").text(d.data.label)
                    
                    const value = d.data[d.barKey] as number
                    const {total} = d.data
                    const percentage = (value/total!) * 100
                    
                    tooltip.select("p.top-label").text(d.barKey + " : " + basicFormat(value))
                    tooltip.select("p.bottom-label").text(plotted[0] === "all"?
                        `Total : ${basicFormat(total as number)}`:"~")
                })
                .on("touch", function(e, d){
                    //unhoverLegend()
                    d3.select(orientation === "vertical"?".x-axis":".y-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        //.attr("class", xAxisTextClass)
                })
                .on("mousemove", (e, d)=>{                                                                               
                    moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: valueScale})
                })
                .on("mouseout", function(e, d){
                    d3.select(orientation === 'vertical'?".x-axis":".y-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        .attr("class", orientation==='vertical'?xAxisTextClass:"")

                    tooltip.style("opacity", 0);
                })

    }, [ ...renderDeps, isSorted, chartData, keys, hovered, justPlotted, dataJustChanged, orientation ]);
            
    return (
        <div 
            ref={ref} 
            style={{ width: `${parentWidth}px`, height: `${parentHeight}px`, display:'flex', flexDirection:'column' }}
        >            
            {uiControls
                ? createPortal(controls, uiControls)
                    : controls}
            <div
                ref={chartContainerRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column" }}>
                <div 
                    ref={chartRef}
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column" }}>                                                
                    <svg                              
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        <g className="plot-area">
                            <g className="plot-rects" />
                            <g className="y-axis" />
                            <g className="x-axis" />  
                        </g>        
                        
                    </svg>
                    <Tooltip pCount={3} />
                </div>
            </div>
            
        </div>
    );
}