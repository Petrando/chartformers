import React, { useState, useDeferredValue, useEffect, useRef } from 'react';
import { 
    format, chord, descending, arc, ribbon, interpolate, Chord, ChordGroup, tickStep, sum, range, 
    select 
} from 'd3';
import { indexColor, cloneObj, formatNum } from '../../utils';
import { useLayerIndex } from '../../hooks/useLayerIndex';
import { useD3 } from '../../hooks/useD3';
import { useParentSize } from '../../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../../components/tooltip';
import { flatToMatrix } from './utils';
import styles from '../global.module.css';
import { tooltipFormat } from '../../types';
import { chordDatum, node, link, chordData } from './types'

type dataProp = chordData | link[];
type ChordProps = {
    data: dataProp;    
    tooltipFormat?: tooltipFormat;
}

type groupTick = {
    value: number;
    angle: number;
    dIndex: number;
}

export function ChordDiagram({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:ChordProps) {    
    const prevData = useRef<dataProp | null>(null)
    const defferedData = useDeferredValue(data)
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;        

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)    

    useEffect(()=>{
        if(data !== defferedData){
            prevData.current = defferedData
        }
    }, [ data, defferedData ])
    
    function groupTicks(d: ChordGroup, step: number): groupTick[] {
        const k = (d.endAngle - d.startAngle) / d.value;
        return range(0, d.value, step).map(value => {
            return {value: value, angle: value * k + d.startAngle, dIndex: d.index};
        });
    }
 
    const dataMode = "links" in data?"comprehensive":"basic"
    const dataLinks = dataMode === "comprehensive"?(data as chordData).links:(data as link[])
    const matrixData = flatToMatrix(dataLinks)
    const names = matrixData.map(d => d.name)
    //const { names } = getNamesAndDataMode(data)
    const layersRef = useLayerIndex(names)
    const animDuration = 750;
    const chartRef = useD3<HTMLDivElement>((container) => {
        if (width === 0 || height === 0) return;

        const margin = 20;                
        
        const canvasSvg = container.select<SVGSVGElement>("svg")
        const svgNode = canvasSvg.node()
        const canvas = canvasSvg.select<SVGGElement>('.plot-area')
            .attr("transform", "translate(" + width/2 + "," + height/2 + ")");

        const tooltip = getTooltip(container as any)
            .style("opacity", 0);
            
        canvasSvg
        .on("pointerenter pointerleave", function(){
            tooltip.style("opacity", 0)
        })
        
        const chordFn = chord()
            .padAngle(0.05)     // padding between entities (black arc)
            .sortSubgroups(descending)

        const previousData = prevData.current ?? []
        const prevDataMode = "links" in previousData?"comprehensive":"basic"
        const prevDataLinks = prevDataMode === "comprehensive"?(previousData as chordData).links:(previousData as link[])
        const prevMatrixData = flatToMatrix(prevDataLinks)
        const prevNames = prevMatrixData.map(d => d.name)
        const prevValues = prevMatrixData.map(d => d.values)
        const prevRes = chordFn(prevValues)        
        
        const names = matrixData.map(d => d.name)
        const values = matrixData.map(d => d.values)
        const res = chordFn(values)                                    

        const freshRender = prevData === null
        const withExit = !prevNames.every(d=>names.includes(d))

        const radius = Math.min(width, height)
        const r = radius * 0.4

        canvas.selectAll("linearGradient").remove();

        function chordPoint(angle: number, radius: number) {
            return [
                Math.cos(angle - Math.PI / 2) * radius,
                Math.sin(angle - Math.PI / 2) * radius
            ];
        }
        
        const gradients = canvas.selectAll<SVGLinearGradientElement, Chord>("linearGradient")
            .data(res).join("linearGradient")
            .attr("id", (d, i) => `chord-gradient-${i}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .each(function(d) {

                const sourceAngle = (d.source.startAngle + d.source.endAngle) / 2;
                const targetAngle = (d.target.startAngle + d.target.endAngle) / 2;

                const [x1, y1] = chordPoint(sourceAngle, r);
                const [x2, y2] = chordPoint(targetAngle, r);

                select(this)
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2);
            });                        

        gradients.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d => {                            
                const sourceName = names[d.source.index]
                const colorIndex = layersRef.current.findIndex(layer => layer === sourceName)
                return indexColor(colorIndex, true)
            });

        gradients.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d => {                            
                const targetName = names[d.target.index]
                const colorIndex = layersRef.current.findIndex(layer => layer === targetName)
                return indexColor(colorIndex, true)
            });
    
        const ribbonGen = ribbon<Chord, SVGPathElement>().radius(r - 10);

        const links = canvas
            .selectAll<SVGPathElement, Chord>("path.link")
            .data(
                res)
            .join(
                enter=>{
                    const paths = enter
                        .append("path")
                        .attr("class", "link")                    
                        .style("fill", (d, i) => `url(#chord-gradient-${i})`)
                        .style("fill-opacity", 0)
                        .style("stroke", "none")                        

                    paths.transition().duration(animDuration).delay(freshRender?animDuration/2:animDuration)                        
                        .style("fill-opacity", 1)                                            
                        .attr("d", ribbonGen)

                    return paths
                },
                update=>update
                        .transition().duration(animDuration)                    
                    .style("fill-opacity", 1)
                    .attrTween("d", function(d:Chord){
                        const prevD = prevRes.find((prevR:Chord)=>{
                            const prevSourceName = prevNames[prevR.source.index]
                            const prevTargetName = prevNames[prevR.target.index]

                            const sourceName = names[d.source.index]
                            const targetName = names[d.target.index]

                            return prevSourceName === sourceName && prevTargetName === targetName
                        }) as Chord

                        const i = interpolate(prevD, d)
                        return (t) => ribbonGen(i(t)) as unknown as string
                    }),
                exit=>exit.transition().duration(animDuration)
                    .style("fill-opacity", 0).remove()
            )
                    
        const arcGen = arc<ChordGroup>()
            .innerRadius(r - 10)
            .outerRadius(r)

        const angleInterpolation = (d: ChordGroup, direction: string) => {                        
            const i = interpolate(
                direction==="exit"?d.endAngle:d.startAngle, 
                direction==="exit"?d.startAngle:d.endAngle
            );            
            
            return function(this: SVGPathElement, t: number): string {
                d.endAngle = i(t);                     
                return arcGen(d) as string
            }
        }
                        
        const nodes = canvas
            .selectAll<SVGGElement, ChordGroup>("g.nodes")
            .data(res.groups, d => names[d.index])            
            .join(
                enter=>{
                    const nodeG = enter.append("g").attr("class", "nodes")
                    return nodeG
                },
                update=>{
                    const nodeG = update
                    update.transition().duration(animDuration)                    
                    return nodeG
                },
                exit=>{
                    const nodeG = exit

                    nodeG
                        .selectAll<SVGPathElement, ChordGroup>("path")
                            .transition().duration(animDuration)                                                                  
                        .attrTween('d', function(this: SVGPathElement, d){
                            return angleInterpolation(d, "exit")
                        })
                    .remove()

                    nodeG.transition().duration(animDuration)
                        .style("opacity", 0)
                        .remove()

                    return nodeG
                }
            )                    

        nodes.selectAll<SVGPathElement, ChordGroup>("path")
            .data(d => [d]) // Bind the parent's data to the single child path
            .join(
                enter => {
                    const slices = enter.append("path")
                        .style("fill", function(d, i){ 
                            const nodeName = names[d.index]
                            const colorIndex = layersRef.current.findIndex(layer => layer === nodeName)
                            return indexColor(colorIndex, true)                
                        })
                        .style("stroke", "#a89ea9")
                    
                    slices
                        .transition().duration(animDuration)
                    .attr("d", arcGen) // Start at final shape...
                    .attrTween('d', function(this: SVGPathElement, d){
                        if(!freshRender){
                            return angleInterpolation(d, "not exit")                    
                        }

                        const startAngleI = interpolate(0, d.startAngle)
                        const endAngleI = interpolate(0, d.endAngle)

                         return function(this: SVGPathElement, t: number): string {
                            d.startAngle = startAngleI(t)
                            d.endAngle = endAngleI(t)
                            return arcGen(d) as string
                        }
                        
                        
                    })                         
                    
                    return slices
                },                
                update => {
                    const slices = update

                    slices
                        .transition().duration(animDuration)                    
                    .style("fill", function(d, i){ 
                        const nodeName = names[d.index]
                        const colorIndex = layersRef.current.findIndex(layer => layer === nodeName)
                        return indexColor(colorIndex, true)                
                    })                    
                    .attrTween("d", function(d){
                        const myName = names[d.index]
                        const myPrevData = prevRes.groups.find((prevD:ChordGroup)=>{
                            const myPrevName = prevNames[prevD.index]
                            
                            return myPrevName === myName
                        }) as ChordGroup                        
                        
                        const prevStartAngle = !myPrevData?0:myPrevData.startAngle?myPrevData.startAngle:0
                        const startAngleI = interpolate(prevStartAngle, d.startAngle)
                        const prevEndAngle = !myPrevData?0:myPrevData.endAngle?myPrevData.endAngle:0
                        const endAngleI = interpolate(prevEndAngle, d.endAngle)                        

                        return function(this: SVGPathElement, t: number): string {
                            d.startAngle = startAngleI(t)
                            d.endAngle = endAngleI(t)

                            return arcGen(d) as string
                        }
                    })

                    return slices
                },
                exit => exit
                        .transition().duration(animDuration)                                                                  
                    .attrTween('d', function(this: SVGPathElement, d){
                        return angleInterpolation(d, "exit")
                    })
                    .remove()                    
            );

        const chordTick = tickStep(0, sum(values.flat()), 100); // adjust depending on your data scale        
                        
        const ticks = nodes
            .selectAll<SVGGElement, groupTick>("g.group-tick")
            // Keying ticks by value ensures they don't "shuffle" during growth
            .data(d => groupTicks(d, chordTick), (d: groupTick) => d.value) 
            .join(
                enter => {
                    const g = enter
                        .append("g")
                        .attr("class", "group-tick")
                        .attr("transform", d => `
                            rotate(${(d.angle * 180 / Math.PI - 90)}) 
                            translate(${r},0)
                        `)
                        .style("opacity", 0);
                    
                    g.append("line").style("stroke", "#a8a29e").attr("x2", 6);
                    g.append("text")
                        .attr("dy", "0.35em")
                        .style("fill", "#292524")
                        .style("font-size", isMediumScreen?"10px":"8px")
                        .attr("x", 8)
                        .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-16)" : null)
                        .style("text-anchor", d => d.angle > Math.PI ? "end" : "start");

                    g.transition().duration(animDuration).delay(animDuration)                        
                        .style("opacity", 1)
                    return g;
                },
                update=>update.transition().duration(animDuration)
                    .attr("transform", d => `
                        rotate(${(d.angle * 180 / Math.PI - 90)}) 
                        translate(${r},0)
                    `)
                    .style("opacity", 1),
                exit => exit.transition().duration(animDuration).style("opacity", 0).remove()
            );

        ticks.select("text")
            .filter(d => d.value % (chordTick * 5) === 0)
            .text(d => d.value>0?format(".0s")(d.value):format(".1~%")(d.value))
            .attr("x", 8)
            .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-16)" : null)
            .style("text-anchor", d => d.angle > Math.PI ? "end" : "start");

        nodes.select("text")
            .attr("font-weight", "bold")
            .text(function(d) {
                const thisNode = this as Element
                return thisNode.getAttribute("text-anchor") === "end"
                    ? `↑ ${names[d.index]}`
                    : `${names[d.index]} ↓`;
            })

        const blurredOpacity = 0.3
                
        nodes    
            .on("pointerenter", function(e, d){
                e.stopPropagation()                
                nodes.filter(dNode => dNode.index !== d.index).style("opacity", blurredOpacity)
                links.filter(dLink => dLink.source.index !== d.index && dLink.target.index !== d.index)
                    .style("opacity", blurredOpacity)
                    
                const sourceLinks = links.filter(dLink => 
                    dLink.target.index === d.index && dLink.source.index !== d.index)
                const targetLinks = links.filter(dLink => 
                    dLink.source.index === d.index && dLink.target.index !== d.index)
                const selfLink = links.filter(dLink => 
                    dLink.source.index === d.index && dLink.target.index === d.index)
                const sourceData = sourceLinks.data()
                const targetData = targetLinks.data()
                const selfData = selfLink.data()
                const inValues = sourceData.reduce((acc, curr) => {
                    return acc + curr.target.value
                }, 0)
                const outValues = targetData.reduce((acc, curr) => {                    
                    return acc + curr.source.value
                }, 0)
                const selfValues = selfData.reduce((acc, curr) => {
                    return acc + curr.source.value
                }, 0)                
                
                tooltip.style("opacity", 1)
                
                const name = names[d.index]
                tooltip.select('p.name').style("display", "block").text(name)
                tooltip.select('p.value1').style("display", "flex")
                tooltip.select('p.value1 span.label')
                    .text('inflows: ')
                tooltip.select('p.value1 span.value')
                    .text(`${prefix}${formatNum(inValues)}${suffix}`)

                tooltip.select('p.value2').style("display", "flex")
                tooltip.select('p.value2 span.label')
                    .text('outflows: ')
                tooltip.select('p.value2 span.value')
                    .text(`${prefix}${formatNum(outValues)}${suffix}`)
                    
                tooltip.select('p.selfValue').style("display", "flex")
                tooltip.select('p.selfValue span.label')
                    .text('internal: ')
                tooltip.select('p.selfValue span.value')
                    .text(`${prefix}${formatNum(selfValues)}${suffix}`)                                                
                
            })
            .on("pointermove", (e, d)=>{                
                moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
            })
            .on("pointerleave", function(e, d){                
                nodes.filter(dNode => dNode.index !== d.index).style("opacity", 1)
                links.style("opacity", 1)

                tooltip.style("opacity", 0)
            })
        
        links
            .on("pointerenter", function(e, d){
                e.stopPropagation()
                nodes.filter(dNode => dNode.index !== d.source.index && dNode.index !== d.target.index)
                    .style("opacity", blurredOpacity)
                links.filter(dLink => dLink.source.index !== d.source.index || dLink.target.index !== d.target.index)
                    .style("opacity", blurredOpacity)

                tooltip.style("opacity", 1)                
                                                
                const sourceName = names[d.source.index];
                const targetName = names[d.target.index];                
                const sourceValue = `${prefix}${formatNum(d.source.value)}${suffix}`
                const targetValue = `${prefix}${formatNum(d.target.value)}${suffix}`
                const value = `
                    ${prefix}
                    ${formatNum(d.source.value - d.target.value)}
                    ${suffix}
                ` 
                               
                if(sourceName === targetName){
                    tooltip.select('p.name').style("display", "block")
                        .text(`${sourceName} (internal): ${sourceValue}`)
                    tooltip.select('p.value1').style("display", "none")
                    tooltip.select('p.value2').style("display", "none")
                    tooltip.select('p.selfValue').style("display", "none")
                }else{
                    tooltip.select('p.name').style("display", "none")
                    tooltip.select('p.value1').style("display", "flex")
                    tooltip.select('p.value1 span.label').text(`${sourceName} → ${targetName}:`)
                    tooltip.select('p.value1 span.value').text(`${sourceValue}`)

                    tooltip.select('p.value2').style("display", "flex")
                    tooltip.select('p.value2 span.label').text(`${targetName} → ${sourceName}:`)
                    tooltip.select('p.value2 span.value').text(`${targetValue}`)

                    tooltip.select('p.selfValue').style("display", "flex")
                    tooltip.select('p.selfValue span.label').text(`Total ${sourceName} → ${targetName}:`)
                    tooltip.select('p.selfValue span.value').text(`${value}`)                                            
                }                                                   
                               
            })
            .on("pointermove", (e, d)=>{                
                moveTooltip(tooltip, {e, svg:svgNode as SVGSVGElement })
            })
            .on("pointerleave", function(e, d){                
                nodes.filter(dNode => dNode.index !== d.source.index && dNode.index !== d.target.index)
                    .style("opacity", 1)
                links.filter(dLink => dLink.source.index !== d.source.index || dLink.target.index !== d.target.index)
                    .style("opacity", 1)

                tooltip.style("opacity", 0)
            });
        
    }, [matrixData, width, height,  {prefix, suffix, formatType}]);
    
    return (
        <div 
            ref={ref} 
            style={{ width, height, display:'flex', flexDirection:'column' }}
        >            
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column", position: "relative",}}>         
                <svg                
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}
                    style={{}}
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <g className="plot-area">
                        
                    </g>                        
                </svg>            
                
                <Tooltip>
                    <p className='name' 
                        style={{
                            fontWeight: 700, margin: "3px", fontSize: "13px", color: "wheat", 
                            textAlign:"center"
                        }}
                    >
                        Tooltip
                    </p>
                    <p className='value1' 
                        style={{
                            fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                            display:"flex", }}>
                        <span className='label' style={{ flex: 1, textAlign:"left", whiteSpace: 'nowrap' }} />
                        <span className='value' style={{ flex: 1, textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
                    </p>
                    <p className='value2' 
                        style={{
                            fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                            display:"flex"}}>                        
                        <span className='label' style={{ flex: 1, textAlign:"left", whiteSpace: 'nowrap' }} />
                        <span className='value' style={{ flex: 1, textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
                    </p>
                    <p className='selfValue' 
                        style={{
                            fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                            display:"flex"}}>
                        <span className='label' style={{ flex: 1, textAlign:"left", whiteSpace: 'nowrap' }} />
                        <span className='value' style={{ flex: 1, textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
                    </p>
                </Tooltip>
            </div> 
        </div>
    );
}