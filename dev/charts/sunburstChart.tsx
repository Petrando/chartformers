import { useState } from "react"
import { Sunburst } from "../../src"
import { flareD, loan1, loan2, loan3, loan4, loan4Gpt } from "../data/hierarcy-data"
import controlStyles from '../controls.module.css'

export const SunburstChart = () => {
    const [selectedSunData, setSelectedSunData] = useState<string>("loan 1")
    
    const handleSunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSunData(e.target.value)
        e.stopPropagation()
        e.preventDefault()
    }

    const sunData = selectedSunData === "loan 1"?loan1:
        selectedSunData === "loan 2"?loan2:
            selectedSunData === "loan 3"?loan3:
            selectedSunData === "loan 4"?loan4:
                selectedSunData === "loan 4 GPT"?loan4Gpt:
                flareD
    return (
        <>
            <div id="select-sun-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-sunburst-data">Choose sunburst data:</label>
                <select id="choose-sunburst-data" value={selectedSunData} onChange={handleSunChange}>              
                    {
                    ["loan 1", "loan 2", "loan 3", "loan 4", "loan 4 GPT", "flare"].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))
                    }
                </select>
                </div>
                <div style={{
                    width: '80vw',
                    height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
                    marginTop: '20px', border: '2px solid red'}}>
                    <Sunburst data={ sunData } />
                </div>

        </>
    )
}