import React, {useState} from 'react';
import { select, axisBottom, min, max, format,
    scaleLinear, ScaleLinear,
    drag, D3DragEvent,
    forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, 
    forceX, forceY
 } from 'd3';
 import {
  SimulationNodeDatum,
  SimulationLinkDatum
} from "d3-force";
import { useD3 } from '../hooks/useD3';
import { useUIControls } from '../hooks/useUIControls';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import { cloneObj, indexSelectedColor, renderLineChart } from '../utils';

import styles from './global.module.css';
import { pointData, tooltipFormat, lineDecor, orientationType } from '../types';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { useParentSize } from '../hooks/useParentSize';

type networkNode = SimulationNodeDatum & {
    id: string;
};

type networkLink = SimulationLinkDatum<networkNode> & {
    source: string;
    target: string;
};

type networkResolvedLink = Omit<networkLink, "source" | "target"> & {
    source: networkNode;
    target: networkNode;
};

type networkDataType = {
    nodes: networkNode[], links: networkLink[]
}

type networkEdge = [string, string]

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
    data: pointData[];
    color?: {
        idx?: number;
        type?: 'fixed' | 'colorful';
    };
    tooltipFormat?: tooltipFormat;
}

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
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        
        const margin = { 
            top: 0, 
            right: 0, 
            bottom: 0, 
            left: 0
        };

        type NetworkEdge = [string, string];

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

        const data: networkDataType = buildNetworkData(languageNetwork)
        const simulation = forceSimulation<networkNode>(data.nodes)
            .force("link",
                forceLink<networkNode, networkLink>(data.links)
                    .id(d => d.id)
                    //.distance(100)
            )
            .force("charge", forceManyBody()/*.strength(-80)*/)
            //.force("center", forceCenter(graphWidth / 2, graphHeight / 2))            
            //.force("collision", forceCollide(18))
            .force("x", forceX())
            .force("y", forceY())
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                       
        const resolvedLinks = data.links as networkResolvedLink[];
        const links = canvas  
            .selectAll<SVGLineElement, networkLink>("line")
            .data(resolvedLinks, d => d.source + "-" + d.target)
            .join("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 2);

        const nodes = canvas            
            .selectAll<SVGCircleElement, networkNode>("circle")
            .data(data.nodes, d => d.id)
            .join("circle")
            .attr("r", 8)
            .attr("fill", "steelblue");

        const labels = canvas            
            .selectAll<SVGTextElement, networkNode>("text")
            .data(data.nodes, d => d.id)
            .join("text")
            .attr("class", styles["shadowed_text"])
            .text(d => d.id)
            .attr("font-size", 12)
            .attr("text-anchor", "middle")
            .attr("dy", 4);
        
        simulation.on("tick", () => {
            links
                .attr("x1", d => d.source.x!)
                .attr("y1", d => d.source.y!)
                .attr("x2", d => d.target.x!)
                .attr("y2", d => d.target.y!);

            nodes
                .attr("cx", d => d.x ?? 0)
                .attr("cy", d => d.y ?? 0);

            labels
                .attr("x", d => d.x ?? 0)
                .attr("y", d => d.y ?? 0);
        });

        const dragFn = drag<SVGCircleElement, networkNode>()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded);

        nodes.call(dragFn)
        
        function dragStarted(
            event: D3DragEvent<SVGCircleElement, networkNode, networkNode>, 
            d: networkNode
        ) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(
            event: D3DragEvent<SVGCircleElement, networkNode, networkNode>,
            d: networkNode
        ): void {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded(
            event: D3DragEvent<SVGCircleElement, networkNode, networkNode>,
            d: networkNode
        ): void {
            if (!event.active) {
                simulation.alphaTarget(0);
            }

            d.fx = null;
            d.fy = null;
        }

        

        //const tooltip = getTooltip(container as any);
        const tooltip = container.select(`#tooltip`).style("opacity", 0)
            

    }, [data, color, width, height, {prefix, suffix, formatType} ]);
    
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