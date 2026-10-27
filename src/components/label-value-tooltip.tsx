import React from "react"
import { Tooltip } from "./tooltip"

type tooltipProps = {
    roundMarker?: boolean;
}
export const LabelValueTooltip = ({ roundMarker = false }: tooltipProps) => (
    <Tooltip>
        <p className='label' 
            style={{
                fontWeight: 600, margin: "3px", fontSize: "12px", color: "wheat", 
                display:"flex", justifyContent: "center", alignItems:"center", gap: 3,
                borderBottom: "0.5px solid wheat"
            }}
        >
            <span className='chev' style={{width:10, height: 10, borderRadius: roundMarker?5:2}}/>
            <span 
                className='value'                             
            />
        </p>
        <p 
            className='value' 
            style={{
                fontWeight: 700, margin: "3px", fontSize: "13px", color: "wheat", 
                textAlign: "center"
            }}
        />
    </Tooltip>
)