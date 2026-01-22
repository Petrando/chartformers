import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3"
import { Tooltip, getTooltip, moveTooltip, hideTooltip  } from "../components/tooltip";
import { useD3 } from "../hooks/useD3";
import { basicFormat, cloneObj } from "../utils";
import pyramidStyles from "./population-pyramid.module.css"
import styles from './global.module.css';
import { ageRangeGroup } from "../../dev/data/population-data"
import { tooltipFormat } from "../types";
import { useParentSize } from "../hooks/useParentSize";

type PopulationPyramidProps = {
    data: ageRangeGroup[];
    tooltipFormat?: tooltipFormat;
}

export function PopulationPyramid({
        data,         
        tooltipFormat: {
            prefix = "", suffix = "", formatType = "long"
        } = { prefix: "", suffix: "", formatType: "long"}
    }:PopulationPyramidProps) {
    const [ref, parentSize] = useParentSize<HTMLDivElement>();    
    const { width, height } = parentSize;
    const [ isSorted, setIsSorted ] = useState(false)
    const [ isTotal, setIsTotal ] = useState(false)
    const [ isPercentage, setIsPercentage ] = useState(false)
        
    const chartRef = useD3<HTMLDivElement>((container)=>{
        const margin = { top: 0, right: 40, bottom: 35, left: 40 };
            
            const isMediumScreen = width > 768;

            const graphWidth = width - margin.left - margin.right
            const graphHeight = height - margin.top - margin.bottom

            let yMale = d3.scaleBand()	      
              .range([graphHeight, 0]);

            let yFemale = d3.scaleBand()	      
              .range([graphHeight, 0]);     

            let xMale = d3.scaleLinear()	
              .rangeRound([0, graphWidth/2]);
            let xFemale	= d3.scaleLinear()
              .rangeRound([graphWidth/2, graphWidth]);
      
            let xAxisMale = d3.axisBottom(xMale)
              .ticks(12)
              .tickFormat(d3.format(isPercentage?"~%":".2s"));
      
            let xAxisFemale = d3.axisBottom(xFemale)
              .ticks(12)
              .tickFormat(d3.format(".2s"));
      
            let yAxisMale = d3.axisLeft(yMale);
      
            let yAxisFemale = d3.axisRight(yFemale);

            const canvasSvg = container.select<SVGSVGElement>("svg")
            const svgNode = canvasSvg.node()
            const canvas = canvasSvg.select<SVGGElement>('.plot-area')
                .attr("fill", "steelblue")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            const tipLine = canvas.select("line.tipLine")

            function hideTipLine(){
              tipLine.attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 0)
            }

            hideTipLine()

            const tooltip = getTooltip(container as any);

            function moveTheTooltip(
                //e
            ){
              //moveTooltip(e, tooltip)
            }

            function hideTheTooltip(){              
              hideTooltip(tooltip)
            }

            canvas  
                .on("mouseout", function(){
                    hideTipLine()
                    hideTheTooltip()
                })

        }, 
        [ data, width, height, isSorted, isTotal, isPercentage ]
    )

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
                    <rect width={width} height={height} className="bgRect opacity-0" />
                    <g className="plot-area"/>
                    <line className="tipLine stroke-[#F5DEB3] stroke-1" x1="0" y1="0" x2="0" y2="0" 
                        strokeDasharray="4 1 2 3"
                    />
                </svg>
                <Tooltip />
            </div>                        
        </div>
    )
}

