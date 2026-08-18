import React, {useState, useRef, useEffect} from 'react';
import { select, axisBottom, min, max, format, color as d3Color,
    scaleLinear, ScaleLinear, group, hierarchy,
    drag, D3DragEvent,
    forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation,
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
  //Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum,
  Force,
  ForceLink
} from "d3-force"; 
import { useD3 } from '../hooks/useD3';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor, isFiniteNumber } from '../utils';
import styles from './global.module.css';
import { pointData, tooltipFormat, lineDecor, orientationType,
    hierarchyData,
    networkNode, networkLink, networkEdge, networkResolvedLink, networkDataType,
    
} from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { useParentSize } from '../hooks/useParentSize';
import { exit } from 'process';

type dijkstraResult = {
    distances: Map<string, number>;
    previous: Map<string, string | null>;
    path: string[] | undefined;
};

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

type chartNode = networkNode | networkHierarchyNode;
type chartLink = networkLink | networkResolvedLink | networkHierarchyLink;

type NetworkProps = {
    data: hierarchyData | networkDataType;
    sourceNode: string;
    targetNode: string;
    leafOnly?: boolean;   
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    tooltipFormat?: tooltipFormat;
}

export function NetworkGraph({
        data, 
        sourceNode, targetNode,
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

    const reRender = useRef(true)
    const reRenderJustChanged = useRef(true)    

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)        
    const simulationRef = useRef<Simulation<chartNode, undefined> | null>(null);

    const color = {idx, type}
    const animDuration = 750;

    const mode = "name" in data?"hierarchy":
        ("nodes" in data && "links" in data)?"network":
        "invalid"

    useEffect(() => {
        reRender.current = true
        reRenderJustChanged.current = true
        setTimeout(()=>{reRenderJustChanged.current = false}, 250)
    }, [data])
    useEffect(() => {        
        reRender.current = true        
    }, [leafOnly, width, height])

    useEffect(() => {        
        if(!reRenderJustChanged.current){            
            reRender.current = false
        }        
    }, [ sourceNode, targetNode ])

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
                
        let linksData:chartLink[] = []
        let nodesData:chartNode[] = []

        let types: (string | undefined)[] = []
        
        if(reRender.current){
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
        }
        
        let networkType = types.length === 0?"standard":"arrow"        

        const hierarchyNodeRadius = (d:networkHierarchyNode) => {
            return (d as networkHierarchyNode).depth === 0?8:
                d.depth === 1?5:3
        }

        const baseRadius = 4
        
        let simulation = forceSimulation<chartNode>()        
        
        if(reRender.current){
            simulation.nodes(nodesData)//.stop()
            //const simulation = forceSimulation<chartNode>(nodesData).stop()                
            
            if(mode === "hierarchy"){
                if(leafOnly){
                    simulation                
                        .force("center", null)    
                        .force("link", null)
                        .force("charge", null)
                        .force("x", forceX(-width / 2).strength(0.01))
                        .force("y", forceY(-height / 2).strength(0.01))
                        .force("cluster", forceCluster())
                        .force("collide", forceLeafCollide())
                        .alpha(1)
                        .alphaTarget(0)
                        //.alphaTarget(0.3)
                        //.restart()                                                
                        
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
                                                let x = d.x - qLeaf.data.x, 
                                                    y = d.y - qLeaf.data.y, 
                                                    l = Math.hypot(x, y);
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
                        .force("center", forceCenter())
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
                        //.force("cluster", null)
                        .alpha(0.15)                    
                        .alphaTarget(0)
                        //.restart()                    

                        //console.log(simulation.force("center"))
                }
                
            }else if(mode === "network"){
                
                if(networkType === "standard"){
                    simulation
                        .force("x", null)
                        .force("y", null)
                        .force("cluster", null)
                        .force("collide", null)
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
                        //.force("cluster", null)
                        //.force("collide", null)
                        .force("center", forceCenter())
                        .alpha(1)
                        .alphaTarget(0)
                        //.alphaTarget(0.3)
                        //.restart()                    
                        
                }else if(networkType === "arrow"){
                    simulation
                        .force("center", null)
                        .force("cluster", null)
                        .force("collide", null)
                        .force(
                            "link", 
                            forceLink<chartNode, chartLink>(linksData).id(d => (d as networkNode).id)
                        )
                        .force("charge", forceManyBody().strength(-400))                    
                        .force("x", forceX())
                        .force("y", forceY())
                        .alpha(1)
                        .alphaTarget(0)
                        //.alphaTarget(0.3)                    
                        //.restart()                    
                }
                
                
            }
            
            simulationRef.current = simulation
                        
        }else{
            //console.log(simulationRef.current)
            //console.log(simulationRef.current?.nodes())
            simulation = simulationRef.current as Simulation<chartNode, undefined>
            const linkForce = simulation.force("link") as ForceLink<chartNode, chartLink>
            linksData = linkForce?.links()
            const baseTypes = linksData.map(d => (d as networkLink).type)
            types = baseTypes.some(t => t === undefined)?[]:[...baseTypes]
            nodesData = simulation?.nodes()
            
        }

        networkType = types.length === 0?"standard":"arrow"
                
        function dijkstra(
            data: {
                nodes: chartNode[]; links: chartLink[]
            },
            startId: string,
            endId?: string
        ): dijkstraResult | string {

            const sourceNodeName = data.nodes.filter(d => (
                mode === "hierarchy"?(d as networkHierarchyNode).data.name === sourceNode:
                mode === "network"?(d as networkNode).id === sourceNode:
                undefined
            ))
            
            if(!sourceNodeName || sourceNodeName.length === 0){
                return "no source node"
            }

            const targetNodeName = data.nodes.filter(d => (
                mode === "hierarchy"?(d as networkHierarchyNode).data.name === targetNode:
                mode === "network"?(d as networkNode).id === targetNode:
                undefined
            ))
            
            if(!targetNodeName || targetNodeName.length === 0){
                return "no target node"
            }
            // Distance from start node
            const distances = new Map<string, number>();

            // Previous node in shortest path
            const previous = new Map<string, string | null>();

            // Unvisited nodes
            const unvisited = new Set<string>();

            // Build adjacency list
            const adjacency = new Map<
                string,
                { node: string; weight: number }[]
            >();

            for (const node of data.nodes) {
                const nodeId = mode === "hierarchy"?(node as networkHierarchyNode).data.name:
                    (node as networkNode).id
                distances.set(nodeId, Infinity);
                previous.set(nodeId, null);
                unvisited.add(nodeId);
                adjacency.set(nodeId, []);
            }

            for (const link of data.links) {
                const linkSourceName = mode === "hierarchy"?(link.source as networkHierarchyNode).data.name:
                    (link.source as networkNode).id
                const linkTargetName = mode === "hierarchy"?(link.target as networkHierarchyNode).data.name:
                    (link.target as networkNode).id
                const linkValue = mode === "hierarchy"?1:
                    (link as networkResolvedLink).value ?? 1
                    
                adjacency.get(linkSourceName)?.push({
                    node: linkTargetName,
                    weight: linkValue,
                });
                
                // Remove this if your graph is directed
                adjacency.get(linkTargetName)?.push({
                    node: linkSourceName,
                    weight: linkValue,
                });
            }

            distances.set(startId, 0);

            while (unvisited.size > 0) {
                // Find closest unvisited node
                let current: string | null = null;
                let smallest = Infinity;

                for (const id of unvisited) {
                    const d = distances.get(id)!;

                    if (d < smallest) {
                        smallest = d;
                        current = id;
                    }
                }

                if (current === null) break;

                // Optional early exit
                if (current === endId) break;

                unvisited.delete(current);

                for (const neighbor of adjacency.get(current)!) {
                    if (!unvisited.has(neighbor.node))
                        continue;

                    const alt =
                        distances.get(current)! +
                        neighbor.weight;

                    if (alt < distances.get(neighbor.node)!) {
                        distances.set(neighbor.node, alt);
                        previous.set(neighbor.node, current);
                    }
                }
            }

            // Reconstruct path
            const buildPath = (target: string) => {
                const path: string[] = [];

                let current: string | null = target;

                while (current !== null) {
                    path.unshift(current);
                    current = previous.get(current)!;
                }

                return path;
            };

            return {
                distances,
                previous,
                path:
                    endId !== undefined
                        ? buildPath(endId)
                        : undefined,
            };
            
        }
        
        const shortestPath = dijkstra(
            { nodes: nodesData, links: linksData},
            sourceNode, targetNode
        )
        
        if(typeof shortestPath !== "string"){
            console.log(shortestPath.distances.get(targetNode))
        }        
                
        const color = scaleOrdinal(schemeCategory10);        

        const markColor = scaleOrdinal(types as string[], schemeCategory10);
        const markers = defs.selectAll("marker")
            .data(types, d => typeof d === "string"?d:"")
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

        if(typeof shortestPath !== "string"){
            console.log(shortestPath.path)
        }
                    
        const linkOpacity = (d: networkResolvedLink) => {
            if(typeof shortestPath === "string"){
                return 1
            }
            const { distances, previous, path } = shortestPath as dijkstraResult
            if(Array.isArray(path)){
                const sourceName = mode === "network"?
                    (d.source as networkNode).id:
                    (d.source as networkHierarchyNode).data.name
                const targetName = mode === "network"?
                    (d.target as networkNode).id:
                    (d.target as networkHierarchyNode).data.name

                let inPath = false
                for(let i = 0; i < path.length - 1; i++){
                    if(sourceName === path[i] && targetName === path[i + 1]){
                        inPath = true
                        break;
                    }
                    //delete below for directed path
                    if(targetName === path[i] && sourceName === path[i + 1]){
                        inPath = true
                        break;
                    }
                }                
                return inPath?1:0.1                
            }
            return 0.1
        }
                            
        const pathLinks = canvas.selectAll<SVGPathElement, networkResolvedLink>("path.link")
            .data(
                linksData, 
                function(d){
                    if(mode === "hierarchy"){                        
                        const sourceName = (d.source as networkHierarchyNode).data?.name
                        const targetName = (d.source as networkHierarchyNode).data?.name                        
                        return `${sourceName}-${targetName}`
                    }
                    else if(mode === "network"){                        
                        const sourceName = (d.source as networkNode).id
                        const targetName = (d.target as networkNode).id
                        return `${sourceName}-${targetName}`
                    }
                    return ""
            })
            .join(
                enter=>enter.append("path")
                    .attr("class", "link")
                    .attr("fill", "none")
                    .attr("stroke-width", 1.5)
                    .attr("stroke", d => 
                        networkType === "arrow"?
                        color((d as networkResolvedLink).type ?? "#999"):
                        "#999"
                    )
                    .attr("marker-end", d => `url(#arrow-${(d as networkResolvedLink).type})`)
                    .attr("stroke-opacity", d => linkOpacity(d as networkResolvedLink)),
                undefined,
                exit=>exit.remove()
            )
            .attr("stroke", d => 
                networkType === "arrow"?
                color((d as networkResolvedLink).type ?? "#999"):
                "#999"
            )
            .attr("marker-end", d => `url(#arrow-${(d as networkResolvedLink).type})`)
            .attr("stroke-opacity", d => linkOpacity(d as networkResolvedLink))            

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

        const nodeInPath = (d: chartNode):
            "no path to highlight" | "source or destination" | "path" | "not path member"=> {
            if(typeof shortestPath === "string"){
                return "no path to highlight"
            }
            const { path } = shortestPath as dijkstraResult
            if(Array.isArray(path)){
                const nodeName = mode === "network"?
                    (d as networkNode).id:
                    (d as networkHierarchyNode).data.name

                const idx = path.indexOf(nodeName)

                return (idx === 0 || idx === path.length - 1)?
                    "source or destination":
                    idx > -1?"path":
                    "not path member"
            }
            return "not path member"
        }

        const textOpacity = (d: chartNode) => {
            const status = nodeInPath(d)
            if(status === "no path to highlight"){
                return 1
            }
            if(status === "source or destination" || status === "path"){
                return 1
            }
            return 0.25
        }
        const nodeRadius = (d: chartNode) =>
            mode === "hierarchy"?
                hierarchyNodeRadius(d as networkHierarchyNode):
                (d as networkNode).radius ?? baseRadius                 

        function nodeId(d: chartNode){
            if(mode === "hierarchy"){                
                return (d as networkHierarchyNode).data?.name ?? ""
            }else if(mode === "network"){
                return (d as networkNode).id
            }else{
                return ""
            }                    
        }
        const nodes = canvas
            .selectAll<SVGCircleElement, chartNode>("circle.node")
            .data( nodesData, nodeId )
            .join(
                enter=>enter.append("circle")
                    .attr("class", "node")
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
                    ),
                undefined,
                exit=>exit.remove()
            )            
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

        nodes.on("mouseover", function(e, d){
            //console.log(d)
        })

        const baseFontSize = 6
        const fontSize = (d: chartNode) => {
            const status = nodeInPath(d)
            if(status === "no path to highlight"){
                return baseFontSize
            }
            if(status === "source or destination"){
                return 10
            }
            if(status === "path"){
                return 8
            }
            return baseFontSize
        }
        const labelsData = (mode === "hierarchy" && leafOnly)?[]:nodesData
        const labels = canvas
            .selectAll<SVGTextElement, chartNode>("text.label")
            .data(labelsData, nodeId)
            .join(
                enter=>enter.append("text")
                    .attr("class", "label")            
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-width", 3)
                    .attr("dy", "0.31em")                                    
                    .attr("paint-order", "stroke")
                    .attr("stroke", "white")
                    .attr("fill", "currentColor")
                    .style("font-size", fontSize)
                    .style("pointer-events", "none")
                    .text(d => mode === "hierarchy"?
                        (d as networkHierarchyNode).data.name:
                        (d as networkNode).id
                    )
                    .style("opacity", textOpacity),
                undefined,
                exit=>exit.remove()
            )
            .style("opacity", textOpacity)
            .style("font-size", fontSize)
            

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
            //console.log('ticks')                   

            nodes
                .attr("cx",clampX)
                .attr("cy", clampY);
                
            labels                
                .attr("transform", d => {
                    if(mode !== 'hierarchy')
                        return ''
                    
                    const labelData = d as networkHierarchyNode
                    if(labelData.depth === 0){
                        return ''
                    }

                    const x = d.x ?? 0;
                    const y = d.y ?? 0;
                    const baseX = labelData.baseX ?? 0;

                    // Don't generate an invalid transform
                    if (
                        !isFiniteNumber(x) ||
                        !isFiniteNumber(y) ||
                        !isFiniteNumber(baseX)
                    ) {
                        return "";
                    }
                    const angle = baseX * 180 / Math.PI - 90;
                    const flip = baseX >= Math.PI ? 180 : 0;

                    return `rotate(${angle + flip}, ${x}, ${y})`;
                })
                .attr("x", d => {
                    const xFactor = mode === "hierarchy"?
                        (d as networkHierarchyNode).baseX! < Math.PI === !(d as networkHierarchyNode).children ? 6 : -6:
                        0
                    const baseDX = clampX(d)
                    const dx = isFiniteNumber(baseDX)?baseDX:0
                    return dx + xFactor
                })                
                .attr("y", d => {
                    const baseDY = clampY(d)
                    const dy = isFiniteNumber(baseDY)?baseDY:0
                    return  dy + (mode === "network"?(baseRadius + 4):0)
                })                            
        })

        /*
        | Corner       | SVG coordinate          |
        | ------------ | ----------------------- |
        | Top-left     | `(-width/2, -height/2)` |
        | Top-right    | `(width/2, -height/2)`  |
        | Bottom-left  | `(-width/2, height/2)`  |
        | Bottom-right | `(width/2, height/2)`   |

        */

        const clampX = (d: chartNode) => {
            const baseX = isFiniteNumber(d.x) ? d.x : 0
            const r = nodeRadius(d)
            const xMin = -width/2 + r
            const xMax = width/2 - r

            /*return baseX <= xMin?xMin:
                baseX >= xMax?xMax:
                baseX*/
            return Math.min(Math.max(baseX, xMin), xMax)
        }

        const clampY = (d: chartNode) => {
            const baseY = isFiniteNumber(d.y) ? d.y : 0
            const r = nodeRadius(d)
            const yMin = -height/2 + r
            const yMax = height/2 - r

            /*return baseY <= yMin?yMin:
                baseY >= yMax?yMax:
                baseY*/
            return Math.min(Math.max(baseY, yMin), yMax)
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
    }, [data, sourceNode, targetNode, leafOnly, mode, color, width, height, {prefix, suffix, formatType} ]);
        
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