import React, {useState, useEffect, useRef} from 'react';
import {select, hierarchy, pack, scaleLinear, interpolateHcl, 
    quantize, interpolateRainbow, scaleOrdinal, color as d3Color,
    HierarchyCircularNode, HierarchyNode} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, moveTooltip } from '../../components/tooltip';
import { basicFormat, cloneObj } from '../../utils';
import { oldPack } from './utils';
import { hierarchyData, tooltipFormat } from '../../types';
import styles from '../global.module.css';
import packStyles from './circle-pack.module.css'
import { useLayerIndex } from '../../hooks/useLayerIndex';

type PackProps = {
    data: hierarchyData;
    tooltipFormat?: tooltipFormat;
    colorScheme?: 'monochrome' | 'rainbow';
}

type PackedNodeWithSorted<T> = HierarchyCircularNode<T> & {
    sortedX?: number;
    sortedY?: number;
    sortedR?: number;
};

function buildSortedNodeMap<T extends { name: string }>(
    sortedNodes: HierarchyNode<T>[]
) {
    const map = new Map<string, HierarchyNode<T> & {
        x?: number;
        y?: number;
        r?: number;
    }>();

    for (const node of sortedNodes) {
        map.set(node.name, node as any);
    }

    return map;
}

function assignSortedGeometry<T extends { name: string }>(
    node: PackedNodeWithSorted<T>,
    oldNodeMap: Map<string, HierarchyNode<T> & { x?: number; y?: number; r?: number }>
): void {
    const oldNode = oldNodeMap.get(node.data.name);

    if (oldNode) {
        node.sortedX = oldNode.x;
        node.sortedY = oldNode.y;
        node.sortedR = oldNode.r;
    }

    if (node.children) {
        for (const child of node.children) {
            assignSortedGeometry(child as PackedNodeWithSorted<T>, oldNodeMap);
        }
    }
}

