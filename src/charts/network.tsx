import React, {useState} from 'react';
import { select, axisBottom, min, max, format, color as d3Color,
    scaleLinear, ScaleLinear, group, hierarchy,
    drag, D3DragEvent,
    forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, 
    forceX, forceY,
    HierarchyNode, HierarchyLink, pack, quadtree, rollup,
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
    networkHierarchyNode, networkHierarchyLink
 } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { useParentSize } from '../hooks/useParentSize';

const peopleNetwork: networkEdge[] = [
    ["Alice", "Bob"],
    ["Alice", "Charlie"],
    ["Bob", "David"]
];

const languageNetwork: networkEdge[] = [
      ['Proto Indo-European', 'Balto-Slavic'],
      ['Proto Indo-European', 'Germanic'],
      ['Proto Indo-European', 'Celtic'],
      ['Proto Indo-European', 'Italic'],
      ['Proto Indo-European', 'Hellenic'],
      ['Proto Indo-European', 'Anatolian'],
      ['Proto Indo-European', 'Indo-Iranian'],
      ['Proto Indo-European', 'Tocharian'],
      ['Indo-Iranian', 'Dardic'],
      ['Indo-Iranian', 'Indic'],
      ['Indo-Iranian', 'Iranian'],
      ['Iranian', 'Old Persian'],
      ['Old Persian', 'Middle Persian'],
      ['Indic', 'Sanskrit'],
      ['Italic', 'Osco-Umbrian'],
      ['Italic', 'Latino-Faliscan'],
      ['Latino-Faliscan', 'Latin'],
      ['Celtic', 'Brythonic'],
      ['Celtic', 'Goidelic'],
      ['Germanic', 'North Germanic'],
      ['Germanic', 'West Germanic'],
      ['Germanic', 'East Germanic'],
      ['North Germanic', 'Old Norse'],
      ['North Germanic', 'Old Swedish'],
      ['North Germanic', 'Old Danish'],
      ['West Germanic', 'Old English'],
      ['West Germanic', 'Old Frisian'],
      ['West Germanic', 'Old Dutch'],
      ['West Germanic', 'Old Low German'],
      ['West Germanic', 'Old High German'],
      ['Old Norse', 'Old Icelandic'],
      ['Old Norse', 'Old Norwegian'],
      ['Old Norwegian', 'Middle Norwegian'],
      ['Old Swedish', 'Middle Swedish'],
      ['Old Danish', 'Middle Danish'],
      ['Old English', 'Middle English'],
      ['Old Dutch', 'Middle Dutch'],
      ['Old Low German', 'Middle Low German'],
      ['Old High German', 'Middle High German'],
      ['Balto-Slavic', 'Baltic'],
      ['Balto-Slavic', 'Slavic'],
      ['Slavic', 'East Slavic'],
      ['Slavic', 'West Slavic'],
      ['Slavic', 'South Slavic'],
      // Leaves:
      ['Proto Indo-European', 'Phrygian'],
      ['Proto Indo-European', 'Armenian'],
      ['Proto Indo-European', 'Albanian'],
      ['Proto Indo-European', 'Thracian'],
      ['Tocharian', 'Tocharian A'],
      ['Tocharian', 'Tocharian B'],
      ['Anatolian', 'Hittite'],
      ['Anatolian', 'Palaic'],
      ['Anatolian', 'Luwic'],
      ['Anatolian', 'Lydian'],
      ['Iranian', 'Balochi'],
      ['Iranian', 'Kurdish'],
      ['Iranian', 'Pashto'],
      ['Iranian', 'Sogdian'],
      ['Old Persian', 'Pahlavi'],
      ['Middle Persian', 'Persian'],
      ['Hellenic', 'Greek'],
      ['Dardic', 'Dard'],
      ['Sanskrit', 'Sindhi'],
      ['Sanskrit', 'Romani'],
      ['Sanskrit', 'Urdu'],
      ['Sanskrit', 'Hindi'],
      ['Sanskrit', 'Bihari'],
      ['Sanskrit', 'Assamese'],
      ['Sanskrit', 'Bengali'],
      ['Sanskrit', 'Marathi'],
      ['Sanskrit', 'Gujarati'],
      ['Sanskrit', 'Punjabi'],
      ['Sanskrit', 'Sinhalese'],
      ['Osco-Umbrian', 'Umbrian'],
      ['Osco-Umbrian', 'Oscan'],
      ['Latino-Faliscan', 'Faliscan'],
      ['Latin', 'Portugese'],
      ['Latin', 'Spanish'],
      ['Latin', 'French'],
      ['Latin', 'Romanian'],
      ['Latin', 'Italian'],
      ['Latin', 'Catalan'],
      ['Latin', 'Franco-Provençal'],
      ['Latin', 'Rhaeto-Romance'],
      ['Brythonic', 'Welsh'],
      ['Brythonic', 'Breton'],
      ['Brythonic', 'Cornish'],
      ['Brythonic', 'Cuymbric'],
      ['Goidelic', 'Modern Irish'],
      ['Goidelic', 'Scottish Gaelic'],
      ['Goidelic', 'Manx'],
      ['East Germanic', 'Gothic'],
      ['Middle Low German', 'Low German'],
      ['Middle High German', '(High) German'],
      ['Middle High German', 'Yiddish'],
      ['Middle English', 'English'],
      ['Middle Dutch', 'Hollandic'],
      ['Middle Dutch', 'Flemish'],
      ['Middle Dutch', 'Dutch'],
      ['Middle Dutch', 'Limburgish'],
      ['Middle Dutch', 'Brabantian'],
      ['Middle Dutch', 'Rhinelandic'],
      ['Old Frisian', 'Frisian'],
      ['Middle Danish', 'Danish'],
      ['Middle Swedish', 'Swedish'],
      ['Middle Norwegian', 'Norwegian'],
      ['Old Norse', 'Faroese'],
      ['Old Icelandic', 'Icelandic'],
      ['Baltic', 'Old Prussian'],
      ['Baltic', 'Lithuanian'],
      ['Baltic', 'Latvian'],
      ['West Slavic', 'Polish'],
      ['West Slavic', 'Slovak'],
      ['West Slavic', 'Czech'],
      ['West Slavic', 'Wendish'],
      ['East Slavic', 'Bulgarian'],
      ['East Slavic', 'Old Church Slavonic'],
      ['East Slavic', 'Macedonian'],
      ['East Slavic', 'Serbo-Croatian'],
      ['East Slavic', 'Slovene'],
      ['South Slavic', 'Russian'],
      ['South Slavic', 'Ukrainian'],
      ['South Slavic', 'Belarusian'],
      ['South Slavic', 'Rusyn']
]

