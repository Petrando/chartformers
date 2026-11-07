import React, {useState, useRef, useEffect, useDeferredValue} from 'react';
import { select, color as d3Color, drag, D3DragEvent, rgb, forceSimulation, forceManyBody, 
    forceCollide, Simulation, forceX, forceY, rollup, scaleOrdinal,scaleQuantize,        
 } from 'd3';
import { SimulationNodeDatum } from "d3-force";
import { oldPack } from '../circle-pack/utils'; 
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { useContainerSize } from '../../hooks/useContainerSize';
import { cloneObj, isFiniteNumber } from '../../utils';
import styles from '../global.module.css';
import tooltipStyles from '../../components/tooltip.module.css'
import { tooltipFormat } from '../../types';
import { nodeCollision, grouplessColor } from './types';

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

type bubbleGraphProps = {
    data: bubbleDataset[];
    valueProp: string;
    groupBy?: string;
    collision?: nodeCollision;
    clusterByGroup?: boolean;
    tooltipColumns?: string[];
    noLabel?: boolean;        
    grouplessColor?: grouplessColor;
    tooltipFormat?: tooltipFormat;
}

export function BubbleForceGraph({
    data,
    valueProp,
    groupBy,
    tooltipColumns = [],
    collision,
    clusterByGroup,
    noLabel = true,            
    grouplessColor,    
    tooltipFormat: {
        prefix = "", suffix = "", formatType = "long"
    } = { prefix: "", suffix: "", formatType: "long"}
    }:bubbleGraphProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width: parentWidth, height: parentHeight } = parentSize;
    const [chartContainerRef, chartSize] = useContainerSize<HTMLDivElement>()
    const { width, height } = chartSize

    const [selectedGroup, setSelectedGroup] = useState("")    
    const [isSorted, setIsSorted] = useState(false)           

    const reRender = useRef(true)
    const reRenderJustChanged = useRef(true)    

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)        
    const simulationRef = useRef<Simulation<processedBubbleDataset, undefined> | null>(null);
        
    const animDuration = 250;    

    useEffect(() => {
        reRender.current = true
        reRenderJustChanged.current = true
        setTimeout(()=>{reRenderJustChanged.current = false}, 250)
        setIsSorted(false)
        setSelectedGroup("")
    }, [data])

    useEffect(() => {        
        reRender.current = true        
    }, [ width, height, noLabel])

    useEffect(() => {        
        if(!reRenderJustChanged.current){                        
            reRender.current = false
        }        
    }, [ selectedGroup, isSorted, groupBy, clusterByGroup, grouplessColor, collision ])

    useEffect(()=>{ 
        setSelectedGroup("") 
        setIsSorted(false)
    }, [ width, height])

    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
                

        const canvasSvg = container.select<SVGSVGElement>("svg")                            
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')

        const controls = container.select<HTMLDivElement>(".controls")
        const legendsContainer = controls.select<HTMLDivElement>(".legends-container")
        
        const legendsData: string[] = groupBy && groupBy !== ""?
            [...new Set(data.map(d => d[groupBy] as string))]:
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

        const mainPallete =  [            
            "#e8c1a0", // 12 peach         (light, warm)            
            "#fbf1b0", // 9  pale yellow   (pale, warm)
            "#61cdbb", // 11 mint-teal     (mid, cool)
            "#e8a838", // 7  amber         (mid, warm)            
            "#f47560", // 10 coral         (mid, warm)
            "#3aa797", // 15 teal          (mid-dark, cool)            
            "#d4f3ec", // 6  pale aqua     (pale, cool)
            "#d1473c", // 13 red           (dark-mid, warm)
            "#bfeadf", // 14 pale mint     (pale, cool)
            "#2a7f7a", // 8  deep teal     (dark, cool)            
            "#f6ecd2", // 0  cream         (pale, warm)
            "#1d5b61", // 1  darkest teal  (dark, cool)
            "#f1e15b", // 2  yellow        (light, warm)
            "#8f2d3a", // 3  maroon        (dark, warm)
            "#97e3d5", // 4  aqua          (light, cool)
            "#c4452f", // 5  brick red     (dark, warm)
        ];
        const color = scaleOrdinal(mainPallete);

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
                setIsSorted(false)
            })

        const chartData = cloneObj(data)

        const tooltip = canvas.select("foreignObject#tooltip")
        const tip = tooltip.select("div.tt")
                
        const tooltipData = tooltipColumns.length > 0?tooltipColumns:
            data.length > 0?
            ["label"].concat(Object.keys(data[0]).map(key => key)):
            []

        const tooltipContent = tip.selectAll<HTMLParagraphElement, string>("p.content")
            .data(tooltipData, d => d)
            .join("p")
                .attr("class", d => `content ${d}`)
                .style("font-weight", 300).style("margin", 1)
                .style("font-size", 300).style("color", "wheat")
                .style("margin", 0)
                .style("max-width", "none")

        const root = chartData

        let nodesData:processedBubbleDataset[] = []
        
        let types: (string | undefined)[] = []

        //force initialization: initialize here so can be used by bubble data processing
        let simulation = forceSimulation<processedBubbleDataset>()

        function createSortedBubble(
            baseNodes: bubbleDataset[], 
            diameter: number, 
            simulation?:Simulation<processedBubbleDataset, undefined>,            
        ): processedBubbleDataset[] {
            
            if(baseNodes.length === 0){
                return []
            }
            
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
                const value = d[groupBy ?? ""]
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
        
        if(reRender.current){            
            const diameter = Math.min(width, height)
            nodesData = createSortedBubble(root, diameter, simulation)
        }

        const baseRadius = 4
                        
        //forceSimulation settings
        const nodeCollision = { 
            type: collision?.type ?? "disallow",
            margin: collision?.margin ?? 0.5,
            minDistance: collision?.minDistance ?? 1
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
        const cluster = forceCluster<processedBubbleDataset, string>(
            d => String(d[groupBy ?? ""]),
            d => d.r ?? 0,
            0.2
        );
        const collisionMargin = Math.max(0, nodeCollision.margin)
        const collisionMinDistance = Math.max(0, nodeCollision.minDistance)
        const collide = forceCollide<processedBubbleDataset>()
                .radius((d: processedBubbleDataset) => Math.max(d.r + collisionMargin, collisionMinDistance))
                .iterations(3)
        function charge(d: SimulationNodeDatum) {
            return -Math.pow((d as processedBubbleDataset).r ?? 0, 2.0) * forceStrengthBubble;
        }
        const forceStrengthBubble = 0.03;        
        
        if(reRender.current){
            simulation.nodes(nodesData)//.stop()
                                        
            simulation
                .velocityDecay(0.2)
                .force('x', forceX().strength(forceStrengthBubble).x(0))
                .force('y', forceY().strength(forceStrengthBubble).y(0))
            
            if(!clusterByGroup){                
                simulation
                    .force('charge', forceManyBody().strength(charge))
                    .force("collide", nodeCollision.type === "allow"?null:collide)
                    .force("cluster", null)
            }else{                
                simulation
                    .force('charge', forceManyBody().strength(charge))                                        
                    .force("collide", collide)
                    .force("cluster", groupBy?cluster:null)                
            }
                                                                                    
            simulationRef.current = simulation
        }
        else {
            simulation = simulationRef.current as Simulation<processedBubbleDataset, undefined>                                    
            nodesData = simulation?.nodes()

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
                    
                    const selectedNodes = nodesData
                        .filter(d => (d as processedBubbleDataset)[groupBy ?? ""] === selectedGroup)                            
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
                        .filter(d => (d as processedBubbleDataset)[groupBy ?? ""] !== selectedGroup)
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
                        const nodeSelected = d[groupBy ?? ""] === selectedGroup
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
                    .force("cluster", null)
                    .force(
                        "collide", 
                        forceCollide<processedBubbleDataset>()
                            .radius((d:processedBubbleDataset)=>d.r/3)
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
                                    const group = (d as processedBubbleDataset)[groupBy ?? ""]
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
                                    const group = (d as processedBubbleDataset)[groupBy ?? ""]
                                    return group === selectedGroup?
                                        selectedPosition.y:
                                        notSelectedPosition.y
                                })
                        )
                }
                                
                simulation
                    .force('charge', forceManyBody().strength(charge))
                    //.force('charge', collision?forceManyBody().strength(charge):null)                    
                    .force("collide", nodeCollision.type === "allow"?null:collide)
                    .force("cluster", clusterByGroup && groupBy?cluster:null)
                    .alpha(0.75)
                    .alphaTarget(0)

                setTimeout(()=>{simulation.restart()}, 500)
            }
        }
        
        const nodeRadius = (d: processedBubbleDataset) => Math.max(d.r, 0)

        const palette = ["#e8c1a0", "#f47560", "#f1e15b", "#e8a838", "#61cdbb", "#97e3d5"];
        const warm = ["#fbf1b0", "#f1e15b", "#e8a838", "#f47560", "#d1473c", "#8f2d3a"];
        const cool = ["#d4f3ec", "#97e3d5", "#61cdbb", "#3aa797", "#2a7f7a", "#1d5b61"];
        const diverging = ["#2a7f7a", "#61cdbb", "#bfeadf", "#f6ecd2", "#e8a838", "#f47560", "#c4452f"];        

        const hash = (i: number) => {
            let x = (i + 1) * 2654435761 >>> 0;
            x ^= x >>> 15;
            return (x >>> 0) / 4294967295; // 0..1
        };

        const baseColor = (i: number) => palette[Math.floor(hash(i) * palette.length)];

        const valueExtent = data
            .map(d => Number(d[valueProp]))
            .filter((value): value is number => Number.isFinite(value));

        const safeValueExtent: [number, number] = valueExtent.length > 0
            ? [Math.min(...valueExtent), Math.max(...valueExtent)]
            : [0, 1];

        const { colorBy, byValuePallete } = grouplessColor ?? { colorBy: "index", byValuePallete: "diverging "}
        const valuePallete = byValuePallete === "cool"?cool:
            byValuePallete === "warm"?warm:diverging
        const valueColor = scaleQuantize<string>()
            .domain(safeValueExtent)
            .range(valuePallete);

        const fillOf = (d: processedBubbleDataset, i: number) => {
            const c = d3Color(baseColor(i)) ?? rgb("#000000");
            // Small brightness jitter in [-0.3, +0.4] so 800 circles don't feel flat
            const jitter = (hash(i + 1000) - 0.4) * 0.7;
            return (jitter >= 0 ? c.brighter(jitter) : c.darker(-jitter)).formatHex();
        };
                    
        const nodeFill = (d: processedBubbleDataset, i?: number) => {
            if(groupBy){
                const group = d[groupBy ?? ""] as string
                return color(group)
            }
            //const idx = i ?? 1            
            //const base = d3Color(depthColor(idx.toString())) ?? rgb("#000000");
            //return base.brighter(0.4 * idx).formatHex();
            return colorBy === "index"?fillOf(d, i ?? 1):
                valueColor(d[valueProp] as number)            
            
        }
        
        const nodeStroke = (d: processedBubbleDataset) => rgb(nodeFill(d)).darker().toString()

        const nodes = canvas
            .selectAll<SVGCircleElement, processedBubbleDataset>("circle.node")
            .data( nodesData, (_, i) => i )
            .join(
                enter=>enter.append("circle")
                    .attr("class", "node")
                    .attr("stroke", "none")
                    .attr("r", nodeRadius)
                    .attr("fill", nodeFill),
                undefined,
                exit=>exit.remove()
            )            
            .attr("stroke", nodeStroke)
            .attr("r", nodeRadius)
            .attr("fill", nodeFill)

        const baseFontSize = 6    
        const hilitStroke = "black"

        nodes
            .on("mouseover", function(e, d){                                                 
                select(this).style("stroke", hilitStroke)
                nodePointerEnter(e, d)                                                                                    
            })
            .on("touchstart", function(e, d){                                                 
                select(this).style("stroke", hilitStroke)
                nodePointerEnter(e, d)                                                                                    
            })            
            .on("mouseleave", function(e, d){ 
                const stroke = nodeStroke(d)
                select(this).style("stroke", stroke)

                tooltip.style("display", "none")
            })

        
        /*
        | Corner       | SVG coordinate          |
        | ------------ | ----------------------- |
        | Top-left     | `(-width/2, -height/2)` |
        | Top-right    | `(width/2, -height/2)`  |
        | Bottom-left  | `(-width/2, height/2)`  |
        | Bottom-right | `(width/2, height/2)`   |

        */
                
        function nodePointerEnter(e: MouseEvent | TouchEvent, d: processedBubbleDataset){
            const GAP = 6

            const tooltipWidth = 200
            const tooltipHeight = 200
            tooltip.attr("width", tooltipWidth).attr("height", tooltipHeight).style("display", "block"); // show first so it can be measured
            
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

            const tipNode = tip.node() as HTMLDivElement | null;
            const w = tipNode?.offsetWidth ?? 0;
            const h = tipNode?.offsetHeight ?? 0;                                    

            const radius = nodeRadius(d)
            const baseXPos = clampX(d) - w/2            
            const leftClampedXPos = Math.max(-width/2, baseXPos)            
            const rightmostPos = leftClampedXPos + w
            const rightDiff = rightmostPos - (width/2)            
            const rightClampedXPos = rightDiff > 0?leftClampedXPos - rightDiff:leftClampedXPos
            const xPos = w < width?Math.min(leftClampedXPos, rightClampedXPos):
                Math.max(leftClampedXPos, rightClampedXPos)

            const baseYPos = clampY(d)
            const bottomYPos = baseYPos + radius + GAP
            const topYPos = baseYPos - h - radius - GAP            
            const fitsAbove = topYPos > (-height/2);
            const yPos =  fitsAbove?topYPos:bottomYPos                        

            tooltip
                    .transition().duration(250)
                .attr("width", w)
                .attr("height", h)
                .attr("x", xPos)
                .attr("y", yPos )
                /*.on("end", function(){
                    tooltip.select("div.tt")                                                 
                        .attr(
                            "class", 
                            `tt ${tooltipStyles.tooltip} ${fitsAbove?tooltipStyles["tooltip--arrow-down"]:tooltipStyles["tooltip--arrow-up"]}`
                        )
                });*/
        }

        const textOpacity = (d: processedBubbleDataset) => {
            const r = nodeRadius(d)
            return r < 15?0:1
        }

        const labelsData = !noLabel?nodesData:[]        
        const labels = canvas
            .selectAll<SVGTextElement, processedBubbleDataset>("text.label")
            .data(labelsData, (_, i) => i)
            .join(
                enter=>enter.append("text")
                    .attr("class", "label")            
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-width", 3)
                    .attr("dy", "0.31em")                                    
                    .attr("paint-order", "stroke")
                    .attr("stroke", "white")
                    .attr("fill", "currentColor")
                    .style("font-size", baseFontSize)
                    .style("pointer-events", "none")
                    .style("text-anchor", "middle")
                    .text(d => d.label)
                    .style("opacity", textOpacity),
                undefined,
                exit=>exit.remove()
            )
            .style("opacity", textOpacity)
            .style("font-size", baseFontSize)
            .text(d => d.label)

        labels.raise()
        tooltip.raise()

        simulation.on("tick", () => {                        

            nodes
                .attr("cx",clampX)
                .attr("cy", clampY);
                
            labels                
                .attr("transform", d => {                    
                    
                    const labelData = d
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
                    const xFactor = 0
                    const baseDX = clampX(d)
                    const dx = isFiniteNumber(baseDX)?baseDX:0
                    return dx + xFactor
                })                
                .attr("y", d => {
                    const baseDY = clampY(d)
                    const dy = isFiniteNumber(baseDY)?baseDY:0
                    return  dy
                })                            
        })
        const clampX = (d: processedBubbleDataset) => {
            const baseX = isFiniteNumber(d.x) ? d.x : 0            
            const r = nodeRadius(d)
            const xMin = -width/2 + r
            const xMax = width/2 - r

            /*return baseX <= xMin?xMin:
                baseX >= xMax?xMax:
                baseX*/
            return Math.min(Math.max(baseX, xMin), xMax)
        }

        const clampY = (d: processedBubbleDataset) => {
            const baseY = isFiniteNumber(d.y) ? d.y : 0            
            const r = nodeRadius(d)
            const yMin = -height/2 + r
            const yMax = height/2 - r

            /*return baseY <= yMin?yMin:
                baseY >= yMax?yMax:
                baseY*/
            return Math.min(Math.max(baseY, yMin), yMax)
        }

        const dragFn = drag<SVGCircleElement, processedBubbleDataset>()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded);            

        nodes.call(dragFn)

        function dragStarted(
            event: D3DragEvent<SVGCircleElement, processedBubbleDataset, processedBubbleDataset>, 
            d: processedBubbleDataset
        ) {
            if (!event.active) {
                if(isSorted){
                    simulation
                        .force(
                            "collide", 
                            forceCollide<processedBubbleDataset>()
                                .radius((d:processedBubbleDataset)=>d.r)
                        )
                }
                simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
            
        }

        function dragged(
            event: D3DragEvent<SVGCircleElement, processedBubbleDataset, processedBubbleDataset>,
            d: processedBubbleDataset
        ): void {
            d.fx = event.x;
            d.fy = event.y;

            tooltip.style("display", "none")
        }

        function dragEnded(
            event: D3DragEvent<SVGCircleElement, processedBubbleDataset, processedBubbleDataset>,
            d: processedBubbleDataset
        ): void {
            if (!event.active) {
                if(isSorted)
                {
                    simulation
                        .force(
                            "collide", 
                            forceCollide<processedBubbleDataset>()
                                .radius((d:processedBubbleDataset)=>!isSorted?d.r:d.r/3)
                        )
                        .alphaTarget(0);
                }
                else 
                {
                    simulation
                        .force('charge', forceManyBody().strength(charge))                        
                        .force("collide", nodeCollision.type === "allow"?null:collide)
                        .force("cluster", clusterByGroup && groupBy?cluster:null)
                }                
                
            }

            d.fx = null;
            d.fy = null;

            nodes.attr("stroke", nodeStroke)
        } 
                        
    }, [
        data, valueProp, groupBy, tooltipColumns, clusterByGroup, collision, noLabel, isSorted, 
        selectedGroup, grouplessColor, width, height, {prefix, suffix, formatType} 
    ]);
            
    return (
        <div 
            ref={ref} 
            style={{ width: parentWidth, height: parentHeight, display:'flex', flexDirection:'column', overflow: "hidden" }}
        >                     
            <div 
                ref={chartRef} 
                className={`${styles["fill-container"]}`} 
                style={{display:"flex", flexDirection:"column", position: "relative"}}
            >
                <div                     
                    className={`controls ${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
                    style={{display:groupBy?"flex":"none", zIndex: 1,}}
                >      
                    <label 
                        className={`${styles["controls-label"]}`} 
                        style={{paddingRight: '12px',}}
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
                <label 
                    className={`${styles["controls-label"]}`} 
                    style={{
                        paddingRight: '12px', position: 'absolute', left: 0, top: 6, zIndex: 3,
                        display: groupBy?"none":"block", pointerEvents: groupBy?"none":"auto"
                    }}
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
                    ref={chartContainerRef}
                    className={`${styles["fill-container"]}`}
                    style={{ display:"flex", flexDirection:"column", overflow: "hidden", zIndex: 2 }}> 
                    <svg                                                        
                        className={`${styles["chart-svg"]} ${styles["fill-container"]}`}                    
                        viewBox={`${-width/2} ${-height/2} ${width} ${height}`}
                    >
                        <defs />
                        <g className="plot-area">
                            <foreignObject id="tooltip" style={{pointerEvents: "none"}}>
                                <div 
                                    style={{                                        
                                        width: "max-content", boxSizing: "border-box", 
                                        pointerEvents: "none", whiteSpace: "nowrap",                                                                                 
                                    }}
                                    className={`tt ${tooltipStyles.tooltip}`}                                    
                                />
                            </foreignObject>    
                        </g>                        
                    </svg>                                                
                </div>
            </div>
            
        </div>
    );
}