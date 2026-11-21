import React from "react";
import { type BaseType, color, type Selection, } from "d3";
import { bBox } from "../../types";

export const HoverShade = () => (
    <rect id="hoverShade"
        style={{
            stroke: color("#0d9488")?.darker(1).toString(),
            strokeWidth: 2,
            fill: "none",                                
            pointerEvents: "none"
        }}                            
    />
)

export const positionHoverShade  = ( 
    hoverShade: Selection<BaseType, unknown, null, undefined>,
    bBox: DOMRect | undefined,
    marginLeft: number, marginTop: number
) => {
    hoverShade
        .style("opacity", 1)
        .attr("x", (bBox?.x ?? 0) + marginLeft)
        .attr("y", (bBox?.y ?? 0) + marginTop)
        .attr("width", bBox?.width ?? 0)
        .attr("height", bBox?.height ?? 0)  
}