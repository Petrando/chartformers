import { useState } from 'react'
import { australia, brazil, indonesia, japan, usa } from '../data/population-data'
import { PopulationPyramid } from '../../src'
import controlStyles from '../controls.module.css'

export const PopulationPyramidChart = () => {
    const [selectedPopulationData, setSelectedPopulationData] = useState<string>("indonesia")
    
    const handlePopulationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedPopulationData(e.target.value)
        e.stopPropagation()
        e.preventDefault()
    }

    const populationData = selectedPopulationData ===  "indonesia"?indonesia:
        selectedPopulationData === "australia"?australia:
            selectedPopulationData === "japan"?japan:
            selectedPopulationData === "usa"?usa:
                brazil
    return (
        <>
            <div id="select-population-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-population-data">Choose population data:</label>
                <select id="choose-population-data" 
                    value={selectedPopulationData} 
                    onChange={handlePopulationChange}
                >              
                    {
                    ["indonesia", "australia", "japan", "usa", "brazil"].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))
                    }
                </select>
            </div>
            <div style={{
                width: '80vw',
                height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
                marginTop: '20px', border: '2px solid red'}}>
                
                <PopulationPyramid data={populationData} />
            </div>
        </>
    )
}