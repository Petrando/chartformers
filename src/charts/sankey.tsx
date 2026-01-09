import React, {useState, useEffect, useRef} from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyGraph, SankeyNode, SankeyLink, SankeyNodeMinimal, SankeyLinkMinimal } from "d3-sankey";
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useContainerSize } from '../hooks/useContainerSize';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { cloneObj, indexColor, basicFormat } from '../utils';
import { inactiveColor } from '../data/constants';
import { Tooltip, getTooltip, moveTooltip, moveSankeyTooltip } from '../components/tooltip';
import { sankeyData, sankeyNode, sankeyLink } from '../types';
import styles from './global.module.css';
import sankeyStyles from './sankey.module.css'
import { link } from 'fs';

export type LayoutNode =
  SankeyNode<sankeyNode, sankeyLink>;

export type LayoutLink =
  SankeyLink<sankeyNode, sankeyLink>;

export type LayoutGraph =
  SankeyGraph<sankeyNode, sankeyLink>;

type SankeyProps = {
    data: sankeyData;
}
export function SankeyChart({data}: SankeyProps) {
    const [sankeyData, setSankeyData] = useState<sankeyData | null>(null);
    const isFreshData = useRef(true)
    const isFirstRender = useRef(true)
    const [prevData, setPrevData] = useState<sankeyData | null>(null);
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);
    const [hoveredLink, setHoveredLink] = useState<number | null>(null);
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width:parentWidth, height: parentHeight} = parentSize;
    const containerSize = useContainerSize();
    const layersRef = useLayerIndex(sankeyData?sankeyData.nodes.map(n => n.name):[]);

    useEffect(()=>{
        setSankeyData((prev) => {
            const prevNames = prev === null?[]:prev.nodes.map(node =>  node.name)
            const currentNames = data.nodes.map(node => node.name)

            isFreshData.current = currentNames.every(name => {
                if(prevNames.includes(name)){
                    return false
                }
                return true
            });

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
            if(!sankeyData){
                return
            }                        

            const width = parentWidth;
            const height = parentHeight;
            if(width === 0 || height === 0){
                return
            }
            const margin = { top: 20, right: 20, bottom: 20, left: 20 };            

            const baseHeight = height - (margin.top + margin.bottom)
            const baseWidth = width - (margin.left + margin.right)
            
            const graphHeight = baseHeight            
            const graphWidth = baseWidth

            const clonedLinks = sankeyData.links.map((d:sankeyLink) => { return {...d}})
            const clonedNodes = sankeyData.nodes.map((d:sankeyNode) => {return {...d}})

            clonedLinks.forEach(function(d:sankeyLink){
                const src = sankeyData.nodes[d.source].name;
                const trgt = sankeyData.nodes[d.target].name;
                const linkID = src + " → " + trgt;
                d.sourceName = src;
                d.targetName = trgt;                
                d.id = linkID;
            });                                                

            const canvasSvg = container.select<SVGSVGElement>("svg")
            const svgNode = canvasSvg.node()
            const canvas = canvasSvg.select<SVGGElement>('.plot-area')
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

            const tooltip = getTooltip(container as any)
                .style("opacity", 0);            

            const mySankey = sankey<sankeyNode, sankeyLink>()                                
                .nodeSort(null)
                .linkSort(null)
                .nodeWidth(graphWidth<=540?12:15)
                .nodePadding(graphWidth<=540?5:8)                
                .extent([[0, 0], [graphWidth, graphHeight]])    
            
            const graph:LayoutGraph = mySankey({
                nodes: clonedNodes.map((d: sankeyNode) => Object.assign({}, d)),
                links: clonedLinks.map((d: sankeyLink) => Object.assign({}, d))
            });
            
            const { nodes, links } = graph;            

            canvas.selectAll("linearGradient").remove();

            const gradients = canvas.selectAll<SVGLinearGradientElement, LayoutLink>("linearGradient")
                .data(links).join("linearGradient")
                .attr("id", (d, i) => i.toString())
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", d => d.source.x0)
                .attr("x2", d => d.target.x0);

            gradients.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", d => {
                    const colorIndex = layersRef.current.findIndex(layer => layer === d.sourceName)
                    return indexColor(colorIndex, false)
                });

            gradients.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", d => {
                    const colorIndex = layersRef.current.findIndex(layer => layer === d.targetName)
                    return indexColor(colorIndex, false)
                });

            const strokeDashoffset = (
                d: SankeyLink<sankeyNode, sankeyLink>
            ) => {
                const source = d.source as SankeyNode<sankeyNode, sankeyLink>;
                const target = d.target as SankeyNode<sankeyNode, sankeyLink>;                

                const diff = Math.abs(target.depth! - source.depth!);
                return graphWidth * 1.5 * diff;
            };

            const strokeDasharray = (d: SankeyLink<sankeyNode, sankeyLink>) => {
                return strokeDashoffset(d) + " " + strokeDashoffset(d)
            }
            
            const linkDelay = (d: SankeyLink<sankeyNode, sankeyLink>) => {
                if(!isFreshData.current){
                    return 0
                }

                const target = d.target as SankeyNode<sankeyNode, sankeyLink>;                
                return (target.depth! * animDuration)
            }
            
            const linkGroup = canvas
                .selectAll<SVGPathElement, SankeyLink<sankeyNode, sankeyLink>>(".link")
                .data(links, d => d.id!)
                .join(
                    enter => {
                        return enter.append("path")                      
                        .attr("class", `link ${sankeyStyles.sankeyEnergyLink}`)  
                        .attr("d", sankeyLinkHorizontal())
                        .style("stroke", function(d){
                            const myGradient = gradients.filter(dGrad => dGrad.sourceName === d.sourceName && dGrad.targetName === d.targetName).node();
                            const id = myGradient?.id
                            return `url(#${id})`;                            
                        })                        
                        .attr("stroke-dasharray", strokeDasharray)
                        .attr("stroke-dashoffset", strokeDashoffset)                                                       
                        .attr("stroke-width", d => Math.max(1, d.width!))                         
                            .transition().duration(animDuration)
                            .delay(linkDelay)                        
                        .attr("stroke-dashoffset", 0)                            
                        .on("end", function(){
                            d3.select(this).attr("stroke-dasharray", `none`)
                        })
                    },
                    undefined,
                    exit => exit.transition().duration(animDuration/4)
                        .attr("stroke-width", 0)
                        .remove()
                )
                .on("mouseover", (e, d)=>{                         
                    canvas.selectAll("path.link").filter(dPath => {
                        const pathData = dPath as SankeyLink<sankeyNode, sankeyLink>
                        return pathData.id !== d.id
                    })                        
                        .style("stroke", "#1f2937")
                        .style("stroke-opacity", 0.15)

                    /*canvas.selectAll("path.link").filter(dPath => {
                        const pathData = dPath as SankeyLink<sankeyNode, sankeyLink>
                        return pathData.id === d.id
                    })
                        .transition().duration(0)
                        .attr("class", `link ${styles.sankeyEnergyLink}`);*/
                    
                    canvas.selectAll("text.label").filter((dText)=>{
                        const labelData = dText as SankeyNode<sankeyNode, sankeyLink>
                        if(labelData.name !== d.sourceName && labelData.name !== d.targetName){
                            return true;
                        }
                        
                        return false;
                    })
                        .style("opacity", 0);
                    
                    tooltip.style("opacity", 1)
                    tooltip.select("p.title").text(d.id + " : " + basicFormat(d.value/*, settings*/))                    
                    tooltip.select("p.top-label").style("display", "none")
                    tooltip.select("p.bottom-label").style("display", "none")
                        
                })
                .on("mousemove", (e, d) => {                     
                    moveSankeyTooltip(e, tooltip)                    
                })
                .on("mouseout", (e, d)=>{                    
                    tooltip.style("opacity", 0);                    

                    canvas.selectAll("path.link")  
                        .style("stroke", function(d){
                            const linkData = d as SankeyLink<sankeyNode, sankeyLink>
                            const myGradient = gradients.filter(dGrad => dGrad.sourceName === linkData.sourceName && dGrad.targetName === linkData.targetName).node();
                            const id = myGradient?.id
                            return `url(#${id})`;                            
                        })
                        .style("stroke-opacity", 0.5)
                        .style("fill", "none")                      
                        .attr("class", `link ${styles.sankeyEnergyLink}`)                    

                    canvas.selectAll("text.label")
                        .style("opacity", 1)
                        
                })                
                .attr("stroke-width", d => Math.max(1, d.width || 0))
                .transition().duration(animDuration)
                    .delay(linkDelay)               
                .attr("d", sankeyLinkHorizontal())                                                              
                .attr("stroke-dashoffset", 0)
                .on("end", function(){
                    d3.select(this).attr("stroke-dasharray", `none`)
                });
                        

            const nodeDelay = (d:SankeyNode<sankeyNode, sankeyLink>) => {
                if(!isFreshData.current || d.depth === 0){
                    return 0
                }
                return (d.depth! * animDuration) + animDuration/4
            }            
            
            const nodeRects = canvas.selectAll<SVGRectElement, SankeyNode<sankeyNode, sankeyLink>>("rect.node")
                .data(nodes, (d=>d.name))
                .join(
                    enter => {
                        return enter.append("rect")            
                        .attr("class", `node ${styles.baseNode}`)
                        .attr("x", d => d.x0!)
                        .attr("y", d => d.y0!)
                        .attr("height", d=>{
                            if(isFreshData.current){
                                return Math.abs(d.y1! - d.y0!)
                            }
                            return 0
                        })
                        .attr("width", d => {
                            if(isFreshData.current){
                                return 0
                            }
                            return d.x1! - d.x0!
                        })
                        .attr("opacity", 0)
                            .transition().duration(animDuration)
                            .delay(nodeDelay)
                        .attr("fill", d=>{
                            const colorIndex = layersRef.current.findIndex(layer => layer === d.name)
                            return indexColor(colorIndex, false)
                        })
                        .attr("opacity", 1)
                        .attr("width", function(d){
                            return d.x1! - d.x0!
                        })
                    },
                    undefined,
                    exit=>exit.transition().duration(animDuration/4)
                        .attr("height", 0)
                        .remove()
                )
                .on("mouseover", (e,d)=>{                          

                    canvas.selectAll("path.link").filter(dPath => {
                        const pathData = dPath as SankeyLink<sankeyNode, sankeyLink>
                        if(pathData.sourceName === d.name){
                            return false;
                        }
                        if(pathData.targetName === d.name){
                            return false;
                        }
                        return true;
                    })
                    .style("stroke", "#1f2937")
                    .style("stroke-opacity", 0.1);                                        
                    
                    const enteringValue = d.targetLinks?.reduce((acc, curr)=>{
                        return acc + curr.value
                    }, 0)
                    const exitingValue = d.sourceLinks?.reduce((acc, curr)=>{
                        return acc + curr.value
                    }, 0)                    
                    
                    tooltip.style("opacity", 1)
                    tooltip.select("p.title").text(d.name + " :")
                    tooltip.select("p.top-label")
                        .style("display", "block")
                        .text("in : " + basicFormat(enteringValue!))                    
                    tooltip.select("p.bottom-label")
                        .style("display", "block")
                        .text("out : " + basicFormat(exitingValue!))
                })
                .on("mousemove", (e, d) => {                    
                    moveSankeyTooltip(e, tooltip)
                })
                .on("mouseout", (e, d)=>{                                    
                    tooltip.style("opacity", 0);                                            
    
                    canvas.selectAll("path.link")
                        .style("stroke", function(d){
                            const linkData = d as SankeyLink<sankeyNode, sankeyLink>
                            const myGradient = gradients.filter(dGrad => dGrad.sourceName === linkData.sourceName && dGrad.targetName === linkData.targetName).node();
                            const id = myGradient?.id
                            return `url(#${id})`;                            
                        })
                        .style("stroke-opacity", 0.5)
                        .style("fill", "none")                      
                        .attr("class", `link ${styles.sankeyEnergyLink}`)
                })
                .transition().duration(animDuration)
                    .delay(nodeDelay)
                .attr("opacity", 1)
                .attr("x", d => d.x0!)
                .attr("y", d => d.y0!)
                .attr("height", d => Math.abs(d.y1! - d.y0!))
                .attr("width", d => d.x1! - d.x0!)
                .attr("fill", d=>{
                    const colorIndex = layersRef.current.findIndex(layer => layer === d.name)
                    return indexColor(colorIndex, false)
                });

                const labels = canvas.selectAll<SVGTextElement, SankeyNode<sankeyNode, sankeyLink>>("text.label")
                .data(nodes, d=>d.name)
                .join(
                    enter=>enter.append("text")
                        .attr("class", `label ${sankeyStyles.sankeyLabel}`)
                        .attr("x", d => d.x0! < graphWidth / 2 ? d.x1! + 6 : d.x0! - 6)
                        .attr("y", d => (d.y1! + d.y0!) / 2)
                        .attr("dy", "0.35em")
                        .attr("text-anchor", d => d.x0! < graphWidth / 2 ? "start" : "end")
                        .style("font-size", graphWidth < 648?"12px":"16px")
                        .style("font-weight", graphWidth < 648?"normal":"bold")
                        .style("stroke-width", graphWidth < 648?"0px":"0.25px")
                        .style("stroke", "#eff1f4")
                        .text(d => d.name)
                        .attr("opacity", 0),                            
                    undefined,
                    exit=>exit.transition().duration(animDuration/4)
                        .attr("opacity", 0)
                        .remove()
                )
                .style("font-size", graphWidth < 648?"12px":"16px")
                .style("font-weight", graphWidth < 648?"normal":"bold")
                .style("stroke-width", graphWidth < 648?"0px":"0.25px")
                    .transition().duration(animDuration)
                    .delay(nodeDelay)
                .attr("x", d => d.x0! < graphWidth / 2 ? d.x1! + 6 : d.x0! - 6)
                .attr("y", d => (d.y1! + d.y0!) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0! < graphWidth / 2 ? "start" : "end")
                .attr("opacity", 1);
                        
        }, 
        [sankeyData, parentWidth, parentHeight]
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
                <Tooltip pCount={3} />
            </div>            
        </div>  
    )
}