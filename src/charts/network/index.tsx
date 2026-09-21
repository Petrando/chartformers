import React, {useState, useRef, useEffect, useDeferredValue} from 'react';
import { select, max, color as d3Color, scalePow, hierarchy, drag, D3DragEvent, format, rgb,
    forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation,
    forceX, forceY, HierarchyNode, HierarchyCircularNode, HierarchyLink, pack, quadtree, rollup,
    tree, TreeLayout, scaleOrdinal, schemeCategory10, interpolate, QuadtreeLeaf,    
 } from 'd3';
import {
  //Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum,
  Force,
  ForceLink
} from "d3-force";
import { oldPack } from '../circle-packs/utils'; 
import { useD3 } from '../../hooks/useD3';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { basicFormat, cloneObj, indexSelectedColor, isFiniteNumber } from '../../utils';
import styles from '../global.module.css';
import { tooltipFormat, hierarchyData } from '../../types';
import { networkNode, networkLink, networkEdge, networkResolvedLink, networkDataType } from './types'

type dijkstraResult = {
    distances: Map<string, number>;
    previous: Map<string, string | null>;
    path: string[] | undefined;
};

type primitiveOrDate = string | number | boolean | Date; //symbol | null | undefined 

export type bubbleDataset = SimulationNodeDatum & {
  /** Required label property */
  label: string;  
  /** 
   * Requires at least one dynamic property with a string key and number value.
   * Note: TypeScript handles this via indexing rules alongside specific property types.
   */  
  [key: string]: number | primitiveOrDate;
};

type processedBubbleDataset = bubbleDataset & {
    value: number;
    r: number;
    x: number;
    y: number;
    sortedX: number;
    sortedY: number;
}

type bubbleDataType = {
    nodes: bubbleDataset[];
    valueProp: string;
    groupBy: string;
    nodeId?: string;
    clusterByGroup?: boolean;
    tooltipColumns?: string[];    
}

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

type chartNode = networkNode | networkHierarchyNode | processedBubbleDataset;
type chartLink = networkLink | networkResolvedLink | networkHierarchyLink;

type NetworkProps = {
    data: hierarchyData | networkDataType | bubbleDataType;
    noLabel?: boolean;
    sourceNode?: string;
    targetNode?: string;
    linkType?:{
        curve?: "straight" | "curved";
        directed?: boolean;
    };
    hierarchyMode?: "default" | "nodes only" | "leaf only";    
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    tooltipFormat?: tooltipFormat;
}

