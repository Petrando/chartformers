import React, {useState} from 'react';
import { format, chord, descending, arc, ribbon, Chord, ChordGroup, tickStep, sum, range } from 'd3';
import { indexColor } from '../utils';
import { useLayerIndex } from '../hooks/useLayerIndex';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import styles from './global.module.css';
import { tooltipFormat, chordDatum } from '../types';

type ChordProps = {
    data: chordDatum[];    
    tooltipFormat?: tooltipFormat;
}

export function ChordDiagram({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:ChordProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;        

    const isMediumScreen = width > 576;
    // Define the controls element (checkbox)    
    
    function groupTicks(d: ChordGroup, step: number) {
        const k = (d.endAngle - d.startAngle) / d.value;
        return range(0, d.value, step).map(value => {
            return {value: value, angle: value * k + d.startAngle};
        });
    }

    const layersRef = useLayerIndex(data.map(d => d.name))
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
        
        const names = data.map(d => d.name)
        const values = data.map(d => d.values)

        const res = chord()
            .padAngle(0.05)     // padding between entities (black arc)
            .sortSubgroups(descending)
            (values)                

        const radius = Math.min(width, height)
        const r = radius * 0.4

        canvas.selectAll("linearGradient").remove();
        
        const gradients = canvas.selectAll<SVGLinearGradientElement, Chord>("linearGradient")
            .data(res).join("linearGradient")
            .attr("id", (d, i) => `chord-gradient-${i}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", d => Math.cos((d.source.startAngle + d.source.endAngle) / 2 - Math.PI/2) * r)
            .attr("y1", d => Math.sin((d.source.startAngle + d.source.endAngle) / 2 - Math.PI/2) * r)
            .attr("x2", d => Math.cos((d.target.startAngle + d.target.endAngle) / 2 - Math.PI/2) * r)
            .attr("y2", d => Math.sin((d.target.startAngle + d.target.endAngle) / 2 - Math.PI/2) * r);                        

        gradients.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d => {                            
                const sourceName = names[d.source.index]
                const colorIndex = layersRef.current.findIndex(layer => layer === sourceName)
                return indexColor(colorIndex, false)
            });

        gradients.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d => {                            
                const targetName = names[d.target.index]
                const colorIndex = layersRef.current.findIndex(layer => layer === targetName)
                return indexColor(colorIndex, false)
            });
    
        canvas.selectAll("path.link").remove()
        canvas
            .selectAll<SVGPathElement, Chord>("path.link")
            .data(res)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", ribbon<Chord, SVGPathElement>().radius(r - 10))
            .style("fill", (d, i) => `url(#chord-gradient-${i})`)
            .style("stroke", "none");

        canvas.selectAll("g.nodes").remove()
        const arcGen = arc<ChordGroup>()
            .innerRadius(r - 10)
            .outerRadius(r)

        const node = canvas
            .selectAll<SVGGElement, ChordGroup>("g.nodes")
            .data(res.groups, d => d.index)
            .enter()
            .append("g")
            .attr("class", "nodes")

        node.append("path")
            .style("fill", function(d, i){ 
                const nodeName = names[d.index]
                const colorIndex = layersRef.current.findIndex(layer => layer === nodeName)
                return indexColor(colorIndex, false)                
            })
            .style("stroke", "#a89ea9")
            .attr("d", arcGen)

        const chordTick = tickStep(0, sum(values.flat()), 100); // adjust depending on your data scale        

        const ticks = node            
            .selectAll("g.group-tick")
            .data(d => groupTicks(d, chordTick))
            .enter()
            .append("g")
            .attr("class", "group-tick")
            .attr("transform", d =>
                `rotate(${(d.angle * 180 / Math.PI - 90)}) translate(${r},0)`
            );

        ticks.append("line")
            .attr("stroke", "black")
            .attr("x2", 6);

        ticks
            .filter(d => d.value % (chordTick * 5) === 0)
            .append("text")
            .attr("x", 8)
            .attr("dy", "0.35em")
            .attr("transform", d =>
                d.angle > Math.PI ? "rotate(180) translate(-16)" : null
            )
            .style("text-anchor", d =>
                d.angle > Math.PI ? "end" : "start"
            )
            .text(d => format(".1~%")(d.value));

        node
            .select("text")
            .attr("font-weight", "bold")
            .text(function(d) {
                const thisNode = this as Element
                return thisNode.getAttribute("text-anchor") === "end"
                    ? `↑ ${names[d.index]}`
                    : `${names[d.index]} ↓`;
            });
        
        
    }, [data, width, height,  {prefix, suffix, formatType}]);
    
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
                
                <Tooltip />
            </div> 
        </div>
    );
}