import { useState } from "react";
import { BarChart } from "../../src"
import { PieChart } from "../../src"
import { categoryDataV1, categoryDataV2, categoryDataV3, englishFreq, germanFreq } from "../data/constants";
import controlStyles from '../controls.module.css'

export const PieNBarchart = () => {
    const [selectedData, setSelectedData] = useState<string>("stack1");
      
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedData(e.target.value);
    };
    const languageData = selectedData === "english"?englishFreq:germanFreq
      const categoryData = selectedData === "category1"?categoryDataV1:
        selectedData === "category2"?categoryDataV2:categoryDataV3
    
      const pointData = selectedData.startsWith("category")?categoryData:languageData

    return (
        <div>
            <div id="select-bar-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-bar-data">Choose data:</label>
                <select id="choose-bar-data" value={selectedData} onChange={handleChange}>
                    <option value="english">English</option>
                    <option value="german">German</option>
                    <option value={"category1"}>Category 1</option>
                    <option value={"category2"}>Category 2</option>
                    <option value={"category3"}>Category 3</option>              
                </select>
            </div>
            <div style={{width: "80vw", height: "500px", }}>                 
                <BarChart data={pointData} color={{idx: 50, type:'colorful'}}   />
            </div>
            <div style={{width: "80vw", height: "500px", position: "relative" }}>                 
                <PieChart data={pointData} colorIdx={50}   />
            </div>
        </div>
    )
}