export function NetworkGraph({
    data,
    noLabel, 
    sourceNode = "", targetNode = "",
    hierarchyMode = "default",            
    color: {
        idx = 0,               // default idx
        type = 'fixed',        // default type
    } = { idx: 0, type: 'fixed' },
    linkType: {
        curve = "straight",               // default idx
        directed = false,        // default type
    } = { curve: "straight", directed: false },
    tooltipFormat: {
        prefix = "", suffix = "", formatType = "long"
    } = { prefix: "", suffix: "", formatType: "long"}
    }:NetworkProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize

    const [selectedGroup, setSelectedGroup] = useState("")
    const defferedSelectedGroup = useDeferredValue(selectedGroup)
    const [isSorted, setIsSorted] = useState(false)
    
    /*useEffect(()=>{
        if(defferedSelectedGroup === "" && selectedGroup !== ""){
            setIsSorted(false)
        }
        if(defferedSelectedGroup !== "" && selectedGroup === ""){
            setIsSorted(false)
        }
    }, [ selectedGroup, defferedSelectedGroup])*/
    useEffect(()=>{
        setIsSorted(false)
    }, [selectedGroup])

    const reRender = useRef(true)
    const reRenderJustChanged = useRef(true)    

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)        
    const simulationRef = useRef<Simulation<chartNode, undefined> | null>(null);

    const color = {idx, type}
    const linkType={curve, directed}
    const animDuration = 250;

    const mode = "name" in data?"hierarchy":        
        "links" in data?"network":"bubble"

    const invalidData = !("name" in data) && !("nodes" in data && ("links" in data || "valueProp" in data))

    useEffect(() => {
        reRender.current = true
        reRenderJustChanged.current = true
        setTimeout(()=>{reRenderJustChanged.current = false}, 250)
        setIsSorted(false)
        setSelectedGroup("")
    }, [data])

    useEffect(() => {        
        reRender.current = true        
    }, [hierarchyMode, width, height, noLabel])

    useEffect(() => {        
        if(!reRenderJustChanged.current){                        
            reRender.current = false
        }        
    }, [ sourceNode, targetNode, selectedGroup, isSorted ])

    useEffect(()=>{ setSelectedGroup("") }, [ width, height])

    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        if(invalidData) return;

        const radius = Math.min(width, height) / 2 - 30;        

        const canvasSvg = container.select<SVGSVGElement>("svg")
                    
        const defs = canvasSvg.selectAll("defs")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")

        const bubbleGroupBy = mode === "bubble"?(data as bubbleDataType).groupBy:""
        const legendsData: string[] = bubbleGroupBy!==""?
            [...new Set((data as bubbleDataType).nodes.map(d => d[bubbleGroupBy] as string))]:
            []        

        const legendWidth = 60//isMediumScreen?80:50

        const legendClass = function(d: string){
            const containerClass = styles[isMediumScreen?"legend-container":"legend-container-sm"]
            const containerActiveClass = styles[isMediumScreen?"legend-container-active":"legend-container-active-sm"]
            const containerInactiveClass = styles[isMediumScreen?"legend-container-inactive":"legend-container-inactive-sm"]
            return  `
                ${selectedGroup !== ""?
                    selectedGroup === d?containerActiveClass:containerInactiveClass:
                        containerClass}
                legend-item
            `            
        }

        const color = scaleOrdinal(schemeCategory10);

        const legends = legendsContainer.selectAll<HTMLDivElement, string>(".legend-item")
            .data([...legendsData], d=>d)
            .join(
                enter => {
                    const divs = enter
                        .append("div")
                        .attr("class", legendClass)
                        .style("left", (_, i)=> `${i * legendWidth}px`)
                        .style("top", "-53px")
                        .style("opacity", 0);

                    divs.append("div")
                        .attr("class", styles["legend-rect"])
                        .style("background", (d) => color(d))
                        .style("border-radius", "50%")
                    divs.append("span")
                        .attr("class", styles["legend-label"])
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
                        .select(`.${styles["legend-rect"]}`)
                        .style("background", (d) => color(d))
                        .style("border-radius", "50%");

                    // also update label text in case of rename or dynamic change
                    update
                        .select(`.${styles["legend-label"]}`)
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
            .on("click", function(_, d){
                setSelectedGroup(selectedGroup !== d?d:"")
            })
                                
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
        
        const chartData = cloneObj(data)
        if(mode === "network" || mode === "hierarchy"){
            assignGroups(chartData)
        }        
        
        const tooltip = container.select(`#tooltip`).style("opacity", 0)
        
        const tooltipData = mode === "bubble"?
            (data as bubbleDataType).tooltipColumns ??
            ["label"].concat(Object.keys(((data as bubbleDataType).nodes[0] as bubbleDataset))
                .map(key => key)):
            ["name", "value"]

        const tooltipContent = tooltip.selectAll<HTMLParagraphElement, string>("p.content")
            .data(tooltipData, d => d)
            .join("p")
                .attr("class", d => `content ${d}`)
                .style("font-weight", 300).style("margin", 1)
                .style("font-size", 300).style("color", "wheat")
        
        const root = mode === "hierarchy"?hierarchy(chartData):chartData         
                
        let linksData:chartLink[] = []
        let nodesData:chartNode[] = []

        let types: (string | undefined)[] = []

        //force initialization: initialize here so can be used by bubble data processing
        let simulation = forceSimulation<chartNode>()

        function createSortedBubble(
            baseNodes: bubbleDataset[], 
            diameter: number, 
            simulation?:Simulation<chartNode, undefined>,            
        ): processedBubbleDataset[] {
            const valueProp = (data as bubbleDataType).valueProp                        
            
            type bubbleBeforePacked = Omit<processedPackedBubble, "r" | "x" | "y" | "sortedX" | "sortedY">
            const nodesBeforePacked = baseNodes.map(d => {
                const value = d[valueProp]
                return {...d, value}
            })            
            const bubbleRoot = { label: "bubble nodes", children : nodesBeforePacked}            

            const sortedPackFn = oldPack()
                .padding(2)
                .size([diameter, diameter])
                .value(function(d:bubbleBeforePacked) {                                                      
                    return d.value; 
                })

            const sortedPacked = sortedPackFn.nodes(bubbleRoot)            
            const focus = sortedPacked[0]            
            const view = [focus.x, focus.y, focus.r * 2]

            type packedBuble = Omit<processedBubbleDataset, "sortedX" | "sortedY" | "value">
            const circleData = focus.children as packedBuble[]            

            const k = diameter / view[2];

            type processedPackedBubble = Omit<processedBubbleDataset, "x" | "y">
            const processedCircleData:processedPackedBubble[] = circleData.map(d => {
                const value = d[bubbleGroupBy]
                const { x, y, r, ...rest } = d

                return { 
                    sortedX: ((x as number) - view[0]) * k, 
                    sortedY: ((y as number) - view[1]) * k, 
                    r: (r as number) * k,
                    value, ...rest}
            })

            if(simulation){                
                simulation.nodes(processedCircleData as processedBubbleDataset[])                
            }
            
            return processedCircleData  as processedBubbleDataset[]

        }

        const { curve, directed } = linkType
        //data processing        
        if(reRender.current){
            if(mode === "hierarchy"){

                const createPack = () => {
                    (root as HierarchyNode<hierarchyData>).sum(d => d.value ?? 1)

                    const packFn = () => pack<hierarchyData>()
                        .size([width, height])
                        .padding(1)

                    const packedRootFn = packFn()(root)

                    return packedRootFn

                }

                const packFn = createPack
                if(hierarchyMode !== "default"){                                        
                                                                                
                    nodesData = hierarchyMode === "nodes only"?
                        packFn().descendants() as networkHierarchyPackedNode[]:
                        packFn().leaves() as networkHierarchyPackedNode[]
                        
                    nodesData.forEach(d => {                
                        (d as networkHierarchyPackedNode).x! -= width / 2;
                        (d as networkHierarchyPackedNode).y! -= height / 2;
                    })

                    //scale bubble size for "hierarchy" - "nodes only"
                    if(hierarchyMode === "nodes only"){
                        const maxValue = max(nodesData, function(d){ return (d as networkHierarchyPackedNode).value!})            

                        const radiusScale = scalePow()
                            .exponent(0.5)
                            .range([2, 60])
                            .domain([0, maxValue ?? 0]);

                        nodesData.forEach(d => {
                            (d as networkHierarchyPackedNode).r = radiusScale((d as networkHierarchyPackedNode).value!)
                        })
                    }
                }
                else {
                    const valueRef = packFn().descendants()
                    
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
            }else if(mode === "network"){
                
                nodesData = (root as networkDataType).nodes as networkNode[]                                
                linksData = (root as networkDataType).links as networkLink[]
                if(directed){
                    const baseTypesSet = new Set(linksData.map(d => (d as networkLink).type))
                    const baseTypes = [...baseTypesSet]                
                    types = baseTypes.some(t => t === undefined)?["arrow"]:[...baseTypes]
                }
                
                                             
            }else {//mode is "bubble"
                
                const rawNodesData = (root as bubbleDataType).nodes

                const diameter = Math.min(width, height)
                nodesData = createSortedBubble(rawNodesData, diameter, simulation)
                
            }
        }
                                        
        const hierarchyNodeRadius = (d:networkHierarchyNode) => {
            return hierarchyMode === "default"?
                ((d as networkHierarchyNode).depth === 0?8:
                d.depth === 1?5:3):
                (d as networkHierarchyPackedNode).r
        }

        const baseRadius = 4
                
        //forceSimulation settings
        const forceStrengthBubble = 0.03;
        if(reRender.current){
            simulation.nodes(nodesData)//.stop()
            //const simulation = forceSimulation<chartNode>(nodesData).stop()                
            
            if(mode === "hierarchy"){
                if(hierarchyMode !== "default"){                                        
                    if(hierarchyMode === "nodes only"){                                                
                        const forceStrength = 0.03;
                        function charge(d: networkHierarchyPackedNode) {
                            return -Math.pow(d.r, 2.0) * forceStrength;
                        }
                        simulation                
                            .velocityDecay(0.2)
                            .force('x', forceX().strength(forceStrength).x(0))
                            .force('y', forceY().strength(forceStrength).y(0))
                            .force('charge', forceManyBody().strength(d => charge(d as networkHierarchyPackedNode)))
                            .alpha(1)
                            .alphaTarget(0)
                            //.force("x", forceX(0).strength(0.01))
                            //.force("y", forceY(0).strength(0.01))                                                                                                                                                                                            
                    }else{
                        const cluster = forceCluster<networkHierarchyPackedNode, string>(
                            d => d.data.group ?? "",
                            d => d.r,
                            0.2
                        );
                        
                        simulation                                                                        
                            .force("x", forceX(0).strength(0.01))
                            .force("y", forceY(0).strength(0.01))                                                        
                            .force("cluster", cluster)                            
                            .force("collide", forceLeafCollide())
                            .alpha(1)
                            .alphaTarget(0)                                                                                                         
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
                        
                }                
            }
            else if(mode === "network"){
                
                if(curve === "straight"){
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
                        .force("center", forceCenter().x(0).y(0))                        
                        //.force("x", forceX(0))
                        //.force("y", forceY(0))
                        .alpha(1)
                        .alphaTarget(0)
                        //.alphaTarget(0.3)
                        //.restart()                    
                        
                }else if(curve === "curved"){
                    simulation                        
                        .force(
                            "link", 
                            forceLink<chartNode, chartLink>(linksData).id(d => (d as networkNode).id)
                        )
                        .force(
                            "charge", 
                            forceManyBody()//.strength(-300)
                        )                    
                        .force(
                            "center", 
                            forceCenter()
                                //.x(0).y(0)
                        )
                        //.force("x", forceX(0))
                        //.force("y", forceY(0))
                        .alpha(1)
                        .alphaTarget(0)
                        //.alphaTarget(0.3)                    
                        //.restart()                    
                }
                
                
            }
            else if(mode === "bubble"){
                
                function charge(d: SimulationNodeDatum) {
                    return -Math.pow((d as processedBubbleDataset).r ?? 0, 2.0) * forceStrengthBubble;
                }                
                
                simulation
                    .velocityDecay(0.2)
                    .force('x', forceX().strength(forceStrengthBubble).x(0))
                    .force('y', forceY().strength(forceStrengthBubble).y(0))

                const { clusterByGroup } = data as bubbleDataType
                if(!clusterByGroup){
                    simulation
                        .force('charge', forceManyBody().strength(charge))
                }else{
                    const cluster = forceCluster<processedBubbleDataset, string>(
                        d => String(d[(data as bubbleDataType).groupBy]),
                        d => d.r ?? 0,
                        0.2
                    );
                    simulation
                        .force("cluster", cluster)
                        .force("collide", forceCollide().radius(d => (d as processedBubbleDataset).r ?? 1 + 1).iterations(3))
                }                                        
            }

            function forceCluster<
                T extends SimulationNodeDatum,
                G
            >(
                getGroup: (node: T) => G,
                getRadius: (node: T) => number,
                strength = 0.2
            ) {
                let nodes: T[] = [];

                function force(alpha: number) {

                    const centroids = rollup(
                        nodes,
                        nodes => centroid(nodes, getRadius),
                        getGroup
                    );

                    const l = alpha * strength;

                    for (const d of nodes) {

                        const group = getGroup(d);

                        const {
                            x: cx,
                            y: cy
                        } = centroids.get(group) ?? {
                            x: 0,
                            y: 0
                        };

                        d.vx ??= 0;
                        d.vy ??= 0;

                        d.vx -= ((d.x ?? 0) - cx) * l;
                        d.vy -= ((d.y ?? 0) - cy) * l;
                    }
                }

                force.initialize = (
                    initNodes: T[]
                ) => {
                    nodes = initNodes;
                };

                return force;
            }

            function centroid<T extends d3.SimulationNodeDatum>(
                nodes: T[],
                getRadius: (node: T) => number
            ) {
                let x = 0;
                let y = 0;
                let z = 0;

                for (const d of nodes) {

                    const radius = getRadius(d);
                    const k = radius ** 2;

                    x += (d.x ?? 0) * k;
                    y += (d.y ?? 0) * k;
                    z += k;
                }

                return {
                    x: z === 0 ? 0 : x / z,
                    y: z === 0 ? 0 : y / z
                };
            }
                        
            simulationRef.current = simulation
                        
        }else{
                        
            simulation = simulationRef.current as Simulation<chartNode, undefined>                                    
            nodesData = simulation?.nodes()
            if(mode !== "bubble"){
                const linkForce = simulation.force("link") as ForceLink<chartNode, chartLink>
                linksData = linkForce?.links()                
                if(directed){
                    const baseTypesSet = new Set(linksData.map(d => (d as networkLink).type))
                    const baseTypes = [...baseTypesSet]
                    types = baseTypes.some(t => t === undefined)?["arrow"]:[...baseTypes]
                }
            }else{//bubble mode
                const screenMode = width > height?"desktop":"mobile"
                const selectedPosition = screenMode === "desktop"?
                    {x:width/4, y:0}:{x:0, y:height/4}
                const notSelectedPosition = screenMode === "desktop"?
                    {x:-width/4, y:0}:{x:0, y:-height/4}                
                if(isSorted){
                    /**
                     * Safe side length that is guaranteed to be able to contain the circles
                     * (based on the critical density π/(3+2√2) ≈ 0.5390).
                     * This is usually a bit larger than the absolute optimum, but always works.
                     */
                    function squareSideForCircles(radii: number[]) {
                        if (!radii.length) return 0;

                        const totalArea = radii.reduce((sum, r) => sum + Math.PI * r * r, 0);
                        const criticalDensity = Math.PI / (3 + 2 * Math.SQRT2); // ≈ 0.5390
                        const sideFromArea = Math.sqrt(totalArea / criticalDensity);

                        // Also respect the largest circle
                        const maxDiameter = 2 * Math.max(...radii);

                        return Math.max(sideFromArea, maxDiameter);
                    }

                    function calculateContainerSquareSize(radii: number[], padding = 0) {
                        if (!radii || radii.length === 0) return 0;

                        // 1. Sort radii in descending order (largest first leads to tighter packing)
                        const sorted = [...radii].sort((a, b) => b - a);
                        
                        // 2. Compute total area lower-bound to estimate initial target container width
                        const totalArea = sorted.reduce((sum, r) => sum + Math.PI * Math.pow(r + padding / 2, 2), 0);
                        
                        // A square big enough to hold the area with ~25% packing overhead ratio
                        let targetWidth = Math.max(
                            sorted[0] * 2 + padding, 
                            Math.sqrt(totalArea / 0.75)
                        );

                        let currentX = 0;
                        let currentY = 0;
                        let currentRowHeight = 0;
                        let maxExtentX = 0;

                        // 3. Pack circles into horizontal strips using greedy Placement
                        for (const r of sorted) {
                            const diameter = r * 2 + padding;

                            // If the circle exceeds current row limit, start a new row below
                            if (currentX + diameter > targetWidth && currentX > 0) {
                            currentY += currentRowHeight;
                            currentX = 0;
                            currentRowHeight = 0;
                            }

                            currentX += diameter;
                            currentRowHeight = Math.max(currentRowHeight, diameter);
                            maxExtentX = Math.max(maxExtentX, currentX);
                        }

                        const maxExtentY = currentY + currentRowHeight;

                        // 4. Return the maximum dimension to ensure a perfect square shape
                        return Math.ceil(Math.max(maxExtentX, maxExtentY));
                    }
                    if(selectedGroup !== ""){                        
                        const groupBy = (data as bubbleDataType).groupBy ?? ""
                        const selectedNodes = nodesData
                            .filter(d => (d as processedBubbleDataset)[groupBy] === selectedGroup)                            
                        const selectedRadiuses = selectedNodes.map(d => (d as processedBubbleDataset).r)
                        const diameterForSelected = squareSideForCircles(selectedRadiuses) + 20                                                
                        const diameterForSelectedGemini = 
                            calculateContainerSquareSize(selectedRadiuses, 1) + 20
                        const rawSelectedNodes = selectedNodes.map(d => {
                            const { value, r, x, y, sortedX, sortedY, vx, vy, ...rest } = d as processedBubbleDataset
                            return {...rest}
                        })
                        const sortedSelected = createSortedBubble(
                            rawSelectedNodes as bubbleDataset[], 
                            diameterForSelected
                        )
                        
                        const otherNodes = nodesData
                            .filter(d => (d as processedBubbleDataset)[groupBy] !== selectedGroup)
                        const otherRadiuses = otherNodes.map(d => (d as processedBubbleDataset).r)
                        const diameterForOther = squareSideForCircles(otherRadiuses) + 30
                        const diameterForOtherGemini = 
                            calculateContainerSquareSize(otherRadiuses, 1) + 20
                        const rawOtherNodes = otherNodes.map(d => {
                            const { value, r, x, y, sortedX, sortedY, vx, vy, ...rest } = d as processedBubbleDataset
                            return {...rest}
                        })
                        const baseDiameter = Math.min(width, height)
                        const sortedOther = createSortedBubble(
                            rawOtherNodes as bubbleDataset[], 
                            diameterForOther
                        )                                                
                        
                        const getSortedReferencePos = (d: processedBubbleDataset) => {
                            const nodeSelected = d[groupBy] === selectedGroup
                            const reference = nodeSelected?sortedSelected:sortedOther
                            const nodeReference = reference.find(rD => (rD as processedBubbleDataset).label === d.label)
                            const baseSortedX  = (nodeReference?.sortedX ?? 0)

                            const positionReference = nodeSelected?selectedPosition:notSelectedPosition
                            const sortedX = baseSortedX + positionReference.x
                            const baseSortedY  = (nodeReference?.sortedY ?? 0)
                            const sortedY = baseSortedY + positionReference.y
                            return { sortedX, sortedY }
                        }
                        simulation
                            .force("x", forceX<processedBubbleDataset>()
                                .x((d: processedBubbleDataset) => {
                                    const sortedX = getSortedReferencePos(d).sortedX                                    
                                    return sortedX
                                })
                                .strength(0.95))
                            .force("y", forceY<processedBubbleDataset>()
                                .y((d: processedBubbleDataset) => {
                                    const sortedY = getSortedReferencePos(d).sortedY
                                    return sortedY
                                })
                                .strength(0.95))
                    }else{
                        simulation
                            //.force("center", forceCenter())
                            .force(
                                "x", 
                                forceX<processedBubbleDataset>()
                                    .strength(0.5)
                                    .x((d: processedBubbleDataset) => d.sortedX)                                    
                            )
                            .force(
                                "y", 
                                forceY<processedBubbleDataset>()
                                    .strength(0.5)
                                    .y((d: processedBubbleDataset) => d.sortedY)                                
                            )                            
                    }       
                    simulation 
                        //.force("charge", forceManyBody().strength(-30))
                        .force(
                            "collide", 
                            forceCollide<processedBubbleDataset>()
                                .radius((d:processedBubbleDataset)=>!isSorted?d.r:d.r/3)
                        )
                        .alpha(isSorted?
                            selectedGroup!==""?0.065:0.075:
                            0.225
                        )                    
                        .alphaTarget(0)
                        .restart()
                }
                else {
                    if(selectedGroup === ""){
                        simulation
                            .force('x', forceX().strength(forceStrengthBubble).x(0))
                            .force('y', forceY().strength(forceStrengthBubble).y(0))
                        
                    }else{                                                
                        simulation
                            .force(
                                'x', 
                                forceX()
                                    .strength(forceStrengthBubble)
                                    .x(d => {
                                        const group = (d as processedBubbleDataset)[bubbleGroupBy]
                                        return group === selectedGroup?
                                            selectedPosition.x:
                                            notSelectedPosition.x
                                    })
                            )
                            .force(
                                'y', 
                                forceY()
                                    .strength(forceStrengthBubble)
                                    .y(d => {
                                        const group = (d as processedBubbleDataset)[bubbleGroupBy]
                                        return group === selectedGroup?
                                            selectedPosition.y:
                                            notSelectedPosition.y
                                    })
                            )
                    }
                    simulation.alpha(0.75).alphaTarget(0)
                    setTimeout(()=>{simulation.restart()}, 500)
                }
                                
            }
            
        }    
        
        const noLinks = mode === "bubble" || (mode === "hierarchy" && hierarchyMode !== "default")
        function dijkstra(
            data: {
                nodes: chartNode[]; links: chartLink[]
            },
            startId: string,
            endId?: string
        ): dijkstraResult | string {

            if(noLinks){
                return "no link"
            }
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
        
        const noShortestPath = typeof shortestPath === "string"
        
        const markColor = scaleOrdinal(types as string[], schemeCategory10);

        const baseLinkColor = "#999"
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
            .attr("fill", (d) => d==="arrow"?baseLinkColor:markColor(d ?? ""))
            .attr("d", "M0,-5L10,0L0,5");                    
                                  
        const { distances, previous, path } = shortestPath as dijkstraResult
        
        const linkInShortestPath = (d: chartLink) => {            
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
                return inPath
            }
            return false
        }

        const blurredLinkOpacity = 0.25
        const linkOpacity = (d: chartLink) => {
            if(noShortestPath){
                return 1
            }
            const inPath = linkInShortestPath(d)
            return inPath?1:blurredLinkOpacity
        }       
        
        const linkInteractible = (d: chartLink) => {
            if(noShortestPath){ return "auto"}
            const inPath = linkInShortestPath(d)
            return inPath?"auto":"none"
        }

        const linkArrow = (d: chartLink) => {
            const condition = noShortestPath?directed:(directed && linkInShortestPath(d))
            
            return condition?
                (d as networkResolvedLink).type?
                    `url(#arrow-${(d as networkResolvedLink).type})`:"url(#arrow-arrow)":
                    ""
            
            
        }
                            
        const pathLinks = canvas.selectAll<SVGPathElement, networkResolvedLink>("path.link")
            .data(
                linksData, 
                function(d, i){
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
                    return i                                      
            })
            .join(
                enter=>enter.append("path")
                    .attr("class", "link")
                    .attr("fill", "none")
                    .attr("stroke-width", 1.5)
                    .attr("stroke", d => 
                        (d as networkResolvedLink).type?
                        color((d as networkResolvedLink).type!):
                        baseLinkColor
                    )
                    .style("pointer-events", linkInteractible)
                    .attr("marker-end", linkArrow)
                    .attr("stroke-opacity", linkOpacity),
                undefined,
                exit=>exit.remove()
            )
            .attr("stroke", d => 
                (d as networkResolvedLink).type?
                color((d as networkResolvedLink).type!):
                baseLinkColor
            )
            .attr("marker-end", linkArrow)
            .attr("stroke-opacity", linkOpacity)            
            .style("pointer-events", linkInteractible)

        function linkArc(d: networkResolvedLink) {
            const sourceX = clampX(d.source)
            const sourceY = clampY(d.source)

            const targetX = clampX(d.target)
            const targetY = clampY(d.target)
            if(curve === "straight"){
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

        const nodeRadius = (d: chartNode) =>
            mode === "hierarchy"?
                hierarchyNodeRadius(d as networkHierarchyNode):
                mode === "network"?(d as networkNode).radius ?? baseRadius:
                    (d as processedBubbleDataset).r

        function nodeId(d: chartNode, i: number){
            if(mode === "hierarchy"){                
                return (d as networkHierarchyNode).data?.name ?? ""
            }else if(mode === "network"){
                return (d as networkNode).id
            }else{
                //const nodeId = (data as bubbleDataType).nodeId
                //return nodeId ?? (d as processedBubbleDataset).label
                return i
            }                    
        }

        const nodeFill = (d: chartNode) => {
            if(mode === "hierarchy"){
                const nodeData = d as networkHierarchyNode
                if(nodeData.data.color){
                    return nodeData.data.color
                }
                const { group } = nodeData.data
                return group !== undefined ? color(String(group)) ?? "steelblue" : "steelblue";
            }
            else if(mode === "network"){
                const group = (d as networkNode).group;
                return group !== undefined ? color(String(group)) ?? "steelblue" : "steelblue";
            }
            else if(mode === "bubble"){                
                const group = (d as processedBubbleDataset)[bubbleGroupBy] as string
                return color(group)
            }
            return "steelblue"
        }

        const nodeStroke = (d: chartNode) => mode === "hierarchy"? 
            (d as networkHierarchyNode).children ? "none" : "#fff":
            rgb(nodeFill(d)).darker().toString()
        
        const blurredNodeOpacity = 0.5
        const nodeOpacity = (d: chartNode) => {
            const inPath = nodeInPath(d)
            if(inPath === "no path to highlight"){
                return 1
            }
            return inPath === "not path member"?blurredNodeOpacity:1
        }

        const nodeInteractible = (d: chartNode) => {
            const inPath = nodeInPath(d)
            if(inPath === "no path to highlight"){
                return "auto"
            }
            return inPath === "not path member"?"none":"auto"
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
                    .attr("fill", nodeFill)
                    .style("opacity", nodeOpacity)
                    .style("pointer-events", nodeInteractible),
                undefined,
                exit=>exit.remove()
            )            
            .attr("stroke", nodeStroke)
            .attr("r", nodeRadius)
            .attr("fill", nodeFill)
            .style("opacity", nodeOpacity)
            .style("pointer-events", nodeInteractible);

        if(mode === "hierarchy" && hierarchyMode !== "default"){
            nodes.transition()
                .delay((d, i) => Math.random() * 500)
                .duration(750)
                .attrTween("r", d => {
                    const i = interpolate(0, (d as networkHierarchyPackedNode).r);
                    const interpolatedR = (t: number) => `${i(t)}`
                    return interpolatedR;
                });
        }
        
        const baseFontSize = 6
        const highlightFontSize = 12
        const connectionFontSize = 10
        const hilitStroke = "black"
        nodes
            .on("pointerenter", function(e, d){                                 
                
                select(this).style("stroke", hilitStroke)

                if(mode === "hierarchy" || mode === "bubble"){
                    tooltip.transition().duration(250).style("opacity", 1)
                }
                
                if(mode === "network" && noShortestPath){                                        
                    const targetNodeLinks = pathLinks.filter(pathD => (pathD.source as networkNode).id === (d as networkNode).id)                        
                    const targets = targetNodeLinks.data().map(dLink => (dLink.target as networkNode).id)
                    const sourceNodeLinks = pathLinks.filter(pathD => (pathD.target as networkNode).id === (d as networkNode).id)
                    const sources = sourceNodeLinks.data().map(dLink => (dLink.source as networkNode).id)

                    //blur non connection links
                    pathLinks.filter(pathD => 
                        (pathD.source as networkNode).id !== (d as networkNode).id &&
                        (pathD.target as networkNode).id !== (d as networkNode).id
                    )
                        .style("opacity", blurredLinkOpacity)

                    const connections = [...sources, ...targets]
                    labels.filter(dLabel => 
                        !((dLabel as networkNode).id === (d as networkNode).id) &&
                        !connections.includes((dLabel as networkNode).id))
                        .style("opacity", 0)

                    nodes
                        .filter(dLabel => 
                        !((dLabel as networkNode).id === (d as networkNode).id) &&
                        !connections.includes((dLabel as networkNode).id))
                        .style("opacity", blurredNodeOpacity)

                    labels.filter(dLabel => (dLabel as networkNode).id === (d as networkNode).id)
                        .style("font-size", highlightFontSize)

                    labels.filter(dLabel => connections.includes((dLabel as networkNode).id))
                        .style("font-size", connectionFontSize)                                        
                    
                }
                else if(mode === "hierarchy"){                    
                    const nameTooltip = tooltipContent.filter(dT => dT === "name").node()                    
                    select(nameTooltip).text(`${(d as networkHierarchyNode).data.name}`)

                    const valueTooltip = tooltipContent.filter(dT => dT === "value").node()
                    select(valueTooltip).text(`${basicFormat((d as networkHierarchyNode).value!)}`)
                }
                else if(mode === "bubble"){                    
                    for(const p of tooltipData){
                    
                        const tooltipP = tooltipContent.filter(d => d === p)
                            .node()

                        const baseTooltipPValue = (d as bubbleDataset)[p]
                        const tooltipPValue = typeof baseTooltipPValue === "number"?
                            baseTooltipPValue.toLocaleString():baseTooltipPValue
                        
                        const content = p === "label"?
                            (tooltipPValue as string).toUpperCase():
                            `${p}: ${tooltipPValue}`
                        select(tooltipP).text(`${content}`)
                                                
                    }
                }
                                                                    
            })
            .on("pointermove", function(e, d){
                moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
            })
            .on("pointerleave", function(e, d){ 
                const stroke = nodeStroke(d)
                select(this).style("stroke", stroke)

                tooltip.transition().duration(250).style("opacity", 0)

                if(mode === "network" && noShortestPath){
                    pathLinks.style("opacity", linkOpacity)
                    nodes.style("opacity", nodeOpacity)                    
                    labels.style("opacity", textOpacity).style("font-size", fontSize)                    
                }
            })

        pathLinks
            .on("pointerenter", function(e, d){                
                select(this)
                    .style(
                        "stroke", 
                        (d as networkResolvedLink).type?
                        d3Color(color((d as networkResolvedLink).type!))?.darker().toString() ?? hilitStroke:hilitStroke
                    )
                if(mode === "network"){                    
                    tooltip.transition().duration(250).style("opacity", 1)
                    const source = (d.source as networkNode).id
                    const target = (d.target as networkNode).id
                    if(noShortestPath){
                        labels.filter(dLabel=> (dLabel as networkNode).id !== source &&
                                (dLabel as networkNode).id !== target)
                            .style("opacity", 0)

                        labels.filter(dLabel=> (dLabel as networkNode).id === source ||
                                (dLabel as networkNode).id === target)
                            .style("font-size", connectionFontSize)
                    }
                    
                    tooltip.transition().duration(250).style("opacity", 1)
                    const nameTooltip = tooltipContent.filter(dT => dT === "name").node()                    
                    select(nameTooltip).text(`${source} ⟶ ${target}`)

                    const valueTooltip = tooltipContent.filter(dT => dT === "value").node()
                    const baseValueText = (d as networkResolvedLink).value
                    const valueText = typeof baseValueText === "number"?basicFormat(baseValueText):"---"
                    select(valueTooltip).text(`${valueText}`)                    
                }

            })
            .on("pointermove", function(e, d){
                if(mode === "network"){
                    moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
                }
                
            })
            .on("pointerleave", function(e, d){
                select(this)
                    .style(
                        "stroke", 
                        (d as networkResolvedLink).type?
                        color((d as networkResolvedLink).type!):baseLinkColor
                    )
                if(mode === "network"){
                    tooltip.transition().duration(250).style("opacity", 0)

                    if(noShortestPath){
                        labels.style("opacity", textOpacity).style("font-size", fontSize)
                    }
                }
                
            })

        const textOpacity = (d: chartNode) => {
            const r = nodeRadius(d)
            if(noLinks){                                
                return r < 15?0:1
            }
            const status = nodeInPath(d)
            if(status === "no path to highlight"){
                return 1
            }
            if(status === "source or destination" || status === "path"){
                return 1
            }
            return 0.25
        }
        
        const fontSize = (d: chartNode) => {
            const status = nodeInPath(d)
            if(status === "no path to highlight"){
                return baseFontSize
            }
            if(status === "source or destination"){
                return highlightFontSize
            }
            if(status === "path"){
                return connectionFontSize
            }
            return baseFontSize
        }
        const labelsData = !noLabel?nodesData:[]        
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
                        mode === "network"?(d as networkNode).id:
                        (d as bubbleDataset).label
                    )
                    .style("opacity", textOpacity),
                undefined,
                exit=>exit.remove()
            )
            .style("opacity", textOpacity)
            .style("font-size", fontSize)
            .text(d => mode === "hierarchy"?
                (d as networkHierarchyNode).data.name:
                mode === "network"?(d as networkNode).id:
                (d as bubbleDataset).label
            )
                
        if(mode === "hierarchy"){
            labels
                .attr("text-anchor", d => (d as networkHierarchyNode).baseX! < Math.PI === !(d as networkHierarchyNode).children ? "start" : "end")
        }else if(mode === "network" || mode === "bubble"){
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
                    if(mode !== 'hierarchy')
                        return ''
                    if(hierarchyMode !== "default")
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
                    const xFactor = (mode === "hierarchy" && hierarchyMode === "default")?
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
    }, [
        data, noLabel, sourceNode, targetNode, linkType, isSorted, selectedGroup, mode, color, 
        width, height, {prefix, suffix, formatType} ]);
            
        return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column', overflow: "hidden" }}
        >                     
            <div 
                ref={chartRef} 
                className={`${styles["fill-container"]}`} 
                style={{display:"flex", flexDirection:"column"}}
            >
                <div                     
                    className={`controls ${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                    style={{display:mode === "bubble"?"flex":"none", zIndex: 1}}
                >          
                    <label 
                        className={`
                            ${styles["controls-label"]}                                 
                        `} 
                        style={{paddingRight: '12px'}}
                    >
                        <input 
                            type="checkbox" 
                            className={styles["controls-checkbox"]}
                            checked={isSorted}
                            onChange={(e)=>{setIsSorted(e.target.checked)}}                                 
                        />
                            Sort
                    </label>          
                    <div                         
                        className={`legends-container ${styles["legends-container"]}`}
                    />
                </div>
                <div 
                    ref={chartContainerRef}
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column", overflow: "hidden", zIndex: 2 }}> 
                    <svg                                                        
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}                    
                        viewBox={`${-width/2} ${-height/2} ${width} ${height}`}
                    >
                        <defs />
                        <g className="plot-area" />                        
                    </svg>            
                
                    <Tooltip />
                </div>
            </div>
            
        </div>
    );
}