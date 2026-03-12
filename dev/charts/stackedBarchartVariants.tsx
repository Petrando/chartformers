import { useState } from 'react';
import { stackData1, stackData2, stackData3, year1, year2 } from '../data/constants';
import { PercentageBarChart, StackedBarChart, GroupedBarChart, MorphStackedBarChart } from '../../src';
import controlStyles from '../controls.module.css'

type modeType = "stacked" | "grouped" | "percentage"

export const StackedBarchartVariants = () => {
    const [selectedData, setSelectedData] = useState<string>("stack1");
          
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedData(e.target.value);
    };  
    
    const [morphStackedMode, setMode] = useState<modeType>("stacked");
      
    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMode(e.target.value as modeType);
    };          
    
    const selectedStackedData = selectedData === "stack1" ? year1 : 
        selectedData === "stack2" ? year2:
            selectedData === "stack3" ? stackData1:
                selectedData === "stack4" ? stackData2: stackData3;

    return (
        <>
            <h2>Testing BarChart Component</h2>
            <div style={{
                width: '80%',
                height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
                marginTop: '20px', /*border: '2px solid red'*/}}>      
                <div id="parent" className={`${controlStyles.parent}`}>
                
                <div className={`${controlStyles["UI-controls"]}`}>
                    
                    {/*<div id="legends-container" className={`${controlStyles["legends-container"]}`}>
                    <label className={styles["controls-label"]} style={{paddingRight: '12px'}}>
                        <input 
                            type="checkbox" 
                            className={styles["controls-checkbox"]} 
                        />
                            Sort
                    </label>
                    {
                        keys.map(d => (
                        <div key={d} className={`${stackedStyles["legend-container"]}`}>
                            <div className={`${stackedStyles["legend-rect"]}`} />
                            <span className={`${stackedStyles["legend-label"]}`}>
                            {d}
                            </span>
                        </div>
                        ))
                    }
                    </div>*/}
                </div>
                
                </div>
                <div id="select-stack-data" className={`${controlStyles["select-optional"]}`}>
                <label htmlFor="choose-stack-data">Choose data:</label>
                <select id="choose-stack-data" value={selectedData} onChange={handleChange}>              
                {
                    ["stack1", "stack2", "stack3", "stack4", "stack5"].map(s => (
                    <option key={s} value={s}>{s}</option>
                    ))
                }
                </select>
            </div>
                <div style={{ flex:1, width: "100%", height: "100%", overflow:"hidden", border: "1px solid grey" }}>                 
                <PercentageBarChart 
                    data={selectedStackedData} 
                    colorIdx={28}                         
                />
                </div>
            </div>      
            <div style={{width: "80vw", height: "500px", position: "relative" }}>                 
                <StackedBarChart focusOnPlot data={selectedStackedData} colorIdx={12}  />
            </div>      
            <div id="select-mode" className={`${controlStyles["select-optional"]}`}>
                    <label htmlFor="choose-mode">Choose mode:</label>
                    <select id="choose-mode" value={morphStackedMode} onChange={handleModeChange}>
                    <option value="stacked">Stacked</option>
                    <option value="grouped">Grouped</option>
                    <option value="percentage">Percentage</option>              
                    </select>
                </div>
            <div style={{width: "80vw", height: "450px", position: "relative" }}>                 
                <MorphStackedBarChart 
                    data={selectedStackedData} 
                    mode={morphStackedMode}                          
                    focusOnPlot={true}
                />
            </div>
        </>
    )
}