export function CirclePacks({data, tooltipFormat, colorScheme = 'monochrome'}: PackProps) {
    const [hierarchyData, setPackData] = useState<hierarchyData | null>(null);
    const [ isSorted, setIsSorted ] = useState(false)    
    const isFirstRender = useRef(true)
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width:parentWidth, height: parentHeight} = parentSize;    

    useEffect(()=>{
        setPackData((prev) => {            

            if(prev !== null){
                isFirstRender.current = false
            }
            return data
        })
    }, [data])
    
    const layersRef = useLayerIndex(data.children?.map(d => d.name) as string[])
    const BASE_COLORS = quantize(interpolateRainbow, 10);    
    const colorRef = useRef(
        scaleOrdinal<string, string>()
            .domain(layersRef.current)
            .range(BASE_COLORS)
    );

    const isMidSmallScreen = parentWidth <= 768;
    const animDuration = 1000
    const chartRef = useD3<HTMLDivElement>(
        (container) => 
        {
            if(!hierarchyData){
                return
            }                        

            const width = parentWidth;
            const height = parentHeight;

            const LABELFONTSIZE = 12;
            const CIRCLESTROKE = 1.5;

            if(width === 0 || height === 0){
                return
            }
            const margin = 25;            

            const baseHeight = height - (margin * 2)
            const baseWidth = width - (margin * 2)
            
            const graphHeight = baseHeight            
            const graphWidth = baseWidth

            const rootData:hierarchyData = {'name':'branches', 'children':hierarchyData.children}                    

            const diameter = Math.min(graphWidth, graphHeight)
                        
            const root = hierarchy(cloneObj(rootData))
                .sum(function(d) { return d.value!; })
                .sort(function(a, b){return a.value! - b.value!;})

            const packFn = pack<hierarchyData>()
                .size([diameter - margin, diameter - margin])
                .padding(2)                

            const sortedPackFn = oldPack()
                .padding(2)
                .size([diameter - margin, diameter - margin])
                .value(function(d:hierarchyData) { return d.value; })
            const sortedNodes = sortedPackFn.nodes(cloneObj(rootData))
                                    
            let focus = root, scale = 1, thicknessK = 1;    
            const packedRoot = packFn(root)        
            const nodes = packedRoot.descendants();
            const view = [packedRoot.x, packedRoot.y, packedRoot.r * 2 + margin];

            const oldNodeMap = buildSortedNodeMap(sortedNodes);

            // Start traversal from the root node
            assignSortedGeometry(nodes[0], oldNodeMap);
            
            const tooltip = container.select("#tooltip").style("opacity", 0)
            const canvasSvg = container.select<SVGSVGElement>("svg")
            const svgNode = canvasSvg.node()
            const canvas = canvasSvg.select<SVGGElement>('.plot-area')                
                
            //canvas.transition().duration(animDuration)
                //.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            const monochromeFill = scaleLinear<string>()
                .domain([-1, 2])
                .range(["#34d399", "#6b21a8"])
                .interpolate(interpolateHcl);

            const rainbowFill = (d: PackedNodeWithSorted<hierarchyData>) => {
                let node = d           
                while (node.depth > 1) node = node.parent as PackedNodeWithSorted<hierarchyData>; 

                const colorName = node.data.name                        
                
                const baseColor = colorRef.current(colorName)
                    
                const c = d3Color(baseColor);
                
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

            const nodeFill = (d: PackedNodeWithSorted<hierarchyData>)  => {
                if(colorScheme === 'monochrome'){
                    const cirleColor = d.children ? monochromeFill(d.depth) : "#f0fdfa";                              
                    return cirleColor; 
                }                                 
                return rainbowFill(d)
            }
            
            function circleRadius(d:PackedNodeWithSorted<hierarchyData>) { 
                const k = diameter / view[2];	                                
                
                const circleRadius = isSorted?d.sortedR ?? 0:d.r
                return circleRadius * k;
            }

            function xPos(d: PackedNodeWithSorted<hierarchyData>){
                const k = diameter / view[2];                    
                const xPos = isSorted?d.sortedX ?? 0:d.x
                return ((xPos - view[0]) * k);
            }

            function yPos(d: PackedNodeWithSorted<hierarchyData>){
                const k = diameter / view[2];                                                              
                const yPos = isSorted?d.sortedY ?? 0:d.y
                return ((yPos - view[1]) * k);
            }

            const circles = canvas
                .selectAll<SVGCircleElement, PackedNodeWithSorted<hierarchyData>>("circle")
                .data(nodes,(d:PackedNodeWithSorted<hierarchyData>) => d.data.name)
                .join(
                    enter =>
                        enter
                        .append("circle")
                            .attr("class", function(d) { 
                                return d.parent ? d.children ? 
                                    packStyles.node : 
                                    `${packStyles.node} ${packStyles["node--leaf"]}` : 
                                    `${packStyles.node} ${packStyles["node--root"]}`; 
                            })
                            .style("fill", nodeFill)
                            .style("cursor", "pointer")
                                .transition().duration(animDuration)
                            .attr("r", circleRadius)
                            .attr("cx", xPos)
                            .attr("cy", yPos)
                            .style("stroke", "#737373")
                            .style("stroke-width", CIRCLESTROKE * thicknessK)
                            .style("fill", nodeFill),
                    update=>update.transition().duration(animDuration)
                        .attr("cx", xPos)
                        .attr("cy", yPos)
                        .attr("r", circleRadius)
                        .style("stroke", function(d){
                            return "#737373";
                        })
                        .style("stroke-width", CIRCLESTROKE * thicknessK)
                        .style("fill", nodeFill),
                    exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
                )
                .on('mouseover', function(e, d){                        
                    if(focus.parent===d){
                        texts.filter(function(dText) { return (dText as HierarchyCircularNode<hierarchyData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                            .style("font-size", LABELFONTSIZE * thicknessK)
                            .style("fill-opacity", function(d) { return (d as HierarchyCircularNode<hierarchyData>).parent === focus ? 1 : 0; })
                            .style("display", function(d){return ((d as HierarchyCircularNode<hierarchyData>).parent===focus? "inline":"none");});
                    }
                    else{  
                        if(d===focus){
                            texts.filter(function(dText) { return (dText as HierarchyCircularNode<hierarchyData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                                .style("font-size", LABELFONTSIZE * thicknessK)
                                .style("fill-opacity", function(d) { return (d as HierarchyCircularNode<hierarchyData>).parent === focus ? 1 : 0; })
                                .style("display", function(d){return ((d as HierarchyCircularNode<hierarchyData>).parent===focus? "inline":"none");});
                        }else /*if(d.parent===focus)*/{
                            texts.filter(function(dText){
                                if(isSorted){
                                    const dCircle = d as HierarchyNode<hierarchyData>
                                    const textData = dText as HierarchyNode<hierarchyData>
                                    return textData.name!==dCircle.name
                                }
                                
                                return (dText as HierarchyCircularNode<hierarchyData>).data.name!=d.data.name;
                            })
                                .style("fill-opacity", 0)
                                .style("display", "none");
                            
                            texts.filter(function(dText){
                                if(isSorted){
                                    const dCircle = d as HierarchyNode<hierarchyData>
                                    const textData = dText as HierarchyNode<hierarchyData>
                                    return textData.name!==dCircle.name
                                }
                                return (dText as HierarchyCircularNode<hierarchyData>).data.name===d.data.name;
                            })
                                .style("fill-opacity", 1)
                                .style("display", "inline");
                        }
                    }
                                        		 
                    let myStroke = select(this).style('stroke');
                    if(d!=root){select(this)
                        .style("stroke-width", CIRCLESTROKE * thicknessK * 2.5)
                        .style("stroke", "#e4e4e7");}
                    
                    const name = d.data.name === "branches"?"Total":d.data.name
                    tooltip.select("p.name").text(name)
                    const value = d.value ?? 0
                    tooltip.select("p.value").text(basicFormat(value, tooltipFormat).toLocaleString())
                    tooltip.transition().duration(250).style("opacity", 1)                    
                })
                .on("mousemove", (e, d)=>{
                    moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
                })                
                .on('mouseout', function(e, d){
                    texts.filter(function(d) { return (d as HierarchyCircularNode<hierarchyData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                        //.style("font-size", LABELFONTSIZE * thicknessK)
                        .style("fill-opacity", function(d) { return (d as HierarchyCircularNode<hierarchyData>).parent === focus ? 1 : 0; })
                        .style("display", function(d){return ((d as HierarchyCircularNode<hierarchyData>).parent===focus? "inline":"none");});
            
                    select(this)
                        .style("stroke-width", CIRCLESTROKE * thicknessK)
                        .style("stroke", function(d){
                            return "#737373";
                        });

                    tooltip.transition().duration(250).style("opacity", 0)
                })
                .on("click", function(e, d){                 
                    const k = diameter / view[2];
                                
                    //return  d.r * k; 		 
                    if(d===root){reset();return;}
                    focus!=d?clicked(d):reset();
                    
                    circles
                        .style("stroke-width", CIRCLESTROKE * thicknessK);                        
                    e.stopPropagation()
                })

            function textTransform(d: PackedNodeWithSorted<hierarchyData>) { 
                const k = diameter / view[2];
                const xPos = isSorted?d.sortedX ?? 0:d.x
                const yPos = isSorted?d.sortedY ?? 0:d.y                                
                return "translate(" + (xPos - view[0]) * k + "," + (yPos - view[1]) * k + ")"; 
            }

            const texts = canvas
                .selectAll<SVGTextElement, PackedNodeWithSorted<hierarchyData>>("text")
                .data(nodes, d=>d.data.name)
                .join(
                    enter=>enter.append("text")  
                        .attr("class", packStyles["circle_pack_label"])                          
                        .text(d=>d.data.name)
                        .style("font-size", LABELFONTSIZE)
                        .style("text-anchor", "middle")                                                        
                        .style("fill-opacity", 0)
                        .style("stroke-opacity", 0)
                        .style("display", "none")
                        .style("pointer-events", "none")
                        .style("text-shadow", "0 1px 0 lightblue, 1px 0 0 lightblue, -1px 0 0 lightblue, 0 -1px 0 lightblue")                            
                            .transition().duration(animDuration)
                        .attr("transform", textTransform)                    
                        .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })	  
                        .style("display", function(d) { return d.parent === root ? "inline" : "none"; }),
                    update=>update.attr("class", packStyles["circle_pack_label"])
                            .transition().duration(animDuration)                        
                        .attr("transform", textTransform)                        
                        .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })	  
                        .style("display", function(d) { return d.parent === root ? "inline" : "none"; }),
                    exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
                )                                            
                    
            texts.raise()
                   
            function clicked(d:PackedNodeWithSorted<hierarchyData>) {	
                const focus0 = focus; focus = d;
                                
                const myMaxRadius = (diameter/2) - margin;  
                const centerX = width/2, centerY = height/2;//center, (diameter/2, diameter/2)
                
                const k = diameter / view[2];
                const myR = /*currentData==="---"?Math.max((d.r * k),0.25):*/d.r * k;
                
                thicknessK=myR/myMaxRadius;
                
                scale = myMaxRadius/myR;
                const dx = isSorted?d.sortedX ?? 0:d.x
                const myCx = ((dx - view[0]) * k);
                const translateX = centerX-(myCx * scale);
                const dy = isSorted?d.sortedY ?? 0:d.y
                const myCy = ((dy - view[0]) * k);
                const translateY = centerY-(myCy * scale);
                
                const scalingTranslate = ((myR*2)/diameter)*2; 
                canvas.transition().duration(1000)        
                    .attr("transform", "translate(" + translateX + "," + translateY + ")scale("+(scale)+")");
                                        
                texts
                    .style("font-size", LABELFONTSIZE * thicknessK + 'px')
                    .filter(function(d) { return (d as PackedNodeWithSorted<hierarchyData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  	    
                    .style("fill-opacity", function(d) { return (d as PackedNodeWithSorted<hierarchyData>).parent === focus ? 1 : 0; })
                    .style("display", function(d){return ((d as PackedNodeWithSorted<hierarchyData>).parent===focus? "inline":"none");})
                    //.each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                    //.each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });                                                            
                //event.stopPropagation();
            }
            function reset(){
                canvas.transition().duration(animDuration)
                    .attr("transform", "translate(" + (width/2) + ", " + (height/2) + ")scale(1)");
                        
                focus = root;scale=1;thicknessK = 1;                    
                                    
                texts
                    .style("font-size", LABELFONTSIZE * thicknessK + 'px')
                    .filter(function(d) { return (d as PackedNodeWithSorted<hierarchyData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	  
                        //.transition().duration(750)
                    .style("fill-opacity", function(d) { return (d as PackedNodeWithSorted<hierarchyData>).parent === focus ? 1 : 0; })
                    .style("display", function(d){return ((d as PackedNodeWithSorted<hierarchyData>).parent===focus? "inline":"none");});                                                                                                                 
                
                return;
            }

            reset()
        }, 
        [hierarchyData, colorScheme, parentWidth, parentHeight, isSorted]
    );

    return (
        <div 
            ref={ref}
            style={{ width:parentWidth, height: parentHeight, display:'flex', flexDirection:'column' }}
        >
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column", position: "relative",}}>            
                <svg                
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}                    
                    viewBox={`0 0 ${parentWidth} ${parentHeight}`}
                >
                    <g className="plot-area" />
                </svg>                
                <label 
                    className={styles["controls-label"]}
                    style={{position: "absolute", right: "12px", top: "6px"}}
                >
                    <input 
                        type="checkbox" 
                        className={styles["controls-checkbox"]}                         
                        checked={isSorted}
                        onChange={(e) => setIsSorted(e.target.checked)}
                    />
                        Sort
                </label>
                <Tooltip>
                    <p className='name' 
                        style={{fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat"}}>
                        Tooltip
                    </p>
                    <p className='value' 
                        style={{fontWeight: "400px", margin: "3px", fontSize: "13px", color: "wheat", textAlign:"right"}}>
                        Tooltip
                    </p>
                </Tooltip>
            </div>            
        </div>  
    )
}