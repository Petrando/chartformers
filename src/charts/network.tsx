import React, {useState} from 'react';
import { select, axisBottom, min, max, format, color as d3Color,
    scaleLinear, ScaleLinear, group, hierarchy,
    drag, D3DragEvent,
    forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, 
    forceX, forceY,
    HierarchyNode, HierarchyCircularNode, HierarchyLink, pack, quadtree, rollup,
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

type packedNode = HierarchyCircularNode<hierarchyData> &
             { baseX?: number; baseY?: number; finalX?: number; finalY?: number}

type networkHierarchyPackedNode = SimulationNodeDatum & packedNode;

type NetworkProps = {
    data: hierarchyData | networkDataType;
    leafOnly?: boolean;   
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    tooltipFormat?: tooltipFormat;
}

export function NetworkGraph({
        data, 
        leafOnly = false,
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
        const defs = canvasSvg.selectAll("defs")
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
        
        const root = mode === "hierarchy"?hierarchy(hierarchyData):hierarchyData 
        
        type chartNode = networkNode | networkHierarchyNode;
        type chartLink = networkLink | networkResolvedLink | networkHierarchyLink;
        
        let linksData:chartLink[] = []
        let nodesData:chartNode[] = []

        let types: (string | undefined)[] = []
        
        if(mode === "hierarchy"){
            if(leafOnly){
                (root as HierarchyNode<hierarchyData>).sum(d => d.value ?? 1)

                const packFn = () => pack<hierarchyData>()
                    .size([width, height])
                    .padding(1)(root)

                nodesData = packFn().leaves() as networkHierarchyPackedNode[]
                linksData = []
                
            }
            else {
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
            }
        }else{
            linksData = (root as networkDataType).links as networkLink[]
            nodesData = (root as networkDataType).nodes as networkNode[]
            
            const baseTypes = linksData.map(d => (d as networkLink).type)
            types = baseTypes.some(t => t === undefined)?[]:[...baseTypes]             
        }

        const networkType = types.length === 0?"standard":"arrow"
        
        const simulation = forceSimulation<chartNode>(nodesData)

        const hierarchyNodeRadius = (d:networkHierarchyNode) => {
            return (d as networkHierarchyNode).depth === 0?8:
                d.depth === 1?5:3
        }
        const baseRadius = 4
        if(mode === "hierarchy"){
            if(leafOnly){
                simulation
                    .force("x", forceX(-width / 2).strength(0.01))
                    .force("y", forceY(-height / 2).strength(0.01))
                    .force("cluster", forceCluster())
                    .force("collide", forceLeafCollide())

                function forceCluster() {
                    const strength = 0.2;
                    let nodesRolled: networkHierarchyPackedNode[];

                    function force(alpha: number) {
                        const centroids = rollup(nodesRolled, centroid, d => d.data.group);
                        const l = alpha * strength;
                        for (const d of nodesRolled) {
                            const {x: cx, y: cy} = centroids.get(d.data.group) ?? {x: 0, y: 0};
                            if (d.vx == null) {
                                d.vx = 0;
                            }
                            if (d.vy == null) {
                                d.vy = 0;
                            }
                            d.vx -= ((d.x ?? 0) - cx) * l;
                            d.vy -= ((d.y ?? 0) - cy) * l;
                        }
                    }

                    force.initialize = (_: networkHierarchyPackedNode[]) => nodesRolled = _;

                    return force;
                }

                function centroid(nodes:networkHierarchyPackedNode[]) {
                    let x = 0;
                    let y = 0;
                    let z = 0;
                    for (const d of nodes) {
                        let k = d.r ** 2;
                        x += (d.x ?? 0) * k;
                        y += (d.y ?? 0) * k;
                        z += k;
                    }
                    return {x: x / z, y: y / z};
                }

                function forceLeafCollide() {
                    const alpha = 0.4; // fixed for greater rigidity!
                    const padding1 = 2; // separation between same-color nodes
                    const padding2 = 6; // separation between different-color nodes
                    let nodes: networkHierarchyPackedNode[];
                    let maxRadius: number;

                    const force: Force<networkHierarchyPackedNode, undefined> = () => {
                        const quadtreeFn = 
                            quadtree<networkHierarchyPackedNode>(nodes, d => d.x!, d => d.y!);
                        
                        for (const d of nodes) {
                            const r = d.r + maxRadius;
                            const nx1 = d.x - r, ny1 = d.y - r;
                            const nx2 = d.x + r, ny2 = d.y + r;
                            quadtreeFn.visit((q, x1, y1, x2, y2) => {
                                if (!q.length) {
                                    for (
                                        let qLeaf: QuadtreeLeaf<networkHierarchyPackedNode> | undefined = q; 
                                        qLeaf; 
                                        qLeaf = qLeaf.next
                                    ) {
                                        if (qLeaf.data !== d) {
                                            const r = d.r + qLeaf.data.r + (d.data.group === qLeaf.data.data.group ? padding1 : padding2);
                                            let x = d.x - qLeaf.data.x, y = d.y - qLeaf.data.y, l = Math.hypot(x, y);
                                            if (l < r) {
                                                l = (l - r) / l * alpha;
                                                d.x -= x *= l, d.y -= y *= l;
                                                qLeaf.data.x += x, qLeaf.data.y += y;
                                            }
                                        }
                                    }
                                }
                                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                            });
                        }
                    }

                    force.initialize = (
                        initNodes: networkHierarchyPackedNode[]
                    ) => {
                        nodes = initNodes;

                        maxRadius =
                            max(nodes, d => d.r)! +
                            Math.max(padding1, padding2);
                    };

                    return force;
                }
            }else{
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
                        forceCollide<networkHierarchyNode>()
                            .radius(hierarchyNodeRadius)
                    )
                    .alpha(0.15)
            }
             
        }else if(mode === "network"){
            if(networkType === "standard"){
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
            }else if(networkType === "arrow"){
                simulation
                    .force(
                        "link", 
                        forceLink<chartNode, chartLink>(linksData).id(d => (d as networkNode).id)
                    )
                    .force("charge", forceManyBody().strength(-400))
                    .force("x", forceX())
                    .force("y", forceY())
            }
            
        }

        const color = scaleOrdinal(schemeCategory10);        

        const markColor = scaleOrdinal(types as string[], schemeCategory10);
        const markers = defs.selectAll("marker")
            .data(types)
                .join("marker")
            .attr("id", d => `arrow-${d}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", (d) => markColor(d ?? ""))
            .attr("d", "M0,-5L10,0L0,5");        
        
        const pathLinks = canvas.selectAll<SVGPathElement, networkResolvedLink>("path.link")
            .data(linksData)
                .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .attr("stroke", d => 
                networkType === "arrow"?
                color((d as networkResolvedLink).type ?? "#999"):
                "#999"
            )
            .attr("marker-end", d => `url(#arrow-${(d as networkResolvedLink).type})`)        

        function linkArc(d: networkResolvedLink) {
            const sourceX = clampX(d.source)
            const sourceY = clampY(d.source)

            const targetX = clampX(d.target)
            const targetY = clampY(d.target)
            if(networkType === "standard"){
                return  `M${sourceX},${sourceY} L${targetX},${targetY}`
            }
            const r = Math.hypot(targetX - sourceX, targetY - sourceY);
            return `
                M${sourceX},${sourceY}
                A${r},${r} 0 0,1 ${targetX},${targetY}
            `;
        }

        const nodeRadius = (d: chartNode) =>
            mode === "hierarchy"?
                hierarchyNodeRadius(d as networkHierarchyNode):
                (d as networkNode).radius ?? baseRadius
         
        const nodes = canvas
            .selectAll<SVGCircleElement, chartNode>("circle")
            .data(nodesData)
            .join("circle")            
            .attr("stroke", 
                d => mode === "hierarchy"? 
                    (d as networkHierarchyNode).children ? null : "#fff":
                    "none"
            )
            .attr("r", nodeRadius)
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
            
        if(mode === "hierarchy" && leafOnly){
            nodes.transition()
                .delay((d, i) => Math.random() * 500)
                .duration(750)
                .attrTween("r", d => {
                    const i = interpolate(0, (d as networkHierarchyPackedNode).r);
                    const interpolatedR = (t: number) => `${i(t)}`
                    return interpolatedR;
                });
        }

        const labelsData = (mode === "hierarchy" && leafOnly)?[]:nodesData
        const labels = canvas
            .selectAll<SVGTextElement, chartNode>("text.label")
            .data(labelsData)
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
            pathLinks.attr("d", (d) => linkArc(d as networkResolvedLink));                   

            nodes
                .attr("cx",clampX)
                .attr("cy", clampY);
                
            labels                
                .attr("transform", d => {
                    if(mode === "hierarchy"){
                        const labelData = d as networkHierarchyNode
                        if(labelData.depth === 0){
                            return ''
                        }
                        const angle = labelData.baseX! * 180 / Math.PI - 90;
                        const flip = labelData.baseX! >= Math.PI ? 180 : 0;

                        return `rotate(${(isNaN(angle)?0:angle) + (isNaN(flip)?0:flip)}, ${d.x}, ${d.y})`;
                    }
                    return ''
                    
                })
                .attr("x", d => {
                    const xFactor = mode === "hierarchy"?
                        (d as networkHierarchyNode).baseX! < Math.PI === !(d as networkHierarchyNode).children ? 6 : -6:
                        0
                    const dX = clampX(d)
                    return dX + xFactor
                })                
                .attr("y", d => clampY(d) + (mode === "network"?(baseRadius + 4):0))                                                    
        })

        const clampX = (d: chartNode) => {
            const baseX = d.x ?? 0
            const r = nodeRadius(d)
            const xMin = -width/2 + r
            const xMax = width - r

            return baseX <= xMin?xMin:
                baseX >= xMax?xMax:
                baseX
        }

        const clampY = (d: chartNode) => {
            const baseY = d.y ?? 0
            const r = nodeRadius(d)
            const yMin = -height/2 + r
            const yMax = height - r

            return baseY <= yMin?yMin:
                baseY >= yMax?yMax:
                baseY
        }

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
    }, [data, leafOnly, mode, color, width, height, {prefix, suffix, formatType} ]);
        
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
                    <defs />
                    <g className="plot-area" />                        
                </svg>            
               
                <Tooltip />
            </div>
            
        </div>
    );
}