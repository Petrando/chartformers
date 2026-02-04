import React, {useState, useEffect, useRef} from 'react';
import {select, easeCubicOut, interpolateNumber, hierarchy, pack, scaleLinear, interpolateHcl, 
    HierarchyCircularNode, HierarchyNode} from 'd3';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { basicFormat, cloneObj } from '../../utils';
import { oldPack } from './utils';
import { circlePackData, tooltipFormat } from '../../types';
import styles from '../global.module.css';
import packStyles from './circle-pack.module.css'

type PackProps = {
    data: circlePackData[];
    tooltipFormat?: tooltipFormat;
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

type hoveredData = {name: string, value: number}

export function CirclePacks({data, tooltipFormat}: PackProps) {
    const [circlePackData, setPackData] = useState<circlePackData[] | null>(null);
    const [ isSorted, setIsSorted ] = useState(false)
    const [ hoveredData, setHoveredData ] = useState<hoveredData>({name: "", value: 0})    
    const [ prevHoveredData, setPrevHoveredData] = useState<hoveredData>({name: "", value: 0})
    const isFirstRender = useRef(true)
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width:parentWidth, height: parentHeight} = parentSize;    

    const pNameRef = useRef<HTMLParagraphElement | null>(null);
    const pValueRef = useRef<HTMLParagraphElement | null>(null);

    useEffect(() => {
        if (!pValueRef.current) return;
        if(!pNameRef.current) return

        const elName = pNameRef.current        

        function interpolateText(a: string, b: string) {            
            const max = Math.max(a.length, b.length);
            
            return function (t: number) {
                let result = "";
                for (let i = 0; i < max; i++) {
                    result += t < 0.5 ? a[i] ?? "" : b[i] ?? "";
                }
                return result;                
            };            
        }
        select(elName)
            .transition()
            .duration(250)
            .tween("text", function () {
                const i = interpolateText(prevHoveredData.name, hoveredData.name);
                return function (t) {
                    elName.textContent = i(t);
                };
            });

        const elValue = pValueRef.current;

        select(elValue)
            .transition()
            .duration(250)
            .ease(easeCubicOut)
            .tween("text", function () {                
                const i = interpolateNumber(prevHoveredData.value, hoveredData.value);

                return function (t) {
                    elValue.textContent = basicFormat(Math.round(i(t)), tooltipFormat).toLocaleString();
                };
            });
    }, [ hoveredData, prevHoveredData ]);

    useEffect(()=>{
        setPackData((prev) => {            

            if(prev !== null){
                isFirstRender.current = false
            }
            return data
        })
    }, [data])        

    const isMidSmallScreen = parentWidth <= 768;
    const animDuration = 1000
    const chartRef = useD3<HTMLDivElement>(
        (container) => 
        {
            if(!circlePackData){
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

            const rootData:circlePackData = {'name':'branches', 'children':circlePackData}                    

            const diameter = Math.min(graphWidth, graphHeight)
                        
            const root = hierarchy(cloneObj(rootData))
                .sum(function(d) { return d.value!; })
                .sort(function(a, b){return a.value! - b.value!;})

            const packFn = pack<circlePackData>()
                .size([diameter - margin, diameter - margin])
                .padding(2)                

            const sortedPackFn = oldPack()
                .padding(2)
                .size([diameter - margin, diameter - margin])
                .value(function(d:circlePackData) { return d.value; })
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

            const color = scaleLinear<string>()
                .domain([-1, 2])
                .range(["#34d399", "#6b21a8"])
                .interpolate(interpolateHcl);
            
            function circleRadius(d:PackedNodeWithSorted<circlePackData>) { 
                const k = diameter / view[2];	                                
                
                const circleRadius = isSorted?d.sortedR ?? 0:d.r
                return circleRadius * k;
            }

            function xPos(d: PackedNodeWithSorted<circlePackData>){
                const k = diameter / view[2];                    
                const xPos = isSorted?d.sortedX ?? 0:d.x
                return ((xPos - view[0]) * k);
            }

            function yPos(d: PackedNodeWithSorted<circlePackData>){
                const k = diameter / view[2];                                                              
                const yPos = isSorted?d.sortedY ?? 0:d.y
                return ((yPos - view[1]) * k);
            }

            const circles = canvas
                .selectAll<SVGCircleElement, PackedNodeWithSorted<circlePackData>>("circle")
                .data(nodes,(d:PackedNodeWithSorted<circlePackData>) => d.data.name)
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
                            .style("fill", function(d) { 
                                const cirleColor = d.children ? color(d.depth) : "#f0fdfa";                              
                                return cirleColor; 
                            })
                            .style("cursor", "pointer")
                                .transition().duration(animDuration)
                            .attr("r", circleRadius)
                            .attr("cx", xPos)
                            .attr("cy", yPos)
                            .style("stroke", "#737373")
                            .style("stroke-width", CIRCLESTROKE * thicknessK)
                            .style("fill", function(d) { 
                                const cirleColor = d.children ? color(d.depth) : "#f0fdfa";                              
                                return cirleColor; 
                            }),
                    update=>update.transition().duration(animDuration)
                        .attr("cx", xPos)
                        .attr("cy", yPos)
                        .attr("r", circleRadius)
                        .style("stroke", function(d){
                            return "#737373";
                        })
                        .style("stroke-width", CIRCLESTROKE * thicknessK)
                        .style("fill", function(d) { 
                            const cirleColor = d.children ? color(d.depth) : "#f0fdfa";                        
                            return cirleColor; 
                        }),
                    exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
                )
                .on('mouseover', function(e, d){                        
                    if(focus.parent===d){
                        texts.filter(function(dText) { return (dText as HierarchyCircularNode<circlePackData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                            .style("font-size", LABELFONTSIZE * thicknessK)
                            .style("fill-opacity", function(d) { return (d as HierarchyCircularNode<circlePackData>).parent === focus ? 1 : 0; })
                            .style("display", function(d){return ((d as HierarchyCircularNode<circlePackData>).parent===focus? "inline":"none");});
                    }
                    else{  
                        if(d===focus){
                            texts.filter(function(dText) { return (dText as HierarchyCircularNode<circlePackData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                                .style("font-size", LABELFONTSIZE * thicknessK)
                                .style("fill-opacity", function(d) { return (d as HierarchyCircularNode<circlePackData>).parent === focus ? 1 : 0; })
                                .style("display", function(d){return ((d as HierarchyCircularNode<circlePackData>).parent===focus? "inline":"none");});
                        }else /*if(d.parent===focus)*/{
                            texts.filter(function(dText){
                                if(isSorted){
                                    const dCircle = d as HierarchyNode<circlePackData>
                                    const textData = dText as HierarchyNode<circlePackData>
                                    return textData.name!==dCircle.name
                                }
                                
                                return (dText as HierarchyCircularNode<circlePackData>).data.name!=d.data.name;
                            })
                                .style("fill-opacity", 0)
                                .style("display", "none");
                            
                            texts.filter(function(dText){
                                if(isSorted){
                                    const dCircle = d as HierarchyNode<circlePackData>
                                    const textData = dText as HierarchyNode<circlePackData>
                                    return textData.name!==dCircle.name
                                }
                                return (dText as HierarchyCircularNode<circlePackData>).data.name===d.data.name;
                            })
                                .style("fill-opacity", 1)
                                .style("display", "inline");
                        }
                    }
                                        		 
                    let myStroke = select(this).style('stroke');
                    if(d!=root){select(this)
                        .style("stroke-width", CIRCLESTROKE * thicknessK * 2.5)
                        .style("stroke", "#e4e4e7");}

                    tooltip.transition().duration(250).style("opacity", 1)
                    setHoveredData(prev=>{
                        setPrevHoveredData(prev)
                        const branchName = d.data.name
                        const name = branchName === "branches"?"Total":branchName
                        return {name, value: d.value?d.value:0}
                    })
                })
                .on('mouseout', function(e, d){
                    texts.filter(function(d) { return (d as HierarchyCircularNode<circlePackData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                        //.style("font-size", LABELFONTSIZE * thicknessK)
                        .style("fill-opacity", function(d) { return (d as HierarchyCircularNode<circlePackData>).parent === focus ? 1 : 0; })
                        .style("display", function(d){return ((d as HierarchyCircularNode<circlePackData>).parent===focus? "inline":"none");});
            
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

            function textTransform(d: PackedNodeWithSorted<circlePackData>) { 
                const k = diameter / view[2];
                const xPos = isSorted?d.sortedX ?? 0:d.x
                const yPos = isSorted?d.sortedY ?? 0:d.y                                
                return "translate(" + (xPos - view[0]) * k + "," + (yPos - view[1]) * k + ")"; 
            }

            const texts = canvas
                .selectAll<SVGTextElement, PackedNodeWithSorted<circlePackData>>("text")
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
                   
            function clicked(d:PackedNodeWithSorted<circlePackData>) {	
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
                    .filter(function(d) { return (d as PackedNodeWithSorted<circlePackData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  	    
                    .style("fill-opacity", function(d) { return (d as PackedNodeWithSorted<circlePackData>).parent === focus ? 1 : 0; })
                    .style("display", function(d){return ((d as PackedNodeWithSorted<circlePackData>).parent===focus? "inline":"none");})
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
                    .filter(function(d) { return (d as PackedNodeWithSorted<circlePackData>).parent === focus || (this as SVGTextElement).style.display === "inline"; })	  
                        //.transition().duration(750)
                    .style("fill-opacity", function(d) { return (d as PackedNodeWithSorted<circlePackData>).parent === focus ? 1 : 0; })
                    .style("display", function(d){return ((d as PackedNodeWithSorted<circlePackData>).parent===focus? "inline":"none");});                                                                                                                 
                
                return;
            }

            reset()
        }, 
        [circlePackData, parentWidth, parentHeight, isSorted]
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
                <div id="tooltip"
                    className={`${packStyles["glass_card"]}`} 
                    style={{
                        position: "absolute", left: 2, top: 2, fontSize: 12, fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 2
                    }}>                    
                    <p ref={pNameRef} id="name" style={{ padding: 0, margin: 0}}>
                        Test tooltip
                    </p>
                    <p ref={pValueRef} id="value" style={{ padding: 0, margin: 0}}>
                        Test tooltip
                    </p>
                </div>
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
            </div>            
        </div>  
    )
}