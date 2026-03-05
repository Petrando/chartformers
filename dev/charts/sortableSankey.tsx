import { useState } from "react"
import { Sankey } from "../../src"
import { brexitVoting, energyData, flightData, flightData1 } from "../data/constants"
import controlStyles from '../controls.module.css'

export const SortableSankey = () => {
    const [selectedSankeyData, setSelectedSankeyData] = useState<string>("brexit voting")
    
    const handleSankeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSankeyData(e.target.value)
        e.stopPropagation()
        e.preventDefault()
    }

    const sankeyData = selectedSankeyData === "flight data"?flightData:
        selectedSankeyData === "flight data 1"?flightData1:      
            selectedSankeyData === "energy data"?energyData:
                brexitVoting
    
    const sankeyFormat = selectedSankeyData.startsWith("flight data")?{prefix: " flights: "}:          
        selectedSankeyData === "energy data"?{prefix: " ", suffix: " KWh"}:
            {prefix: " votes: "}

    return (
        <>
            <div id="select-sankey-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-sankey-data">Choose sankey data:</label>
                <select id="choose-sankey-data" value={selectedSankeyData} onChange={handleSankeyChange}>              
                {
                    ["brexit voting", "flight data", "flight data 1", "energy data"].map(s => (
                    <option key={s} value={s}>{s}</option>
                    ))
                }
                </select>
            </div>  
            <div style={{
                width: '80vw',
                height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
                marginTop: '20px', border: '2px solid #047857'}}>
                    <Sankey data={sankeyData} tooltipFormat={sankeyFormat} />
            </div>
        </>
    )
}