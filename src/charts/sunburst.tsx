import React, {useEffect, useState, useRef} from 'react';
import * as d3 from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor, indexColor } from '../utils';
import { inactiveColor } from '../../dev/data/constants';
import { flareData } from '../../dev/data/hierarchy-data'
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

type oldRectType = {
    oldData: rect | null;
    oldTarget?: rect | null;
}

type rectMapGroup = {
  oldData: Map<string, rect | null>;
  oldTarget: Map<string, rect | null>;
};

type sunburstData = baseHierarchy & {
    current: sunburstData | rect;
    target?: rect | sunburstData;
    oldRect?: oldRectType;
}

type sunburstProps = {
    data: hierarchyData;
}

export function Sunburst({data}: sunburstProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: baseWidth, height: baseHeight } = parentSize;

    const [ prevSunData, setPrevSunData ] = useState<sunburstData | null>(null)

    const [isSorted, setIsSorted] = useState<boolean>(false);            

    const dimension = Math.min(baseWidth, baseHeight)
    const radius = dimension / 2;

    const partitionHierarchy = ( data: hierarchyData): sunburstData => {
        const hierarchy = d3.hierarchy<hierarchyData>(data)
                .sum(d => d.value!)
                .sort((a, b) => b.value! - a.value!)
        const root = d3.partition<hierarchyData>()
            .size([2 * Math.PI, hierarchy.height + 1])
            (hierarchy) as sunburstData

        root.each(d => d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 })

        return root
    }

    useEffect(()=>{        
        const setPrevSunburstData = () => {
            const root = partitionHierarchy(data)
            setPrevSunData(root)
        }

        setPrevSunburstData()
    }, [data])
        
    const layersRef = useLayerIndex(data.children?.map(d => d.name) as string[])
    const BASE_COLORS = d3.quantize(d3.interpolateRainbow, 10);
    const colorRef = useRef(
        d3.scaleOrdinal<string, string>()
            .domain(layersRef.current)
            .range(BASE_COLORS)
    );
    
    const width = dimension, height = dimension        

    const isMediumScreen = baseWidth > 576;               
    
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
            map: rectMapGroup = {
                oldData:new Map<string, rect | null>(),
                oldTarget: new Map<string, rect | null>()
            }
        ): rectMapGroup {

            const rectValid = typeof node.x0 === "number" && typeof node.x1 === "number" &&
                typeof node.y0 === "number" && typeof node.y1 === "number"
                            
            map.oldData.set(
                `${depth}-${node.data.name}`, 
                rectValid?{x0: node.x0, x1: node.x1, y0: node.y0, y1: node.y1}:null
            )

            map.oldTarget.set(
                `${depth}-${node.data.name}`,
                node.target?
                    {x0: node.target.x0, x1: node.target.x1, y0: node.target.y0, y1:node.target.y1}:
                    null
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
            prevMap: rectMapGroup,
            depth = 0
        ): sunburstData {

            const key = `${depth}-${node.data.name}`

            const rectValid = typeof node.x0 === "number" && typeof node.x1 === "number" &&
                typeof node.y0 === "number" && typeof node.y1 === "number"

            if (rectValid) {
                const oldRect = {
                    oldData: prevMap.oldData.get(key) ?? null,
                    oldTarget: prevMap.oldTarget.get(key) ?? null
                }
                node.oldRect = oldRect
            }

            if (node.children) {
                node.children.forEach(child =>
                    attachOldRects(child as sunburstData, prevMap, depth + 1)
                )
            }

            return node
        }

        function processHierarchyData(
            newRoot: sunburstData,
            previousRoot?: sunburstData
        ): sunburstData {            

            if (!previousRoot) {
                return attachOldRects(newRoot, {oldData:new Map(), oldTarget: new Map()})
            }

            const prevMap = buildPreviousRectMap(previousRoot)

            return attachOldRects(newRoot, prevMap)
        }

        const baseRoot = partitionHierarchy(cloneObj(data))
        const firstRender  = prevSunData === null || baseRoot.data.name === prevSunData.data.name
                
        const root = processHierarchyData(baseRoot, firstRender?undefined:prevSunData?prevSunData:undefined)        
        
        const maxDepth = root.height + 1;
        const depthScale = radius / maxDepth;

        let focus = root;

        const arc = d3.arc<sunburstData>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius * 1.5)
            .innerRadius(d => d.y0 * depthScale)
            .outerRadius(d => Math.max(d.y0 * depthScale, d.y1 * depthScale - 1))
        
        const longest = Math.max(baseWidth, baseHeight)
        const padding = (longest - dimension)/2

        const svgTranslate = baseWidth > baseHeight?
            `translate(${padding}, 0)`:`translate(0, ${padding})`
        
        const canvasSvg = container.select<SVGSVGElement>("svg")                        
            .attr("transform", svgTranslate)                 
            .style("font", "10px sans-serif")

        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')                       
            .style("fill-opacity", 0.6)                

        const labelCanvas = canvasSvg.select(".label-group")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .style("user-select", "none")
        const labelShadow = "0 1px 0 lightblue, 1px 0 0 lightblue, -1px 0 0 lightblue, 0 -1px 0 lightblue"                                        

        const pathFill = (d: sunburstData) => {  
            let node = d           
            while (node.depth > 1) node = node.parent as sunburstData;                
            const colorName = node.data.name                        

            const baseColor = colorRef.current(colorName)
            
            const c = d3.color(baseColor);
            console.log('in sunburst: ', baseColor, ", ", c)
            if (!c) return baseColor;

            // Depth-based adjustment
            const depth = d.depth;

            // You can tweak this factor
            const factor = 0.5;

            if (depth === 1) {
                return c.formatHex(); // base color
            }

            // deeper = darker
            //can use darker or brighter
            return c.darker(depth * factor).formatHex();
            
            
        }
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
                        .attr("fill", pathFill)
                        .style("cursor", function(d){
                            return d.children?"pointer":"default"
                        })                    
                        //.attr("d", arc)                                          

                    slices
                        .transition().duration(animDuration)                                                                                                
                        .attrTween("d", function (d) {
                            const dCurrentEnter = {
                                x0: d.current.x0, x1: d.current.x0, y0: d.current.y0, y1: d.current.y1
                            }                            
                            const i = d3.interpolate(
                                dCurrentEnter,
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
                update=>update.transition().duration(animDuration)                                            
                    //.attr("d", arc)                                    
                    .attrTween("d", function (d) {                
                        const i = d3.interpolate(
                            d.oldRect?d.oldRect.oldTarget?d.oldRect.oldTarget:d.oldRect.oldData:d.current,
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
                    .attr("fill", pathFill), 
                exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
            )
            .on("pointerenter", function(e, d){
                if(focus !== root){
                    return
                }                
                labelCanvas.selectAll<SVGTextElement, sunburstData>("text.suntext")
                    .filter(dText => dText.data.name === d.data.name)
                    .style("fill-opacity", 1)
                    .style("text-shadow", labelShadow)
            })
            .on("pointerleave", function(e, d){
                if(focus !== root){
                    return
                }
                labelCanvas.selectAll<SVGTextElement, sunburstData>("text.suntext")
                    .filter(dText => dText.data.name === d.data.name)
                    .style("fill-opacity", d => labelVisible(d) ? 1 : 0)
                    .style("text-shadow", d => labelVisible(d)?labelShadow:"none")
            })
            .on("click", function(e, d){
                if(d.children){
                    clicked(e, d)
                }
            })                                

        canvasSvg.select("circle.reset").remove()
        const parentCircle = canvasSvg.selectAll("circle")
            .data([root])
            .join("circle")
            .attr("class", "reset")
            .attr("r", depthScale)
            .attr("fill", "transparent")
            .attr("pointer-events", "all")
            .on("click", (event, d) => clicked(event, d));
                        
        const label = labelCanvas.selectAll<SVGTextElement, sunburstData>("text.suntext")
            .data(
                root.descendants()/*.filter(d => (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 0.25)*/, 
                function(d){ return d.data.name})
            .join(
                enter=>enter
                    .append("text")
                    .attr("class", "suntext")
                    .attr("dy", "0.35em")
                    .style("fill-opacity", 0)
                    .style("text-shadow", "none")
                    .text(d => d.data.name)
                        .transition().duration(animDuration)
                    .style("fill-opacity", d => labelVisible(d) ? 1 : 0)
                    .style("text-shadow", d => labelVisible(d)?labelShadow:"none")
                    .attr("transform", labelTransform),
                undefined,
                exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
            )
                .transition().duration(animDuration)
            .style("fill-opacity", d => labelVisible(d) ? 1 : 0)
            .style("text-shadow", d => labelVisible(d)?labelShadow:"none")
            .attr("transform", labelTransform)
            .attr("dy", "0.35em")                
                    
        function clicked(event: PointerEvent | undefined, data: sunburstData | undefined, initialCall: boolean = false) {                
            const p = data as sunburstData
            focus = p;            

            parentCircle
                .style("cursor", focus === root?"default":"pointer")
            parentCircle.datum(initialCall?root:p.parent || root);

            root.each(d => d.target = {
                x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                y0: Math.max(0, d.y0 - p.depth),
                y1: Math.max(0, d.y1 - p.depth)
            });

            canvas                    
                .selectAll<SVGPathElement, sunburstData>("path.slice")
                    .transition().duration(animDuration)
                .tween("data", d => {
                    const i = d3.interpolate(d.current, d.target!);
                    return t => d.current = i(t);
                })
                .attrTween("d", d => () => arc(d.current as sunburstData) ?? "");
            
            labelCanvas
                .selectAll<SVGTextElement, sunburstData>("text.suntext")
                    .transition().duration(animDuration)
                .tween("data", d => {
                    const i = d3.interpolate(d.current, d.target!);
                    return t => d.current = i(t);
                })
                .style("fill-opacity", d => labelVisible(d) ? 1 : 0)
                .style("text-shadow", d => labelVisible(d)?labelShadow:"none")
                .attrTween("transform", d => () => labelTransform(d.current as rect));

            setPrevSunData(root)
        }
            
        function arcVisible(d: sunburstData) {
            return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
        }

        function labelVisible(d: sunburstData) {

            const rectData = (d.target ?? d.current) as rect;
            const { x0, x1, y0, y1 } = rectData;

            const angularWidth = x1 - x0;
            const radialCenter = (y0 + y1) / 2;
            const areaMetric = radialCenter * angularWidth;

            // 🚨 Only override area filtering if NOT at root
            if (focus !== root && d.ancestors().includes(focus)) {
                return true;
            }

            return (
                y1 <= maxDepth &&
                y0 >= 0 &&
                angularWidth > 0.003 &&
                areaMetric > 0.25
            );
        }

        function labelTransform(d: rect) {
            if (d.y0 === 0) {
                return `translate(0,0)`;   // for center label no rotation
            }            
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2 * depthScale;
            return `
                rotate(${x - 90})
                translate(${y},0)
                rotate(${x < 180 ? 0 : 180})
            `;
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