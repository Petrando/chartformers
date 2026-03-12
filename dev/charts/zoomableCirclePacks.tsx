import { useState } from "react"
import { CirclePacks } from "../../src"
import { flareData, loanData1, loanData2, loanData3, loanData4, loanData4GPT } from "../data/loan-data"
import controlStyles from '../controls.module.css'

export const ZoomableCirclePacks = () => {
    const [selectedPackData, setSelectedPackData] = useState<string>("flare")
    
    const handlePackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedPackData(e.target.value)
        e.stopPropagation()
        e.preventDefault()
    }
    
    const packData = selectedPackData === "loan 1"?loanData1:
        selectedPackData === "loan 2"?loanData2:
          selectedPackData === "loan 3"?loanData3:
            selectedPackData === "loan 4"?loanData4:
              selectedPackData === "loan 4 GPT"?loanData4GPT:
                flareData
    
    const packTooltipFormat = selectedPackData.startsWith("loan")?{prefix: "US$ "}:{}
    return (
        <>
            <div id="select-pack-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-pack-data">Choose pack data:</label>
                <select id="choose-pack-data" value={selectedPackData} onChange={handlePackChange}>              
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
                  
                  <CirclePacks data={packData} tooltipFormat={packTooltipFormat} />
            </div>
        </>
    )
}