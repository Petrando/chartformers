import React from "react";
import { Tooltip } from "../../components/tooltip";

export const WaterfallTooltip = () => (
    <Tooltip>
        <p className='label' 
            style={{
                fontWeight: 700, margin: "3px", fontSize: "13px", color: "wheat", 
                display:"flex",
            }}
        >
            <span className='label' style={{ flex: 1, textAlign:"left", whiteSpace: 'nowrap' }}>
                <span className='chev' />
                <span className='text' />
            </span>
            <span className='value' style={{ flex: 1, textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
        </p>
        <p className='from' 
            style={{
                fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                display: "flex", justifyContent: "flex-end"
        }}>
            <span className='label' style={{ width: "auto", textAlign:"right", whiteSpace: 'nowrap' }} />
            <span className='value' style={{ width: "auto", textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
        </p>
        <p className='to' 
            style={{
                fontWeight: "300px", margin: "3px",  fontSize: "12px", color: "wheat", 
                display: "flex", justifyContent: "flex-end"
        }}>                        
            <span className='label' style={{ width: "auto", textAlign:"right", whiteSpace: 'nowrap' }} />
            <span className='value' style={{ width: "auto", textAlign:"right", paddingLeft: 4, fontWeight: 600 }} />
        </p>                        
    </Tooltip>
)