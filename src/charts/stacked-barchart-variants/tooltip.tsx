import React from "react";
import { Tooltip as GlobalTooltip } from "../../components/tooltip";

type tooltipProps = {
    totalLabel?: string;
}
export const Tooltip = ({ totalLabel = "of total"}: tooltipProps) =>(
    <GlobalTooltip>
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