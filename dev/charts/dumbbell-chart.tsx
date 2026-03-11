import { useState } from "react";
import { DumbbellChart } from "../../src";
import { internetPenetration_2010_2018, internetPenetration_2014_2020, internetPenetration_2015_2025, lifeExpectancy, companyRevenue } from "../data/dumbbell-data"
import controlStyles from '../controls.module.css'

export const DumbbellDiagram = () => {
    const [selectedData, setSelectedData] = useState<string>("internet1");
      
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedData(e.target.value);
    };
    const dumbbellData = selectedData === "internet1"?internetPenetration_2010_2018:
        selectedData === "internet2"?internetPenetration_2014_2020:
        selectedData === "internet3"?internetPenetration_2015_2025:
        selectedData === "life"?lifeExpectancy:
            companyRevenue
        
    return (
        <div>
            <div id="select-bar-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-bar-data">Choose data:</label>
                <select id="choose-bar-data" value={selectedData} onChange={handleChange}>
                    <option value="internet1">Internet Penetration 2010 2018</option>
                    <option value="internet2">Internet Penetration 2014 2020</option>
                    <option value="internet3">Internet Penetration 2015 2025</option>
                    <option value="life">Life Expectancy</option>
                    <option value="company">Company Revenue</option>                    
                </select>
            </div>
            <div style={{width: "80vw", height: "500px", }}>                 
                <DumbbellChart data={dumbbellData}   />
            </div>            
        </div>
    )
}