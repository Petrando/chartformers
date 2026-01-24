import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3"
import { Tooltip, getTooltip, tooltipMove, hideTooltip  } from "../components/tooltip";
import { useD3 } from "../hooks/useD3";
import { basicFormat, cloneObj } from "../utils";
import pyramidStyles from "./population-pyramid.module.css"
import styles from './global.module.css';
import { ageRangeGroup } from "../types"
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

    const animDuration = 500

    useEffect(()=>{
        if(isPercentage){ 
            setIsSorted(false)
        }
        setIsTotal(isPercentage)        
    }, [isPercentage])

    const isMediumScreen = width > 576
    const controls = (
        <div             
            className={`${styles[isMediumScreen?"controls-container":"controls-container-sm"]}`}
        >
            <label 
                className={`${styles["controls-label"]}  ${isPercentage?styles.disabled:""}`} 
                style={{paddingRight: '12px'}}
            >
                <input 
                    type="checkbox" 
                    className={`${styles["controls-checkbox"]}`} 
                    checked={isSorted}
                    onChange={(e) => setIsSorted(e.target.checked)}
                    disabled={isPercentage}
                />
                    Sort
            </label>
            <label 
                className={`${styles["controls-label"]} ${isPercentage?styles.disabled:""}`}             
                style={{paddingRight: '12px'}}                
            >
                <input 
                    type="checkbox" 
                    className={styles["controls-checkbox"]} 
                    checked={isTotal}
                    onChange={(e) => setIsTotal(e.target.checked)}
                    disabled={isPercentage}
                />
                    By Total
            </label>
            <label className={styles["controls-label"]} style={{paddingRight: '12px'}}>
                <input 
                    type="checkbox" 
                    className={styles["controls-checkbox"]} 
                    checked={isPercentage}
                    onChange={(e) => setIsPercentage(e.target.checked)}
                />
                    By Percentage
            </label>            
        </div>
    );
        
    const chartRef = useD3<HTMLDivElement>((container)=>{
            if(width === 0 || height === 0){
                return
            }
            const margin = { top: 35, right: 40, bottom: 35, left: 40 };
            
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
              .tickSize(-graphHeight)
              .tickFormat(d3.format(isPercentage?"~%":".2s"));
      
            let xAxisFemale = d3.axisBottom(xFemale)
              .ticks(12)
              .tickSize(-graphHeight)
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

            canvasSvg.select("rect.bgRect")
                .on("mouseover", function(){
                    hideTipLine()
                    hideTheTooltip()
                })
                .on("mousemove", function(){
                    hideTipLine()
                    hideTheTooltip()
                })

            if(canvas.select('g.yMale.axis').node() === null){
                canvas.append("g")	
                    .attr("class", `yMale axis ${pyramidStyles["value-axis"]}`)                      
                    .call(yAxisMale)
                    .attr("pointer-events", "none"); 
            }    
                
            if(canvas.select('g.xMale.axis').node() === null){
                canvas.append("g")
                    .attr("class", `xMale axis ${pyramidStyles["value-axis"]}`)
                    .attr("transform", "translate(0," + graphHeight + ")")
                    .call(xAxisMale)
                    .attr("pointer-events", "none")
                    .selectAll(".tick")
                    .filter(d => d === 0)
                    .select("line")
                    .remove();	 
            }                    
            
            if(canvas.select('g.yFemale.axis').node() === null){
                canvas.append("g")	
                    .attr("class", `yFemale axis ${pyramidStyles["value-axis"]}`)
                    .attr("transform", "translate(" + graphWidth + ",0)")            
                    .call(yAxisFemale)
                    .attr("pointer-events", "none");  
            }    
                
            if(canvas.select('g.xFemale.axis').node() === null){
                canvas.append("g")
                    .attr("class", `xFemale axis ${pyramidStyles["value-axis"]}`)
                    .attr("transform", "translate(0," + graphHeight + ")")
                    .call(xAxisFemale)
                    .attr("pointer-events", "none")
                    .selectAll(".tick")
                    .filter(d => d === 0)
                    .select("line")
                    .remove();  
            }

            const populationData = cloneObj(data);

            const genders: Array<keyof ageRangeGroup> = ['male', 'female'];

            type totalDataType = {
                totalPeople: number;
                totalMale: number;
                totalFemale: number;
            }
            
            const totalData = populationData.reduce((acc:totalDataType, curr: ageRangeGroup)=>{
                curr["male"]=+curr["male"]
                curr["female"]=+curr["female"]
                curr.Total = curr["male"] + curr["female"]

                return {totalPeople:acc.totalPeople + curr["male"] + curr["female"], 
                    totalMale:acc.totalMale + curr["male"], totalFemale:acc.totalFemale + curr["female"]}
            }, {totalPeople:0, totalMale:0, totalFemale:0})

            const { totalPeople, totalMale, totalFemale } = totalData

            const stack = d3.stack<ageRangeGroup>()
                  .keys(genders)
                  .order(d3.stackOrderNone)
                  .offset(d3.stackOffsetNone);
      
            const layers = stack(populationData);            

            const showAllAxis = (isPercentage || isTotal)?false:true

            const totalMax = d3.max(layers[0], function(d){return d.data.Total;}) ?? 0
      
            const maleMax = d3.max(layers[0], function(d){return d.data.male;}) ?? 0;
            const maleSum = d3.sum(layers[0], function(d){return d.data.male;});
            const femaleMax = d3.max(layers[1], function(d){return d.data.female;}) ?? 0;
            const femaleSum = d3.sum(layers[1], function(d){return d.data.female;});
            const totalPopulation = maleSum + femaleSum;
            const maxPopulation = showAllAxis?Math.max(maleMax, femaleMax):totalMax;
            
            const setupYAxises = (
                canvas: d3.Selection<SVGGElement, unknown, null, undefined>, 
                ageRanges: string[]) => {
                                                    
                const yMaleDomain: string[] = layers[0].sort(
                    isSorted? 
                        function(a, b) { 
                            const bValue = isTotal?(b.data.Total ?? 0):b.data.male
                            const aValue = isTotal?(a.data.Total ?? 0):a.data.male                            
                            return bValue - aValue; 
                        } : 
                        function(a, b) {                             
                            return ageRanges.indexOf(a.data.ageRange + "") - ageRanges.indexOf(b.data.ageRange + ""); 
                    })
                    .map(function(d) { return d.data.ageRange + ""; })
              
                yMale.domain(yMaleDomain)

                const yFemaleDomain: string[] = layers[0].sort(
                    isSorted? 
                        function(a, b) { 
                            const bValue = isTotal?(b.data.Total ?? 0):b.data.male
                            const aValue = isTotal?(a.data.Total ?? 0):a.data.male                            
                            return bValue - aValue; 
                        } : 
                        function(a, b) {                             
                            return ageRanges.indexOf(a.data.ageRange + "") - ageRanges.indexOf(b.data.ageRange + ""); 
                    })
                    .map(function(d) { return d.data.ageRange + ""; })
              
                yFemale.domain(yFemaleDomain);

                canvas.select<SVGGElement>(".yMale.axis")
                      .transition().duration(animDuration)                                  
                    .call(yAxisMale);

                canvas.select<SVGGElement>(".yFemale.axis")
                        .transition().duration(animDuration)
                    .attr("transform", "translate(" + graphWidth + ", 0)")
                    .call(yAxisFemale)
                    .style("opacity", showAllAxis);
              
            }

            const setupXAxises = (
                canvas: d3.Selection<SVGGElement, unknown, null, undefined>,  
                xMale: d3.ScaleLinear<number, number>, 
                xAxisMale: d3.Axis<d3.NumberValue>, 
                xFemale: d3.ScaleLinear<number, number>, 
                xAxisFemale: d3.Axis<d3.NumberValue>, 
                maxPopulation: number) => {

                const xMaleDomain = !showAllAxis?[0, isPercentage?1:maxPopulation]:[maxPopulation, 0]
                const xMaleWidth = !showAllAxis?graphWidth:graphWidth/2

                xMale.domain([...xMaleDomain]).rangeRound([0, xMaleWidth]).nice();

                const xMaleAxisGroup = canvas.select<SVGGElement>(".xMale.axis")
                        .transition().duration(animDuration)
                        .attr("transform", "translate(0," + graphHeight + ")")
                    .call(xAxisMale)
                        .selectAll("text")                  
                        .style("text-anchor", !isMediumScreen?"end":"center")
                        .attr("dx", function(d){                                            
                            return !isMediumScreen?"-.8em":0
                        })
                        .attr("dy", !isMediumScreen?".15em":".75em")
                        .attr("transform", !isMediumScreen?"rotate(-45)":"rotate(0)");

                xFemale.domain([0, maxPopulation]).nice();

                const xFemaleAxisGroup = canvas.select<SVGGElement>(".xFemale.axis")		
                        .transition().duration(animDuration)
                        .attr("transform", `translate(0,${graphHeight})`)
                    .call(xAxisFemale)
                        .style("opacity", showAllAxis?1:0)
                        .selectAll("text")                      
                        .style("text-anchor", !isMediumScreen?"end":"center")
                        .attr("dx", function(d){                                                
                            return !isMediumScreen?"-.8em":0
                        })
                        .attr("dy", !isMediumScreen?".15em":".75em")
                        .attr("transform", !isMediumScreen?"rotate(-45)":"rotate(0)");
            }

            let ageRanges: string[] = [];
            if(ageRanges.length === 0){
                ageRanges = populationData.map(function(d:ageRangeGroup){return d.ageRange;});	        		   			    			  
            }

            setupYAxises(canvas, ageRanges);
            setupXAxises(canvas, xMale, xAxisMale, xFemale, xAxisFemale, maxPopulation);

            const maleStyles = isTotal?pyramidStyles.maleTotal:pyramidStyles.male

            const maleStrokeDashArray = (d: d3.SeriesPoint<ageRangeGroup>) => {
                if(!isTotal){
                    return "none"
                }
                const baseWidth = xMale(d[1]) - xMale(d[0])
                const rectWidth = isNaN(baseWidth)?0:baseWidth
                const rectHeight = yMale.bandwidth()
                
                return `${rectWidth} ${rectHeight} ${rectWidth + rectHeight}`
            }

            canvas.selectAll<SVGGElement, d3.SeriesPoint<ageRangeGroup>>(".maleBars")		
                .data(layers[0], function(d){return d.data.ageRange;})
                .join(
                    enter => enter.append("rect")
                        .attr("class", "maleBars" + " " + maleStyles)
                        .attr("fill", "#0099ff")
                        .attr("width", 0)
                        .attr("x", graphWidth/2)
                        .attr("y", function(d){return yMale(d.data.ageRange) ?? 0;})
                        .attr("height", yMale.bandwidth())      
                        .attr("stroke-dasharray", maleStrokeDashArray)
                        .call(enter =>
                            enter
                                    .transition().duration(animDuration)
                                .attr("x", function(d){
                                    if(!showAllAxis){
                                        return xMale(0)
                                    }
                                    return xMale(d[1]);
                                })
                                .attr("width", function(d,i){
                                    if(!showAllAxis){
                                        const d0 = !isPercentage?d[0]:(d[0]/d.data.Total!)
                                        const d1 = !isPercentage?d[1]:(d[1]/d.data.Total!)
                                        const baseWidth = xMale(d1) - xMale(d0)
                                        return isNaN(baseWidth)?0:baseWidth 
                                    }
                                    const baseWidth = xMale(d[0]) - xMale(d[1])
                                    return isNaN(baseWidth)?0:baseWidth 
                                })
                            )                                                
                    ,
                    undefined,
                    exit=>exit.remove()
                )
                .on('mouseover', function(d,i){                                      
                    if(isTotal){
                        canvas.selectAll<SVGGElement, d3.SeriesPoint<ageRangeGroup>>(".femaleBars")
                            .filter(d => d.data.ageRange === i.data.ageRange)                      
                            .attr("class", "femaleBars" + " " + pyramidStyles.totalFemale)
                    }                
                
                    canvas.select('g.yMale.axis').selectAll('text')
                        .filter(function(dText){return i.data.ageRange===dText})
                    .style('font-weight', 'bold');   
                  
                    //showTipLine("male", i)
                    showTooltip("male", i)
                })
                .on("mousemove", function(e){
                    tooltipMove(e, tooltip)                    
                })
                .on('mouseout', function(d, i){      
                    
                    canvas.select('g.yMale.axis')
                        .selectAll('text')
                        .filter(function(dText){return i.data.ageRange === dText})
                        .style('font-weight', 'normal');                       
                    
                    if(isTotal){
                        canvas.selectAll<SVGGElement, d3.SeriesPoint<ageRangeGroup>>(".femaleBars")
                            .filter(d => d.data.ageRange === i.data.ageRange)                    
                            .attr("class", "femaleBars" + " " + pyramidStyles.femaleTotal)
                    }
                    hideTipLine()
                    hideTheTooltip()
                })
                .attr("class", "maleBars" + " " + maleStyles)
                    .transition().duration(animDuration)
                .attr("stroke-dasharray", maleStrokeDashArray)
                .attr("y", function(d,i){return yMale(d.data.ageRange) ?? 0;})
                .attr("height", yMale.bandwidth())
                .attr("x", function(d,i){
                    if(!showAllAxis){                     
                        return xMale(0)
                    }                    
                    return xMale(d[1])
                })		                
                .attr("width", function(d,i){                
                    if(!showAllAxis){
                        const d0 = !isPercentage?d[0]:(d[0]/d.data.Total!)
                        const d1 = !isPercentage?d[1]:(d[1]/d.data.Total!)
                        
                        const baseWidth = xMale(d1) - xMale(d0)                        
                        return isNaN(baseWidth)?0:baseWidth 
                    }
                    const baseWidth = xMale(d[0]) - xMale(d[1])
                    return isNaN(baseWidth)?0:baseWidth 
                });

            const femaleStyles = isTotal?pyramidStyles.femaleTotal:pyramidStyles.female

            const femaleStrokeDashArray = (d: d3.SeriesPoint<ageRangeGroup>) => {
                if(!isTotal){
                    return "none"
                }
                const baseWidth = xMale(d[1]) - xMale(d[0])
                const rectWidth = isNaN(baseWidth)?0:baseWidth
                const rectHeight = yFemale.bandwidth()
                
                return `${rectWidth + rectHeight + rectWidth} ${rectHeight}`
            }

            canvas.selectAll<SVGGElement, d3.SeriesPoint<ageRangeGroup>>(".femaleBars")		
                .data(layers[1], function(d){return d.data.ageRange;})
                .join(
                    enter => enter.append("rect")
                        .attr("class", "femaleBars" + " " + femaleStyles)
                        .attr("stroke-dasharray", femaleStrokeDashArray)
                        .attr("fill", "#ff6699")                                                      
                        .attr("width", 0)
                        .attr("x", function(d, i){
                            if(!showAllAxis){
                                const d0 = !isPercentage?d[0]:(d[0]/d.data.Total!)
                                return xMale(d0)
                            }
                            return graphWidth/2
                        })
                        .attr("y", function(d,i){
                            const yAxisScale = showAllAxis?yFemale:yMale
                            return yAxisScale(d.data.ageRange) ?? 0;
                        })
                        .attr("height", yFemale.bandwidth())
                        .call(enter =>
                            enter
                                    .transition().duration(animDuration)
                                .attr("width", function(d,i){
                                    if(!showAllAxis){
                                        const d0 = !isPercentage?d[0]:(d[0]/d.data.Total!)
                                        const d1 = !isPercentage?d[1]:(d[1]/d.data.Total!)
                                        const baseWidth = xMale(d1) - xMale(d0)
                                        return isNaN(baseWidth)?0:baseWidth 
                                    }
                                    const baseWidth = xFemale(d[1]) - xFemale(d[0])
                                    return isNaN(baseWidth)?0:baseWidth 
                                })
                            )                                                
                    ,
                    undefined,
                    exit=>exit.remove()
                )
                .on('mouseover', function(d,i){                               

                    canvas.select('g.yFemale.axis')
                        .selectAll('text').filter(function(dText){return i.data.ageRange===dText})
                        .style('font-weight', 'bold');  

                        //showTipLine("female", i)

                    if(isTotal){                  
                        canvas.selectAll<SVGGElement, d3.SeriesPoint<ageRangeGroup>>(".maleBars")
                            .filter(d => d.data.ageRange === i.data.ageRange)                                      
                            .attr("class", "maleBars" + " " + pyramidStyles.totalMale)
                    }

                    showTooltip("female", i)
                })
                .on("mousemove", function(e){
                    tooltipMove(e, tooltip)
                })
                .on('mouseout', function(d,i){
                    canvas.select('g.yFemale.axis')
                        .selectAll('text')
                        .filter(function(dText){return i.data.ageRange===dText})
                        .style('font-weight', 'normal');                                  

                    if(isTotal){
                        canvas.selectAll<SVGGElement, d3.SeriesPoint<ageRangeGroup>>(".maleBars")
                            .filter(d => d.data.ageRange === i.data.ageRange)                    
                            .attr("class", "maleBars" + " " + pyramidStyles.maleTotal)
                    }

                    hideTipLine()
                    hideTheTooltip()
                })
                .attr("class", "femaleBars" + " " + femaleStyles)                
                    .transition().duration(animDuration)
                .attr("stroke-dasharray", femaleStrokeDashArray)
                .attr("y", function(d,i){
                    const yAxisScale = showAllAxis?yFemale:yMale
                    return yAxisScale(d.data.ageRange) ?? 0;
                })
                .attr("height", yFemale.bandwidth())
                .attr("x", function(d, i){
                    if(!showAllAxis){
                        const d0 = !isPercentage?d[0]:(d[0]/d.data.Total!)                                                
                        return xMale(d0)
                    }                    
                    return graphWidth/2
                })		
                .attr("width", function(d,i){                
                    if(!showAllAxis){
                        const d0 = !isPercentage?d[0]:(d[0]/d.data.Total!)
                        const d1 = !isPercentage?d[1]:(d[1]/d.data.Total!)
                        const baseWidth = xMale(d1) - xMale(d0)
                        return isNaN(baseWidth)?0:baseWidth 
                    }
                    const baseWidth = xFemale(d[1]) - xFemale(d[0])
                    return isNaN(baseWidth)?0:baseWidth 
                })

            function showTooltip(gender: "male" | "female", d: d3.SeriesPoint<ageRangeGroup>){
                tooltip.style("opacity", 1)
                    .select("p").text(function(){
                        if(isTotal && !isPercentage){
                            return `${d3.format(",d")(d.data.Total!)} people`
                        }
                        if(isPercentage){
                            const myPercentage = d.data[gender]/d.data.Total!
                            return `${d3.format("~%")(myPercentage)} (${d3.format(",d")(d.data[gender])} 
                                of ${d3.format(",d")(d.data.Total!)} people)`
                        }                        
                        return `${gender} ${d3.format(",d")(d.data[gender])} people`
                    })
            }
                              
              
        }, 
        [ data, width, height, isSorted, isTotal, isPercentage ]
    )

    return (
        <div 
            ref={ref}
            style={{ width, height, display:'flex', flexDirection:'column' }}
        >
            { controls}
            <div
                ref={chartRef} 
                className={`${styles["fill-container"]}`}
                style={{ display:"flex", flexDirection:"column", position: "relative",}}>         
                <svg                
                    className={`${styles["chart-svg"]} ${styles["fill-container"]}`}
                    style={{}}
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <rect 
                        width={width} height={height} 
                        className={`bgRect opacity-0`} 
                        style={{fill: "white"}} />
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

