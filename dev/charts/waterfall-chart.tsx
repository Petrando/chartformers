import { useState } from "react";
import { WaterfallChart } from "../../src"
import { financial_bridge1, financial_bridge2, financial_bridge3, recovery_bridge, launch_expansion, 
    personal_budget1, personal_budget2, personal_budget3, personal_budget4, hr_headcount } from "../data/waterfall-data"
import controlStyles from '../controls.module.css'

export const WaterfallDiagram = () => {
    const [selectedData, setSelectedData] = useState<string>("financial");
      
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedData(e.target.value);
    };
    const waterfallData = selectedData === "financial1"?financial_bridge1:
        selectedData === "financial2"?financial_bridge2:
        selectedData === "financial3"?financial_bridge3:
        selectedData === "recovery"?recovery_bridge:
            selectedData === "launch"?launch_expansion:
                selectedData === "budget1"?personal_budget1:
                    selectedData === "budget2"?personal_budget2:
                        selectedData === "budget3"?personal_budget3:
                            selectedData === "budget4"?personal_budget4:
                                hr_headcount          

    return (
        <div>
            <div id="select-bar-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-bar-data">Choose data:</label>
                <select id="choose-bar-data" value={selectedData} onChange={handleChange}>
                    <option value="financial1">Financial Data 1</option>
                    <option value="financial2">Financial Data 2</option>
                    <option value="financial3">Financial Data 3</option>
                    <option value="recovery">Recovery Bridge</option>
                    <option value="launch">Launch Expansion</option>
                    <option value="budget1">Personel Budget 1</option>
                    <option value="budget2">Personel Budget 2</option>
                    <option value="budget3">Personel Budget 3</option>
                    <option value="budget4">Personel Budget 4</option>
                    <option value={"hr_headcount"}>HR Headcount</option>                    
                </select>
            </div>
            <div style={{width: "80vw", height: "500px", }}>                 
                <WaterfallChart data={waterfallData}   />
            </div>            
        </div>
    )
}