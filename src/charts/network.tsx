import React, {useState} from 'react';
import { select, axisBottom, min, max, format, color as d3Color,
    scaleLinear, ScaleLinear, group, hierarchy,
    drag, D3DragEvent,
    forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, 
    forceX, forceY,
    HierarchyNode, HierarchyLink, pack, quadtree, rollup,
    tree, TreeLayout, linkRadial, HierarchyPointLink, HierarchyPointNode,
    scaleOrdinal,
    schemeCategory10,
    range,
    interpolate,
    QuadtreeLeaf,
    QuadtreeInternalNode
 } from 'd3';
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Force
} from "d3-force"; 
import { useD3 } from '../hooks/useD3';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor, renderLineChart } from '../utils';
import styles from './global.module.css';
import { pointData, tooltipFormat, lineDecor, orientationType,
    hierarchyData,
    networkNode, networkLink, networkEdge, networkResolvedLink, networkDataType,
    
 } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { useParentSize } from '../hooks/useParentSize';

type treeNode = HierarchyNode<hierarchyData> &
             { baseX?: number; baseY?: number; finalX?: number; finalY?: number}

export type networkHierarchyNode = SimulationNodeDatum & treeNode;
export type networkHierarchyLink = SimulationLinkDatum<networkHierarchyNode> & 
    HierarchyLink<hierarchyData> & 
    {
        value?: number;
    };

type NetworkProps = {
    data: hierarchyData | networkDataType;   
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    tooltipFormat?: tooltipFormat;
}

const n = 200
const m = 10
const testData = ({
    children: Array.from(
        group(
            Array.from({length: n}, (_, i) => ({
                group: Math.random() * m | 0,
                value: -Math.log(Math.random())
            })),
            d => d.group
        ),
        ([, children]) => ({children})
    )
})

