import React from "react";
import { type Selection } from "d3";
import { Tooltip as GlobalTooltip } from "../../components/tooltip";
import styles from "../../components/tooltip.module.css"
import { type marginType } from "../../types";

type tooltipProps = {
    totalLabel?: string;
}

export const Tooltip = ({ totalLabel = "of total"}: tooltipProps) =>(
    <GlobalTooltip asAbsolute>
        <p className='label' 
            style={{
                fontWeight: 700, margin: "3px", fontSize: "14px", color: "wheat", 
                textAlign: "center", borderBottom: "1px solid wheat"                                    
            }}
        />
        <p 
            className='layer' 
            style={{
                fontWeight: 700, margin: "3px", marginTop: 0, fontSize: "13px", color: "wheat", 
                display:"flex", justifyContent: "flex-end", alignItems: "center", 
                gap: 2
            }}
        >
            <span 
                className='label'
                style={{
                    display:"flex", justifyContent: "flex-end", alignItems: "center", 
                    gap: 1.5
                }}
            >
                <span 
                    className='chev'
                    style={{width:10, height: 10, borderRadius: 2}}
                />
                <span className='label' />
            </span>
            <span 
                className='value'                                    
                style={{textAlign:'right'}} />
        </p>
        <p 
            className='total'
            style={{
                fontWeight: 600, margin: "3px", marginTop: 0, fontSize: "13px", color: "wheat", 
                display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2
            }}
        >
            {totalLabel}
            <span className='value' style={{fontWeight: 700}} />
        </p>
    </GlobalTooltip>
)

type dimensions = {
    x: number, y: number, width: number, height: number            
}

export const positionTooltip = (
    tooltip: Selection<(SVGAElement | HTMLDivElement), any, any, any>,
    orientation: "vertical" | "horizontal",
    mode: "stacked" | "grouped",
    margin: marginType,
    verticalDimensions: dimensions,
    horizontalDimensions: dimensions,     
) => {
    tooltip.style("opacity", 1)//.style("display", "block")
    const tooltipNode = tooltip?.node();
    if (!tooltipNode) return;

    const tipW = (tooltipNode as HTMLElement).offsetWidth;
    const tipH = (tooltipNode as HTMLElement).offsetHeight;

    const gap = 12
    let left, top;

    if(orientation === "horizontal") {                
        
        const barwidth = horizontalDimensions.width//valueScaleDimension(d)            
        const endX = (margin.left ?? 0) + horizontalDimensions.x//valueScalePos(d);
        left = endX + (barwidth - tipW) / 2// + gap;
        
        const topY = (margin.top ?? 0) + horizontalDimensions.y//labelScalePos(d);
        top = topY - tipH - gap;
        const onTop = top < 0                
        if (top < 0) top = topY + horizontalDimensions.height//labelScale.bandwidth() 
            + gap
        
        tooltip
            .classed(`${styles["tooltip--arrow-up"]}`, onTop)
            .classed(`${styles["tooltip--arrow-down"]}`, !onTop)
                .transition().duration(250)
            .style("left", left + "px").style("top", top + "px")                    
    } else {
                        
        const barCenterX = (margin.left ?? 0) + verticalDimensions.x + verticalDimensions.width / 2 
            //labelScalePos(d) + labelScaleBandWidth / 2;
        
        
        left = (margin.left ?? 0 ) + verticalDimensions.x + (verticalDimensions.width - tipW) / 2 
            //labelScalePos(d) + (labelScaleBandWidth - tipW)/2
        //top = (margin.top ?? 0) + verticalDimensions.y
        const barTopY = (margin.top ?? 0) + verticalDimensions.y//valueScalePos(d);
        top = barTopY - tipH - gap;

        const onTop = top < 0
        const barheight = verticalDimensions.height//valueScaleDimension(d)
        if (onTop) top = barTopY + (mode === "stacked"?barheight:0) + gap;            

        tooltip
            .classed(`${styles["tooltip--arrow-up"]}`, onTop)
            .classed(`${styles["tooltip--arrow-down"]}`, !onTop)
                .transition().duration(250)
            .style("left", left + "px").style("top", top + "px")                    
    }
                
}