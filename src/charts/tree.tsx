import React, {useState} from 'react';
import { 
    hierarchy, HierarchyNode, tree, TreeLayout, linkRadial, 
    HierarchyPointLink, HierarchyPointNode,    
 } from 'd3';
import { useD3 } from '../hooks/useD3';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import styles from './global.module.css';
import { tooltipFormat,hierarchyData } from '../types';
import { useParentSize } from '../hooks/useParentSize';

type hierarchyPointLink = HierarchyPointLink<hierarchyData>;
type hierarchyPointNode = HierarchyPointNode<hierarchyData>;

type TreeProps = {
    data: hierarchyData;    
    tooltipFormat?: tooltipFormat;
}

export function TreeDiagram({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:TreeProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)        
    
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;
        
        const margin = { 
            top: 0, 
            right: 0, 
            bottom: 0, 
            left: 0
        };
        
        const radius = Math.min(width, height) / 2 - 30;        

        const canvasSvg = container.select<SVGSVGElement>("svg")
            
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        //console.log(hierarchyData)

        //const tooltip = getTooltip(container as any);
        const tooltip = container.select(`#tooltip`).style("opacity", 0)
        
        const root:HierarchyNode<hierarchyData> = hierarchy<hierarchyData>(data)
                
        const treeFn: TreeLayout<hierarchyData> = tree<hierarchyData>()
            .size([2 * Math.PI, radius])
            .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth)

        const rootedTree = treeFn(root)
        const linksData: hierarchyPointLink[] = rootedTree.links()
        const nodesData: hierarchyPointNode[] = rootedTree.descendants() 
                
        canvas.selectAll("path.link").remove()
        canvas.selectAll("circle.node").remove()
        canvas.selectAll("text.label").remove()

        /*
        const simulation = forceSimulation<hierarchyPointNode>(nodesData)
            .force(
                    "link",
                    forceLink(linksData)
                        .id(d => (d as networkNode).id)
                        //.distance(100)
                )
            .force("x", forceX(-width / 2).strength(0.01))
            .force("y", forceY(-height / 2).strength(0.01))
            .force("charge", forceManyBody())
            .stop()

        const radialLink = linkRadial<
            hierarchyPointLink,
            hierarchyPointNode
        >()
            .angle(d => d.x)
            .radius(d => d.y);

        const links = canvas
            .selectAll("path")
            .data(linksData)
            .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)            
            .style("stroke-width", function(d){
                return d.value?Math.sqrt(d.value):1.5
            })
            .attr("d", radialLink);

        const color = scaleOrdinal<string, string>(range(m).map(String), schemeCategory10)
        const r = 2.5
        const nodes = canvas
            .selectAll<SVGCircleElement, networkHierarchyNode>("circle.node")
            .data(nodesData)
            .join("circle")
            .attr("class", "node")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
            //.attr("cx", d => d.y * Math.cos(d.x - Math.PI / 2))
            //.attr("cy", d => d.y * Math.sin(d.x - Math.PI / 2))
            .attr("fill", d => color(d.data.group ?? ""))
            .attr("r", r)

        nodes.on("mouseover", function(_, d){
            console.log(d)
        })

        simulation.on("tick", () => {
            nodes
                .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
                //.attr("cx", d => d.y * Math.cos(d.x - Math.PI / 2))
                //.attr("cy", d => d.y * Math.sin(d.x - Math.PI / 2))

            links.attr("d", radialLink)
        });
        */

        const radialLink = linkRadial<
            hierarchyPointLink,
            hierarchyPointNode
        >()
            .angle(d => d.x)
            .radius(d => d.y);
        const links = canvas.selectAll<SVGPathElement, hierarchyPointLink>("path.link")            
            .data(linksData)
            .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
            .attr("d", radialLink);
        
        const nodes = canvas.selectAll("circle.node")
            .data(nodesData)
        .join("circle")
        .attr("class", "node")
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
        .attr("fill", d => d.children ? "#555" : "#999")
        .attr("r", 2.5);

        const labels = canvas.selectAll("text.label")
            .data(nodesData)
        .join("text")
        .attr("class", "label")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`)
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
        .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
        .attr("paint-order", "stroke")
        .attr("stroke", "white")
        .attr("fill", "currentColor")
        .style("font-size", 10)
        .text(d => d.data.name);                                                                       

    }, [data,  width, height, {prefix, suffix, formatType} ]);
        
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