export function NetworkGraph({
        data, 
        color: {
            idx = 0,               // default idx
            type = 'fixed',        // default type
        } = { idx: 0, type: 'fixed' },
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:NetworkProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)        

    const color = {idx, type}
    const animDuration = 750;

    const mode = "name" in data?"hierarchy":
        ("nodes" in data && "links" in data)?"network":
        "invalid"
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        if(mode === "invalid") return               
        
        const radius = Math.min(width, height) / 2 - 30;        

        const canvasSvg = container.select<SVGSVGElement>("svg")
            
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')

        function assignGroups(root: hierarchyData): hierarchyData {
            function visit(
                node: hierarchyData,
                depth: number,
                currentGroup: string
            ) {
                if (depth === 0) {
                    node.group = node.name;
                } else if (depth === 1) {
                    currentGroup = node.name;
                    node.group = currentGroup;
                } else {
                    node.group = currentGroup;
                }

                node.children?.forEach(child =>
                    visit(child, depth + 1, currentGroup)
                );
            }

            visit(root, 0, root.name);

            return root;
        }

        const hierarchyData = cloneObj(data)
        assignGroups(hierarchyData)
        
        const tooltip = container.select(`#tooltip`).style("opacity", 0)
        
        const root = mode === "hierarchy"?hierarchy(hierarchyData):data 
        
        type chartNode = networkNode | networkHierarchyNode;
        type chartLink = networkLink | networkResolvedLink | networkHierarchyLink;
        
        let linksData:chartLink[]
        let nodesData:chartNode[]
        if(mode === "hierarchy"){
            const treeFn: TreeLayout<hierarchyData>= tree<hierarchyData>()
                .size([2 * Math.PI, radius])
                .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth)

            const rootedTree:treeNode = treeFn(root as HierarchyNode<hierarchyData>)
                    
            rootedTree.each(node => {            
                node.baseX = node.x;
                node.baseY = node.y;
                node.finalX = node.y! * Math.cos(node.x! - Math.PI / 2);
                node.finalY = node.y! * Math.sin(node.x! - Math.PI / 2);

                delete node.x
                delete node.y
            });

            nodesData = rootedTree.descendants() as networkHierarchyNode[]
            linksData = rootedTree.links()
        }else{
            linksData = (root as networkDataType).links as networkLink[]
            nodesData = (root as networkDataType).nodes as networkNode[]
        }

        console.log(nodesData)
        
        const simulation = forceSimulation<chartNode>(nodesData)

        const nodeRadius = (d:networkHierarchyNode) => {
            return (d as networkHierarchyNode).depth === 0?8:
                d.depth === 1?5:3
        }
        const baseRadius = 4
        if(mode === "hierarchy"){
            simulation
                .force(
                        "link",
                        forceLink<networkHierarchyNode, networkHierarchyLink>(linksData as networkHierarchyLink[])
                            .id(d => (d as networkNode).id)
                            .distance(50)
                    )
                .force("x", forceX<networkHierarchyNode>(-width / 2)
                    .x((d: networkHierarchyNode) => d.finalX ?? 0)
                    .strength(1))
                .force("y", forceY<networkHierarchyNode>(-height / 2)
                    .y((d: networkHierarchyNode) => d.finalY ?? 0)
                    .strength(1))
                .force("charge", forceManyBody().strength(-30))
                .force(
                    "collide", 
                    forceCollide<networkHierarchyNode>().radius(function(d){return nodeRadius(d)})
                )
                .alpha(0.15) 
        }else if(mode === "network"){
            simulation
                .force(
                    "link",
                    forceLink<chartNode, chartLink>(linksData)
                        .id(d => (d as networkNode).id)
                        //.distance(100)
                )
                .force(
                    "charge", 
                    forceManyBody()//.strength(-80)
                )
                //.force("center", forceCenter(width / 2, height / 2))
                //.force("collision", forceCollide(18))
                .force("center", forceCenter())
        }

        const color = scaleOrdinal(schemeCategory10);

        const links = canvas
            .selectAll<SVGLineElement, chartLink>("line")
            .data(linksData)
            .join("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .style("stroke-width", function(d){
                return d.value ?? 1
            });
        const nodes = canvas
            .selectAll<SVGCircleElement, chartNode>("circle")
            .data(nodesData)
            .join("circle")
            //.attr("fill", d => d.children ? null : "#000")
            .attr("stroke", 
                d => mode === "hierarchy"? 
                    (d as networkHierarchyNode).children ? null : "#fff":
                    "none"
            )
            .attr(
                "r", 
                (d) => 
                    mode === "hierarchy"?
                        nodeRadius(d as networkHierarchyNode):
                        (d as networkNode).radius ?? baseRadius            
            )
            .attr(
                "fill", 
                (d) => {
                    if(mode === "hierarchy"){
                        const nodeData = d as networkHierarchyNode
                        if(nodeData.data.color){
                            return nodeData.data.color
                        }
                        const { group } = nodeData.data
                        return group !== undefined ? color(String(group)) ?? "steelblue" : "steelblue";
                    }
                    const group = (d as networkNode).group;
                    return group !== undefined ? color(String(group)) ?? "steelblue" : "steelblue";
                }
            );

        const labels = canvas
            .selectAll<SVGTextElement, chartNode>("text.label")
            .data(nodesData)
            .join("text")
            .attr("class", "label")            
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .attr("dy", "0.31em")                                    
            .attr("paint-order", "stroke")
            .attr("stroke", "white")
            .attr("fill", "currentColor")
            .style("font-size", 6)
            .style("pointer-events", "none")
            .text(d => mode === "hierarchy"?
                (d as networkHierarchyNode).data.name:
                (d as networkNode).id
            )

        if(mode === "hierarchy"){
            labels
                .attr("text-anchor", d => (d as networkHierarchyNode).baseX! < Math.PI === !(d as networkHierarchyNode).children ? "start" : "end")
        }else if(mode === "network"){
            labels.attr("text-anchor", "middle")
        }

        nodes.raise()
        labels.raise()

        simulation.on("tick", () => {
            links
                .attr(
                    "x1", 
                    d => mode === "hierarchy"?
                        (d.source as networkHierarchyNode).x!:
                        (d.source as networkNode).x!
                )
                .attr(
                    "y1", 
                    d => mode === "hierarchy"?
                        (d.source as networkHierarchyNode).y!:
                        (d.source as networkNode).y!
                )
                .attr(
                    "x2", 
                    d => mode === "hierarchy"? 
                        (d.target as networkHierarchyNode).x!:
                        (d.target as networkNode).x!
                )
                .attr(
                    "y2", 
                    d => mode === "hierarchy"?
                        (d.target as networkHierarchyNode).y!:
                        (d.target as networkNode).y!
                );                    

            nodes
                .attr("cx", d => d.x ?? 0)
                .attr("cy", d => d.y ?? 0);
                
            labels                
                .attr("transform", d => {
                    if(mode === "hierarchy"){
                        const labelData = d as networkHierarchyNode
                        if(labelData.depth === 0){
                            return ''
                        }
                        const angle = labelData.baseX! * 180 / Math.PI - 90;
                        const flip = labelData.baseX! >= Math.PI ? 180 : 0;

                        return `rotate(${angle + flip}, ${d.x}, ${d.y})`;
                    }
                    return ''
                    
                })
                .attr("x", d => {
                    const xFactor = mode === "hierarchy"?
                        (d as networkHierarchyNode).baseX! < Math.PI === !(d as networkHierarchyNode).children ? 6 : -6:
                        0
                    return d.x! + xFactor
                })                
                .attr("y", d => d.y! + (mode === "network"?(baseRadius + 4):0))                                                    
        })

        const dragFn = drag<SVGCircleElement, chartNode>()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded);            

        nodes.call(dragFn)

        function dragStarted(
            event: D3DragEvent<SVGCircleElement, chartNode, chartNode>, 
            d: chartNode
        ) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(
            event: D3DragEvent<SVGCircleElement, chartNode, chartNode>,
            d: chartNode
        ): void {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded(
            event: D3DragEvent<SVGCircleElement, chartNode, chartNode>,
            d: chartNode
        ): void {
            if (!event.active) {
                simulation.alphaTarget(0);
            }

            d.fx = null;
            d.fy = null;
        }
    }, [data, mode, color, width, height, {prefix, suffix, formatType} ]);
        
    return (
        <div 
            ref={ref} 
            style={{ width, height, display:'flex', flexDirection:'column', }}
        >                     
            <div ref={chartRef} style={{width, height, position: 'relative'}}>
                <svg                                                        
                    width={width}
                    height={height}
                    viewBox={`${-width/2} ${-height/2} ${width} ${height}`}
                    style={{border: "1px solid green"}}
                >
                    <g className="plot-area" />                        
                </svg>            
               
                <Tooltip />
            </div>
            
        </div>
    );
}