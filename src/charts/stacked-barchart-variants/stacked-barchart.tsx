import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { cloneObj, indexColor, basicFormat } from '../../utils';
import styles from '../global.module.css';
import stackedBarStyles from './stacked-barchart.module.css';
import { LayeredData, ExtendedSeries, ExtendedSeriesPoint, StackedBarChartProps } from './types';

type StackedBarChartPropsExtended =
    StackedBarChartProps & {
        focusOnPlot?: boolean;
};

export const inactiveColor = "#d1d5db"

export function StackedBarChart({ data, focusOnPlot = false }: StackedBarChartPropsExtended) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width, height } = parentSize;
    const [controlsRef, controlsSize] = useContainerSize<HTMLDivElement>();
    const { height: controlsHeight } = controlsSize;    
        
    const [dataJustChanged, setDataJustChanged] = useState(false)
    const [plotted, setPlotted] = useState<string[]>(["all"]);
    const [justPlotted, setJustPlotted] = useState<boolean>(false)
    const [hovered, setHovered] = useState<string>("")   
    const [isSorted, setIsSorted] = useState<boolean>(false);
    const uiControls = document?.getElementById("UI-controls"); 
    
    const stackData = data
        
    useEffect(() => {
        setPlotted(["all"])
        setDataJustChanged(true)
    }, [stackData])

    const animDuration = 750;
    useEffect(()=>{
        let timer: ReturnType<typeof setTimeout>;
        if(dataJustChanged){
            timer = setTimeout(()=>{setDataJustChanged(false)}, animDuration + 500)
        }
        return () => { clearTimeout(timer)}
    }, [dataJustChanged])    

    const chartHeight = uiControls ? height : height  - controlsHeight;
    const renderDeps = [ width, chartHeight, plotted ]

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
                            const layerIndex = layersRef.current.findIndex(l => l === d)
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
                            const layerIndex = layersRef.current.findIndex(l => l === d)
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
        if (width === 0 || chartHeight === 0) return;
        if(hovered !== "" && dataJustChanged) return        
        
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
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
            graphHeight = chartHeight - margin.top - margin.bottom;

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const tooltip = getTooltip(container as any);

        const xAxisTextClass = !isMediumScreen?stackedBarStyles.rotatedAxisText:
            stackedBarStyles.axisText;

        const x: d3.ScaleBand<string> = d3.scaleBand<string>()
            .rangeRound([0, graphWidth])
            .paddingInner(0.1)
            .align(0.2)
            
        const xLabels = sortedData.map(function(d: LayeredData) { return d.label; });
        x.domain(xLabels);        

        const prevXLabels: string[] = [];
        
        const xAxis = d3.axisBottom(x)
            .tickValues(x.domain())
            .scale(x)
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

        const y: d3.ScaleLinear<number, number> = d3.scaleLinear()
            .range([graphHeight, 0]);
            
        const yMax = focusOnPlot?(plotted[0] === "all"?
                d3.max(chartData, (d: LayeredData) => d.total):
                    d3.max(chartData, (d: LayeredData) => (d[plotted[0]] as number))):
                d3.max(chartData, (d: LayeredData) => d.total);            
                                                
        y.domain([0, yMax ?? 0]);        

        const yAxis = d3.axisLeft(y).ticks(null, "s");            
                                
        canvas.select<SVGGElement>(".y-axis")  
            .attr("transform", `translate(0,0)`)
            .style("color", "steelblue")          
                .transition().duration(animDuration)
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
                            const layerIndex = layersRef.current.findIndex(l => l === d.key)
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
                            const layerIndex = layersRef.current.findIndex(l => l === d.key)
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
                    .style("opacity", 0)
                    .attr("fill", "grey")
                    .selectAll<SVGRectElement, d3.SeriesPoint<LayeredData>>("rect")
                    .attr("y", graphHeight)
                    .attr("height", 0)
                    .remove()
            );
        
        const strokeDasharray = (d: ExtendedSeriesPoint): string => {
            if(d.barKey === hovered){
                return "none"
            }
            const rectWidth = x.bandwidth()
            const baseHeight = y(d[0]) - y(d[1])
            const rectHeight = isNaN(baseHeight)?0:baseHeight<0?0:baseHeight    
            
            const isTopLayer = selectedKeys.indexOf(d.barKey) === selectedKeys.length - 1
                || d.barKey === plotted[0]
            if(isTopLayer){
                return `${rectWidth + rectHeight} ${rectWidth} ${rectHeight}`
            }                
            return `${rectHeight} ${rectWidth}`
        };

        const strokeDashoffset = (d: ExtendedSeriesPoint): number => {
            const rectWidth = x.bandwidth();
            const isTopLayer =
                selectedKeys.indexOf(d.barKey) === selectedKeys.length - 1 || d.barKey === plotted[0];

            return isTopLayer ? 0 : rectWidth * -1;
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
                        .attr("x", (d) => x(d.data.label + "") ?? 0)
                        .attr("width", x.bandwidth())
                        .attr("y", (d) => {
                            if (!prevXLabels.includes(d.data.label)) return graphHeight;

                            const yFinal =
                                plotted[0] === "all"
                                ? y(d[1])
                                : d.key.startsWith(plotted[0])
                                ? graphHeight - (y(d[0]) - y(d[1]))
                                : y(d[1]);

                            const rectHeight = y(d[0]) - y(d[1]);
                            const height = isNaN(rectHeight) ? 0 : rectHeight < 0 ? 0 : rectHeight;
                            return yFinal + height;
                        })
                        .attr("height", 0)
                        .attr("stroke-dasharray", strokeDasharray)
                        .attr("stroke-dashoffset", strokeDashoffset)
                            .transition()
                            .duration(animDuration)
                        .attr("x", (d) => x(d.data.label + "") ?? 0)
                        .attr("width", x.bandwidth())
                        .attr("height", (d) => {
                            const rectHeight = y(d[0]) - y(d[1]);
                                return isNaN(rectHeight) ? 0 : rectHeight < 0 ? 0 : rectHeight;
                        })
                        .attr("y", (d) => {
                            return plotted[0] === "all"
                                ? y(d[1])
                                : /*d.key.startsWith(plotted)
                                ?*/ graphHeight - (y(d[0]) - y(d[1]))
                                //: y(d[1]);
                        });

                    return theBars;
                },
                undefined, // no custom update handler
                exit =>
                    exit
                        .transition()
                        .duration(animDuration)
                        .attr("opacity", 0)                        
                        .attr("y", graphHeight)
                        .attr("height", 0)
                        .remove()
            )
            .attr("class", updateRectClass)
            .attr("stroke-dasharray", strokeDasharray)
            .attr("stroke-dashoffset", strokeDashoffset)
            .transition().duration(animDuration)                
                .attr("x", (d) => x(d.data.label + "") ?? 0)
                .attr("width", x.bandwidth())
                .attr("height", (d) => {
                    const rectHeight = y(d[0]) - y(d[1]);
                        return isNaN(rectHeight) ? 0 : rectHeight < 0 ? 0 : rectHeight;
                })
                .attr("y", (d) => {
                    return plotted[0] === "all"
                        ? y(d[1])
                        : /*d.key.startsWith(plotted)
                        ?*/ graphHeight - (y(d[0]) - y(d[1]))
                        //: y(d[1]);
                })
                .on("start", function(){})
                .on("end", function(){});

        serie
            .selectAll<SVGRectElement, ExtendedSeriesPoint>("rect")
                .on("mouseover", function(e, d){
                    //unhoverLegend()
                    //console.log("hovered on ", d);
                    
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        .attr("class", xAxisTextClass + " " + stackedBarStyles.hoveredAxisText)

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
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        //.attr("class", xAxisTextClass)
                })
                .on("mousemove", (e, d)=>{                                                                               
                    moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement, yScale: y})
                })
                .on("mouseout", function(e, d){
                    d3.select(".x-axis").selectAll("text")
                        .filter(dText=>dText === d.data.label)
                        .attr("class", xAxisTextClass)

                    tooltip.style("opacity", 0);
                })

    }, [ ...renderDeps, isSorted, chartData, keys, hovered, focusOnPlot, justPlotted, dataJustChanged ]);
            
    return (
        <div 
            ref={ref} 
            style={{ width: `${width}px`, height: `${height}px`, display:'flex', flexDirection:'column', border: "2px solid orange" }}
        >
            
            {uiControls
                ? createPortal(controls, uiControls)
                    : controls}
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column"}}>
                <svg                              
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}        
                    viewBox={`0 0 ${width} ${chartHeight}`}
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
    );
}