import React, {FunctionComponent} from 'react'
import * as d3 from 'd3';
import { getMouseYInData } from '../utils';
import styles from "./tooltip.module.css"

type ITooltip = {
    pCount?:number;
}

export const Tooltip:FunctionComponent<ITooltip> = ({pCount}) => {
    return (
        <div id="tooltip" className={`${styles.tooltip}`}>
            {
                !pCount &&
                    <p className={`top-label ${styles["text-small"]}`} />
            }
            {
                pCount === 2 &&
                    <>
                        <p className={`top-label ${styles["text-small"]}`} />
                        <p className={`bottom-label ${styles["text-small"]}`} />
                    </>
            }
            {
                (pCount === 3 || 4) &&
                <>
                    <p className={`title ${styles.title}`} />
                    <p className={`top-label ${styles["right-label"]}`} />
                    <p className={`bottom-label ${styles["right-label"]}`} />
                </>
            }
            {
                pCount === 4 &&
                    <p className={`small-text ${styles["right-label"]} ${styles["small-text"]}`} />
            }
        </div>
    )
}

export const SankeyTooltip:FunctionComponent = () => {

    return (
        <div id="sankey-tooltip">
            <p className="title font-semibold md-font-bold text-center" />
            <p className="top-label text-xs md-text-sm font-semibold text-right" />
            <p className="below-label text-xs md-text-sm font-semibold text-right" />
            <p className="balance-label text-xs md-text-sm font-semibold text-right" />
            <p className="focus-encourage text-11 md-text-12 italic font-semibold text-center">
                Klik untuk mengubah
            </p>
        </div>
    )
}

//Below are NOT react function components!
export const getTooltip = (svg:d3.Selection<(SVGAElement | HTMLDivElement), any, any, any>, id="tooltip") => {
    const tooltip = svg.select(`#${id}`)
        .style("pointer-events", "none")
        .style("position", "fixed")
        .style("left", "auto").style("top", "auto").style("bottom", "auto").style("right", "auto")
        .style("padding", "8px 5px")
        .style("max-width", "200px")
        .style("opacity", 0);

    return tooltip
}
//WARNING : still using any
type PositioningProps = {
    e: MouseEvent;
    svg: SVGSVGElement; 
    yScale: d3.ScaleLinear<number, number>;
}

export function moveTooltip(tooltip:any, positionProps:PositioningProps){
    const { e, svg, yScale } = positionProps;
    const { pixelY } = getMouseYInData(e, svg, yScale)
    const position = pixelY < 100?"bottom":"top"
    const { offsetWidth, offsetHeight } = tooltip.node() || {};
              
    const clientWidth = typeof document !== 'undefined'?document.documentElement.clientWidth:0
    const baseXPos =  e.x - (offsetWidth/2); 

    let xPos = 0;
    if(baseXPos < 0){//too much to the left....
        xPos = 0;
    }
    else if(baseXPos + offsetWidth > clientWidth){//too much to the right....
        const difference =  (baseXPos + offsetWidth) - clientWidth;
      xPos = baseXPos - difference;
    }
    else{
        xPos = baseXPos;
    }
    
    const tooltipClass = position === "top"?styles["tooltip--arrow-down"]:styles["tooltip--arrow-up"]
    tooltip
        .attr("class", `${styles.tooltip} ${tooltipClass}`)
        .style("left", xPos + "px")
        .style("top", 
            position === "top"?
                (e.y - (offsetHeight + 20))  + "px":
                (e.y + 30)  + "px")                
}

export function moveSankeyTooltip(e:any, tooltip:any){
    const { offsetWidth, offsetHeight } = tooltip.node() || {};
              
    const clientWidth = document.documentElement.clientWidth
    const baseXPos =  e.x - (offsetWidth/2); 

    let xPos = 0;
    if(baseXPos < 0){//too much to the left....
        xPos = 0;
    }
    else if(baseXPos + offsetWidth > clientWidth){//too much to the right....
        const difference =  (baseXPos + offsetWidth) - clientWidth;
      xPos = baseXPos - difference;
    }
    else{
        xPos = baseXPos;
    }
    tooltip.style("left", xPos + "px")
        .attr("class", `${styles.tooltip} ${styles["tooltip--arrow-down"]}`)
        .style("top", (e.y - (offsetHeight+ 10))  + "px");//put a little 10px top margin...
}

export function hideTooltip(tooltip:any){              

    tooltip.style("opacity", 0)
}