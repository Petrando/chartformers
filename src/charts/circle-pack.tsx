import React, {useState, useEffect, useRef} from 'react';
import * as d3 from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { useContainerSize } from '../hooks/useContainerSize';
import { circlePackData, tooltipFormat } from '../types';
import styles from './global.module.css';
import packStyles from './circle-pack.module.css'

type PackProps = {
    data: circlePackData[];
    tooltipFormat?: tooltipFormat;
}

export function CirclePack({data, tooltipFormat}: PackProps) {
    const [circlePackData, setPackData] = useState<circlePackData[] | null>(null);    
    const isFirstRender = useRef(true)
    const [ref, parentSize] = useParentSize<HTMLDivElement>();
    const { width:parentWidth, height: parentHeight} = parentSize;    

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
            const margin = { top: 20, right: 20, bottom: 20, left: 20 };            

            const baseHeight = height - (margin.top + margin.bottom)
            const baseWidth = width - (margin.left + margin.right)
            
            const graphHeight = baseHeight            
            const graphWidth = baseWidth

            const rootData:circlePackData = {'name':'branches', 'children':circlePackData} 

            const diameter = Math.min(graphWidth, graphHeight)
            
            const root = d3.hierarchy(rootData)
                .sum(function(d) { return d.value!; })
                .sort(function(a, b){return b.value! - a.value!;})

            const pack = d3.pack<circlePackData>()
                .size([diameter - 20, diameter - 20])
                .padding(2)

            let focus = root, scale = 1, thicknessK = 1;    
            const packedRoot = pack(root)        
            const nodes = packedRoot.descendants();
            const view = [packedRoot.x, packedRoot.y, packedRoot.r * 2 + margin.top];

            const canvasSvg = container.select<SVGSVGElement>("svg")
            const svgNode = canvasSvg.node()
            const canvas = canvasSvg.select<SVGGElement>('.plot-area')
                .attr("transform", "translate(" + graphWidth / 2 + "," + graphHeight / 2 + ")");

            const color = d3.scaleLinear<string>()
                .domain([-1, 2])
                .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
                .interpolate(d3.interpolateHcl);
            
            const circles = canvas
                .selectAll<SVGCircleElement, d3.HierarchyCircularNode<circlePackData>>("circle")
                .data(nodes,(d) => d.data.name)
                .join(
                    enter =>
                        enter
                        .append("circle")
                            .attr("class", function(d) { return d.parent ? d.children ? packStyles.node : `${packStyles.node} ${packStyles["node--leaf"]}` : `${packStyles.node} ${packStyles["node--root"]}`; })
                            .style("fill", function(d) { 
                                const cirleColor = d.children ? color(d.depth) : "#f0fdfa";                              
                                return cirleColor; 
                            })
                            .style("cursor", "pointer")
                                .transition().duration(animDuration)
                            .attr("r", function(d) { 
                                const k = diameter / view[2];		 
                              
                                return d.r * k;
                            })
                            .attr("cx", function(d){
                                const k = diameter / view[2];                              
                                return ((d.x - view[0]) * k);
                            })
                            .attr("cy", function(d){
                                const k = diameter / view[2];                              
                                return ((d.y - view[1]) * k);
                            })
                            .style("stroke", "#737373")
                            .style("stroke-width", CIRCLESTROKE * thicknessK)
                            .style("fill", function(d) { 
                                const cirleColor = d.children ? color(d.depth) : "#f0fdfa";                              
                                return cirleColor; 
                            }),
                    update=>update.transition().duration(animDuration)
                        .attr("cx", function(d){
                            const k = diameter / view[2];                        
                            return ((d.x - view[0]) * k);
                        })
                        .attr("cy", function(d){
                            const k = diameter / view[2];                        
                            return ((d.y - view[1]) * k);
                        })
                        .attr("r", function(d) { 
                            const k = diameter / view[2];		                         
                            return d.r * k;
                        })
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
                        texts.filter(function(dText) { return dText.parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                            .style("font-size", LABELFONTSIZE * thicknessK)
                            .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                            .style("display", function(d){return (d.parent===focus? "inline":"none");});
                    }
                    else{  
                        if(d===focus){
                            texts.filter(function(dText) { return dText.parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                                .style("font-size", LABELFONTSIZE * thicknessK)
                                .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                                .style("display", function(d){return (d.parent===focus? "inline":"none");});
                        }else /*if(d.parent===focus)*/{
                            texts.filter(function(dText){return dText.data.name!=d.data.name;})
                                .style("fill-opacity", 0)
                                .style("display", "none");
                            
                            texts.filter(function(dText){return dText.data.name===d.data.name;})
                                .style("fill-opacity", 1)
                                .style("display", "inline");
                        }
                    }
                    
                    //console.log(d3.select(this).style('stroke'));		 
                    let myStroke = d3.select(this).style('stroke');
                    if(d!=root){d3.select(this)
                        .style("stroke-width", CIRCLESTROKE * thicknessK * 2.5)
                        .style("stroke", "#e4e4e7");}
                })
                .on('mouseout', function(e, d){
                    texts.filter(function(d) { return d.parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  
                        //.style("font-size", LABELFONTSIZE * thicknessK)
                        .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                        .style("display", function(d){return (d.parent===focus? "inline":"none");});
            
                    d3.select(this)
                        .style("stroke-width", CIRCLESTROKE * thicknessK)
                        .style("stroke", function(d){
                            return "#737373";
                        });
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
                                    
            const texts = canvas
                .selectAll<SVGTextElement, d3.HierarchyCircularNode<circlePackData>>("text")
                .data(nodes, function(d){return d.data.name})
                .join(
                    enter=>enter.append("text")  
                        .attr("class", packStyles["circle_pack_label"])                          
                        .text(function(d){                                
                            return d.data.name
                        })
                        .style("font-size", 12)
                        .style("text-anchor", "middle")                                                        
                        .style("fill-opacity", 0)
                        .style("stroke-opacity", 0)
                        .style("display", "none")
                        .style("pointer-events", "none")
                        .style("text-shadow", "0 1px 0 lightblue, 1px 0 0 lightblue, -1px 0 0 lightblue, 0 -1px 0 lightblue")                            
                            .transition().duration(animDuration)
                        .attr("transform", function(d) { 
                            const k = diameter / view[2];                                
                            return "translate(" + (d.x - view[0]) * k + "," + (d.y - view[1]) * k + ")"; 
                        })
                        .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })	  
                        .style("display", function(d) { return d.parent === root ? "inline" : "none"; }),
                    update=>update.attr("class", packStyles["circle_pack_label"])
                            .transition().duration(animDuration)                        
                        .attr("transform", function(d) { 
                            const k = diameter / view[2];
                            return "translate(" + (d.x - view[0]) * k + "," + (d.y - view[1]) * k + ")"; 
                        })
                        .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })	  
                        .style("display", function(d) { return d.parent === root ? "inline" : "none"; }),
                    exit=>exit.transition().duration(animDuration).style("opacity", 0).remove()
                )                                            
                    
            texts.raise()
            function clicked(d:d3.HierarchyCircularNode<circlePackData>) {	
                const focus0 = focus; focus = d;
                                
                const myMaxRadius = (diameter/2) - margin.top;  
                const centerX = graphWidth/2, centerY = graphHeight/2;//center, (diameter/2, diameter/2)
                
                const k = diameter / view[2];
                const myR = /*currentData==="---"?Math.max((d.r * k),0.25):*/d.r * k;
                
                thicknessK=myR/myMaxRadius;
                
                scale = myMaxRadius/myR;
                const myCx = ((d.x - view[0]) * k);
                const translateX = centerX-(myCx * scale);
                const myCy = ((d.y - view[0]) * k);
                const translateY = centerY-(myCy * scale);
                
                const scalingTranslate = ((myR*2)/diameter)*2; 
                canvas.transition().duration(1000)        
                    .attr("transform", "translate(" + translateX + "," + translateY + ")scale("+(scale)+")");
                                        
                texts
                    .style("font-size", LABELFONTSIZE * thicknessK + 'px')
                    .filter(function(d) { return d.parent === focus || (this as SVGTextElement).style.display === "inline"; })	    	  	    
                    .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                    .style("display", function(d){return (d.parent===focus? "inline":"none");})
                    //.each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                    //.each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
            
                
                
                
                //event.stopPropagation();
            }
            function reset(){
                    canvas.transition().duration(1000)
                        .attr("transform", "translate(" + (graphWidth/2) + ", " + (graphHeight/2) + ")scale(1)");
                            
                    focus = root;scale=1;thicknessK = 1;                    
                                        
                    texts
                        .style("font-size", LABELFONTSIZE * thicknessK + 'px')
                        .filter(function(d) { return d.parent === focus || (this as SVGTextElement).style.display === "inline"; })	  
                            //.transition().duration(750)
                        .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                        .style("display", function(d){return (d.parent===focus? "inline":"none");});                                                                                                                 
                    
                    return;
                }
                    
        }, 
        [circlePackData, parentWidth, parentHeight]
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
            </div>            
        </div>  
    )
}