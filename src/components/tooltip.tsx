import React, {FunctionComponent, ReactNode} from 'react'
import * as d3 from 'd3';
import styles from "./tooltip.module.css"

type ITooltip = {
    pCount?:number;
    children?: ReactNode;
}

export const Tooltip:FunctionComponent<ITooltip> = ({pCount, children}) => {
    return (
        <div id="tooltip" className={`${styles.tooltip}`} style={{opacity: 0}}>
            { children }
            {
                !pCount && !children &&
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
                (pCount === 3 || pCount === 4) &&
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
export const getTooltip = (
    svg:d3.Selection<(SVGAElement | HTMLDivElement), any, any, any>, 
    id="tooltip"
) => {
    const tooltip = svg.select(`#${id}`)        
        .style("opacity", 0);

    return tooltip
}

type PositioningProps = {
    e: MouseEvent;
    svg: SVGSVGElement; 
    yScale?: d3.ScaleLinear<number, number>;
}

function getMouseYInData(
    e: MouseEvent, 
    svg: SVGSVGElement, 
    yScale?: d3.ScaleLinear<number, number>
) {
    const { top, height } = svg.getBoundingClientRect();
    const pixelY = e.clientY - top;
    return {
        pixelY,
        dataY: yScale?.invert(pixelY) ?? 0,
        svgHeight: height 
    };
}

//WARNING : still using any
export function moveTooltip(tooltip:any, positionProps:PositioningProps){
    const { e, svg, yScale } = positionProps;
    const { pixelY, svgHeight } = getMouseYInData(e, svg, yScale)
    
    const tooltipDimensions = tooltip.node()?.getBoundingClientRect()
    const tooltipHeight = tooltipDimensions.height ?? 100
    
    const tooltipBottomOverflow = (overlapTolerate:number = 0.5) => {
        const bottomPosition = pixelY + tooltipHeight
        const bottomOverlap = bottomPosition - svgHeight

        if(bottomOverlap > tooltipHeight * overlapTolerate){
            return true
        }
        return false
    }
    const overlap = tooltipBottomOverflow()
    const position = pixelY < tooltipHeight?
        (overlap?"top":"bottom"):"top"
    /*if(tooltipHeight < ((svgHeight/2) * 0.4)){
        position = pixelY < tooltipHeight?"bottom":"top"    
    }else{
        position = pixelY < (svgHeight/2)?"bottom":"top"
    }*/
    
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
        .style("left", baseXPos + "px")
        .style("top", 
            position === "top"?
                (e.y - (offsetHeight + 20))  + "px":
                (e.y + 30)  + "px")                
}

export function tooltipMove(e:any, tooltip:any){
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