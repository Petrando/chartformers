import React, { useState, useEffect, useDeferredValue} from 'react';
import { LayeredData } from './types';
import stackedBarStyles from './stacked-barchart.module.css';

type warningModalProps = {
    canShow?: boolean;
    data: LayeredData[];
    width: number;
    height: number
}
export const WarningModal = ({canShow = true, data, width, height}: warningModalProps) => {
    const [displayNegativeWarning, setDisplayNegativeWarning] = useState(false)

    const dataWithNegative = data.some(d => {
        for (const [key, value] of Object.entries(d)) {
            if(key !== "label" && key !== "total"){
                if(typeof value === "number" && value < 0){
                    return true
                }
            }
        }
        return false
    })
    const previousData = useDeferredValue(data)

    useEffect(()=>{
        if(data !== previousData && dataWithNegative){            
            setDisplayNegativeWarning(true)
        }
    }, [data, previousData, dataWithNegative])

    return (
        <div 
            className={`
                ${stackedBarStyles["modal-container"]}
                ${stackedBarStyles[canShow && displayNegativeWarning?"show":"hide"]}
            `}
            style={{width, height}}
        >
            <div 
                className={`${stackedBarStyles["modal-warning"]}`}                            
            >
                <div className={`${stackedBarStyles["modal-header"]}`}>
                    <div className="modal-icon" aria-hidden="true">
                        ⚠️
                    </div>
                    <h2 className={`${stackedBarStyles["modal-title"]}`}>Warning</h2>
                </div>
                
                <div className={`${stackedBarStyles["modal-body"]}`}>
                    <p className={`${stackedBarStyles["modal-text"]}`}>
                        Data with negative value will not be properly rendered as percentage bar chart
                    </p>
                </div>

                <div className={`${stackedBarStyles["modal-footer"]}`}>
                    <button 
                        className={`${stackedBarStyles["modal-btn"]} ${stackedBarStyles["modal-btn-ok"]}`}
                        onClick={()=>{setDisplayNegativeWarning(false)}}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}