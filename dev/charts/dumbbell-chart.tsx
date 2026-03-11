import { useState } from "react";
import { DumbbellChart } from "../../src";
import { internetPenetration_2010_2018, internetPenetration_2014_2020, internetPenetration_2015_2025, 
    companyProfit2023_2024, companyProfit2024_2025, companyProfit2025_2026,
    lifeExpectancy, companyRevenue } from "../data/dumbbell-data"
import controlStyles from '../controls.module.css'

export const DumbbellDiagram = () => {
    const [selectedData, setSelectedData] = useState<string>("internet1");
      
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedData(e.target.value);
    };
    const dumbbellData = selectedData === "internet1"?internetPenetration_2010_2018:
        selectedData === "internet2"?internetPenetration_2014_2020:
        selectedData === "internet3"?internetPenetration_2015_2025:
        selectedData === "company1"?companyProfit2023_2024:
        selectedData === "company2"?companyProfit2024_2025:
        selectedData === "company3"?companyProfit2025_2026:
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
                    <option value="company1">Profit of Companies 2023 2024</option>
                    <option value="company2">Profit of Companies 2024 2025</option>
                    <option value="company3">Profit of Companies 2025 2026</option>
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