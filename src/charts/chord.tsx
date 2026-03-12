import React, {useState} from 'react';
import { format, chord, descending, arc, ribbon, Chord } from 'd3';
import { useD3 } from '../hooks/useD3';
import { useParentSize } from '../hooks/useParentSize';
import { Tooltip, getTooltip, moveTooltip } from '../components/tooltip';
import styles from './global.module.css';
import { tooltipFormat } from '../types';

type ChordProps = {
    data: any[];    
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

        const graphWidth = width - margin - margin
        const graphHeight = height - margin - margin

        const res = chord()
            .padAngle(0.05)     // padding between entities (black arc)
            .sortSubgroups(descending)
            (data)

        const radius = Math.min(width, height)
        const r = radius * 0.4
        canvas.selectAll("g.nodes").remove()
        canvas.selectAll<SVGGElement, any>("g.nodes")
            .data(res.groups, function(d) { return d.index; })
            .enter()
            .append("g")
            .attr("class", "nodes")
            .append("path")
                .style("fill", "grey")
                .style("stroke", "black")
                .attr("d", arc<any>()
                    .innerRadius(r - 10)
                    .outerRadius(r)
                )
                
        canvas.selectAll("path.link").remove()
        canvas
            .selectAll<SVGPathElement, Chord>("path.link")
            .data(res)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", ribbon<Chord, SVGPathElement>().radius(r - 10))
            .style("fill", "#69b3a2")
            .style("stroke", "black");
        
        
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