type NetworkProps = {
    data: hierarchyData | networkDataType;
    mode?: "network" | "hierarchy";
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
        mode = "network",
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
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        
        const margin = { 
            top: 0, 
            right: 0, 
            bottom: 0, 
            left: 0
        };

        /*type NetworkEdge = [string, string];

        function buildNetworkData(edges: NetworkEdge[]): networkDataType {
            const nodeIds = new Set<string>();

            const links: networkLink[] = edges.map(([source, target]) => {
                nodeIds.add(source);
                nodeIds.add(target);

                return {
                    source,
                    target,
                };
            });

            const nodes: networkNode[] = [...nodeIds].map(id => ({
                id,
            }));

            return {
                nodes,
                links,
            };
        }
                
        const graphWidth = width - (margin.left + margin.right)
        const graphHeight = height - (margin.top + margin.bottom)        

        const data: networkDataType = buildNetworkData(languageNetwork)*/        
                
        /*const simulation = forceSimulation<networkNode>(data.nodes)
            .force("link",
                forceLink<networkNode, networkLink>(data.links)
                    .id(d => d.id)
                    //.distance(100)
            )
            .force(
                "charge", 
                forceManyBody()
                .strength(-80))
            //.force("center", forceCenter(graphWidth / 2, graphHeight / 2))            
            //.force("collision", forceCollide(18))
            .force("x", forceX())
            .force("y", forceY())*/

        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        

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
        //console.log(hierarchyData)

        /*const networkGrouped = group(
            data.nodes,
            d => d.group
        );
        const networkHierarchyData = {
            children: Array.from(
                networkGrouped,
                ([group, children]) => ({
                    name: `Group ${group}`,
                    children
                })
            )
        };
        const networkRoot = hierarchy(networkHierarchyData)
            .sum(() => 1);
        const networkPackedFn = () => pack()
            .size([width, height])
            .padding(1)(networkRoot)

        const networkNodesData = networkPackedFn().leaves()
        console.log(networkNodesData)*/
        //console.log(testData)
        const root = hierarchy(cloneObj(testData))
            .sum(function(d) { return d.value!; })
        //console.log(root)
        
        const packFn = () => pack<hierarchyData>()
            .size([width, height])
            .padding(1)(hierarchy(cloneObj(hierarchyData))
            .sum(function(d) { return d.value!; }))        

        const nodesData = packFn().leaves();
        //console.log(nodesData)

        const simulation = forceSimulation<networkHierarchyNode>(nodesData)
            .force("x", forceX(-width / 2).strength(0.01))
            .force("y", forceY(-height / 2).strength(0.01))
            .force("cluster", forceCluster())
            .force("collide", forceCollide())

        const color = scaleOrdinal<string, string>(range(m).map(String), schemeCategory10)
        const radius = 10
        const nodes = canvas
            .selectAll<SVGCircleElement, networkHierarchyNode>("circle")
            .data(nodesData)
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", d => color(d.data.group ?? ""))
            .attr("r", radius)

        nodes.transition()
            .delay((d, i) => Math.random() * 500)
            .duration(750)
            .attrTween("r", d => {
                const i = interpolate(0, d.r);
                return t => `${i(t)}`;
            });

        nodes.on("mouseover", function(e, d){
            console.log(d)
        })
        simulation.on("tick", () => {
            nodes
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

        function forceCluster() {
            const strength = 0.2;
            let nodesRolled: networkHierarchyNode[];

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

            force.initialize = (_: networkHierarchyNode[]) => nodesRolled = _;

            return force;
        }

        function forceCollide() {
            const alpha = 0.4; // fixed for greater rigidity!
            const padding1 = 2; // separation between same-color nodes
            const padding2 = 6; // separation between different-color nodes
            let nodes: networkHierarchyNode[];
            let maxRadius: number;

            const force: Force<networkHierarchyNode, undefined> = () => {
                const quadtreeFn = quadtree<networkHierarchyNode>(nodes, d => d.x!, d => d.y!);
                
                for (const d of nodes) {
                    const r = d.r + maxRadius;
                    const nx1 = d.x - r, ny1 = d.y - r;
                    const nx2 = d.x + r, ny2 = d.y + r;
                    quadtreeFn.visit((q, x1, y1, x2, y2) => {
                        if (!q.length) {
                            for (let qLeaf: QuadtreeLeaf<networkHierarchyNode> | undefined = q; qLeaf; qLeaf = qLeaf.next) {
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
                initNodes: networkHierarchyNode[]
            ) => {
                nodes = initNodes;

                maxRadius =
                    max(nodes, d => d.r)! +
                    Math.max(padding1, padding2);
            };

            return force;
        }

        function centroid(nodes:networkHierarchyNode[]) {
            let x = 0;
            let y = 0;
            let z = 0;
            for (const d of nodes) {
                let k = d.r ** 2;
                x += d.x * k;
                y += d.y * k;
                z += k;
            }
            return {x: x / z, y: y / z};
        }
                                                               

    }, [data, mode, color, width, height, {prefix, suffix, formatType} ]);
    
    //-width/2
    //-height/2
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