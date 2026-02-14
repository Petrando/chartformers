import React, {SuspenseProps, useEffect, useState} from 'react';
import * as d3 from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import { flareData } from '../../dev/data/loan-data'
import styles from './global.module.css';
import { pointData, tooltipFormat, hierarchyData } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';

type rect = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type baseHierarchy = d3.HierarchyRectangularNode<hierarchyData>
type sunburstData = baseHierarchy & {
    current: sunburstData | rect;
    target?: rect | sunburstData;
    oldRect?: rect | null;
}

type sunburstProps = {
    data: hierarchyData;
}

export function Sunburst({data}: sunburstProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: baseWidth, height: baseHeight } = parentSize;

    const [ prevSunData, setPrevSunData ] = useState<sunburstData | null>(null)

    const [isSorted, setIsSorted] = useState<boolean>(false);    
    
    const uiControls = useUIControls();

    const dimension = Math.min(baseWidth, baseHeight)
    const radius = dimension / 2;

    const partitionHierarchy = ( data: hierarchyData): sunburstData => {
        const hierarchy = d3.hierarchy<hierarchyData>(data)
                .sum(d => d.value!)
                .sort((a, b) => b.value! - a.value!)
        const root = d3.partition<hierarchyData>()
            .size([2 * Math.PI, radius])
            (hierarchy) as sunburstData

        root.each(d => d.current = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 })

        return root
    }

    useEffect(()=>{        
        const setPrevSunburstData = () => {
            const root = partitionHierarchy(data)
            setPrevSunData(root)
        }

        setPrevSunburstData()
    }, [data])
    
    const width = dimension, height = dimension        

    const isMediumScreen = baseWidth > 576;
    // Define the controls element (checkbox)
    const controls = (
        <div 
            id="controls" 
            className={`${styles[isMediumScreen?"controls-container":"controls-container-sm"]} ${uiControls?styles["fill-container"]:""}`}
        >            
        </div>
    );
           
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (baseWidth === 0 || baseHeight === 0) return;
                
        
        const margin = { 
            top: 20, 
            right: 20, 
            bottom: 20, 
            left: 20
        };                                

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);

        const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children!.length + 1));
        

        /*const hierarchy = d3.hierarchy<hierarchyData>(data)
            .sum(d => d.value!)
            //.sort((a, b) => b.value! - a.value!);

        const root = d3.partition<hierarchyData>()
            .size([2 * Math.PI, Math.min(hierarchy.height) + 1])
            (hierarchy) as sunburstData;
        root.each(d => d.current = d);*/
                        
        function buildPreviousRectMap(
            node: sunburstData,
            depth = 0,
            map = new Map<string, rect | null>()
        ): Map<string, rect | null> {

            const rectValid = typeof node.x0 === "number" && typeof node.x1 === "number" &&
                typeof node.y0 === "number" && typeof node.y1 === "number"
                            
            map.set(
                `${depth}-${node.data.name}`, 
                rectValid?{x0: node.x0, x1: node.x1, y0: node.y0, y1: node.y1}:null
            )
            

            if (node.children) {
                node.children.forEach(child =>
                    buildPreviousRectMap(child, depth + 1, map)
                )
            }

            return map
        }

        function attachOldRects(
            node: sunburstData,
            prevMap: Map<string, rect | null>,
            depth = 0
        ): sunburstData {

            const key = `${depth}-${node.data.name}`

            const rectValid = typeof node.x0 === "number" && typeof node.x1 === "number" &&
                typeof node.y0 === "number" && typeof node.y1 === "number"

            if (rectValid) {
                node.oldRect = prevMap.get(key) ?? null
            }

            if (node.children) {
                node.children.forEach(child =>
                    attachOldRects(child as sunburstData, prevMap, depth + 1)
                )
            }

            return node
        }
        const baseRoot = partitionHierarchy(data)
        const firstRender  = prevSunData === null || baseRoot.data.name === prevSunData.data.name
        
        function processHierarchyData(
            newRoot: sunburstData,
            previousRoot?: sunburstData
        ): sunburstData {

            if (!previousRoot) {
                return attachOldRects(newRoot, new Map())
            }

            const prevMap = buildPreviousRectMap(previousRoot)

            return attachOldRects(newRoot, prevMap)
        }

        const root = processHierarchyData(baseRoot, firstRender?undefined:prevSunData?prevSunData:undefined)        

        const arc = d3.arc<sunburstData>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1)
        
        const longest = Math.max(baseWidth, baseHeight)
        const padding = (longest - dimension)/2

        const svgTranslate = baseWidth > baseHeight?
            `translate(${padding}, 0)`:`translate(0, ${padding})`
        
        const canvasSvg = container.select<SVGSVGElement>("svg")                        
            .attr("transform", svgTranslate)                 
            .style("font", "10px sans-serif")

        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')               
            .attr("fill-opacity", 0.6)                
        
        const path = canvas                    
            .selectAll<SVGPathElement, sunburstData>("path.slice")
            .data(
                root.descendants(), 
                function(d){ return d.data.name}
            )
            .join(
                enter=>{
                    const slices = enter.append("path")
                        .attr("class", "slice")
                        .attr("fill", d => { 
                            //console.log(d)
                            const colorName = d.depth > 1?d.parent!.data.name:d.data.name
                            console.log(d.data.name, " : ", colorName)
                            return color(colorName); 
                        })                    
                        //.attr("d", arc)                                          

                    slices
                        .transition().duration(animDuration)                                                                                                
                        .attrTween("d", function (d) {                            
                            const i = d3.interpolate(
                                d.current,
                                {
                                    x0: d.x0,
                                    x1: d.x1,
                                    y0: d.y0,
                                    y1: d.y1
                                }
                            );
                            return function (t) {
                                d.current = i(t);                                
                                return arc(d.current as sunburstData)!;
                            };
                        })

                    return slices
                },
                undefined, 
                exit=>exit.remove()
            )
            .transition().duration(animDuration)                                            
            //.attr("d", arc)                                    
            .attrTween("d", function (d) {                
                const i = d3.interpolate(
                    d.oldRect?d.oldRect:d.current,
                    {
                        x0: d.x0,
                        x1: d.x1,
                        y0: d.y0,
                        y1: d.y1
                    }
                );
                return function (t) {
                    d.current = i(t);                    
                    return arc(d.current as sunburstData)!;
                };
            })            


        /*path.filter(d => (d.children?true:false))
            .style("cursor", "pointer")
            .on("click", clicked);*/

        const labelCanvas = canvasSvg.select(".label-group")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .style("user-select", "none")
        
        const label = labelCanvas.selectAll<SVGTextElement, sunburstData>("text.suntext")
            .data(
                root.descendants().filter(d => (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10), 
                function(d){ return d.data.name})
            .join(
                enter=>enter
                    .append("text")
                    .attr("class", "suntext")
                    .attr("dy", "0.35em")
                    .style("opacity", 0)
                    .text(d => d.data.name)
                        .transition().duration(animDuration)
                    .style("opacity", 1)
                    .attr("transform", labelTransform)
                    ,
                undefined,
                exit=>exit.remove()
            )
                .transition().duration(animDuration)
            .style("opacity", 1)
            .attr("transform", labelTransform)
            .attr("dy", "0.35em")                        
            
        function arcVisible(d: sunburstData) {
            return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
        }

        function labelVisible(d: sunburstData) {
            const visible = d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;            
            return visible;
        }
        
        function labelTransform(d: sunburstData) {
            if(d.depth === 0){
                return ''
            }
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2// * radius;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        }

    }, [data, baseWidth, baseHeight, isSorted]);
    
    return (
        <div 
            ref={ref} 
            style={{ width: baseWidth, height: baseHeight, display:'flex', flexDirection:'column' }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column", position: "relative",}}> 
                {
                    dimension > 0 && prevSunData !== null &&
                    <svg                
                        width={dimension}
                        height={dimension}
                        style={{position: "absolute", left: 0, top: 0}}
                        viewBox={`${[-dimension / 2, -dimension / 2, dimension, dimension]}`}
                        
                    >
                        <g className="plot-area" />                        
                        <g className="label-group" />
                    </svg>          
                }        
                                                  
            </div> 
        </div>
    );
}