import React, { useState} from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, PieChart, StackedBarChart, GroupedBarChart, PercentageBarChart } from '../src';
import { year1, year2, stackedData, stackedDataVar1, stackedDataVar2 } from '../src/data/constants';
import { englishFreq, germanFreq, categoryDataV1, categoryDataV2, categoryDataV3 } from '../src/data/constants';
import controlStyles from './controls.module.css'

const App = () => {
  const [selectedData, setSelectedData] = useState<string>("english");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedData(e.target.value);
  };

  const selectedStackedData = selectedData === "stack1" ? year1 : 
    selectedData === "stack2" ? year2:
      selectedData === "stack3" ? stackedData:
        selectedData === "stack4" ? stackedDataVar1: stackedDataVar2;
  const languageData = selectedData === "english"?englishFreq:germanFreq
  const categoryData = selectedData === "category1"?categoryDataV1:
    selectedData === "category2"?categoryDataV2:categoryDataV3

  const pointData = selectedData.startsWith("category")?categoryData:languageData
  // 
  return(
  
    <div>      
      <h2>Testing BarChart Component</h2>
      <div style={{
        width: '100%',
        height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
        marginTop: '20px', /*border: '2px solid red'*/}}>      
        <div id="parent" className={`${controlStyles.parent}`}>
          <div id="select-optional" className={`${controlStyles["select-optional"]}`}>
            <label htmlFor="choose-data">Choose data:</label>
            <select id="choose-data" value={selectedData} onChange={handleChange}>
              <option value="english">English</option>
              <option value="german">German</option>
              <option value={"category1"}>Category 1</option>
              <option value={"category2"}>Category 2</option>
              <option value={"category3"}>Category 3</option>
             {/*
                ["stack1", "stack2", "stack3", "stack4", "stack5"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))
              */}
            </select>
          </div>
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
        <div style={{ flex:1, width: "100%", height: "100%", overflow:"hidden" }}>       
          <BarChart data={pointData} color={{idx:14, type:"colorful"}}/>
          {/*<GroupedBarChart data={selectedStackedData} />*/}
        </div>
      </div>
      <div style={{width: "80vw", maxWidth:"384px", height: "192px", position: "relative" }}>       
          <BarChart data={pointData} color={{idx:6}}  />
          {/*<StackedBarChart data={selectedStackedData} />   */}       
        </div>
    </div>
)};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);