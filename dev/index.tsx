import React, { useState} from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, PieChart, StackedBarChart, GroupedBarChart, PercentageBarChart,
  SankeyChart, CirclePacks
 } from '../src';
import { year1, year2, stackedData, stackedDataVar1, stackedDataVar2, stackData1, stackData2, stackData3 } from './data/constants';
import { englishFreq, germanFreq, categoryDataV1, categoryDataV2, categoryDataV3 } from './data/constants';
import { flightData, flightData1, energyData, brexitVoting } from './data/constants'
import { loanData1, loanData2, loanData3, loanData4, loanData4GPT, flareData } from './data/loan-data';
import controlStyles from './controls.module.css'

const App = () => {
  const [selectedData, setSelectedData] = useState<string>("stack1");
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedData(e.target.value);
  };

  const [selectedSankeyData, setSelectedSankeyData] = useState<string>("brexit voting")

  const handleSankeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSankeyData(e.target.value)
    e.stopPropagation()
    e.preventDefault()
  }

  const [selectedPackData, setSelectedPackData] = useState<string>("loan 1")

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

  const selectedStackedData = selectedData === "stack1" ? year1 : 
    selectedData === "stack2" ? year2:
      selectedData === "stack3" ? stackData1:
        selectedData === "stack4" ? stackData2: stackData3;
  const languageData = selectedData === "english"?englishFreq:germanFreq
  const categoryData = selectedData === "category1"?categoryDataV1:
    selectedData === "category2"?categoryDataV2:categoryDataV3

  const pointData = selectedData.startsWith("category")?categoryData:languageData
  
  const sankeyData = selectedSankeyData === "flight data"?flightData:
    selectedSankeyData === "flight data 1"?flightData1:      
        selectedSankeyData === "energy data"?energyData:
          brexitVoting

  const sankeyFormat = selectedSankeyData.startsWith("flight data")?{prefix: " flights: "}:          
        selectedSankeyData === "energy data"?{prefix: " ", suffix: " KWh"}:
          {prefix: " votes: "}
  return(
  
    <div style={{paddingBottom: "20px"}}>    
      <div id="select-sankey-data" className={`${controlStyles["select-optional"]}`}>
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
          <SankeyChart data={sankeyData} tooltipFormat={sankeyFormat} />
      </div>
      <h2>Testing BarChart Component</h2>
      <div style={{
        width: '80%',
        height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
        marginTop: '20px', /*border: '2px solid red'*/}}>      
        <div id="parent" className={`${controlStyles.parent}`}>
          <div id="select-optional" className={`${controlStyles["select-optional"]}`}>
            <label htmlFor="choose-data">Choose data:</label>
            <select id="choose-data" value={selectedData} onChange={handleChange}>
              {/*<option value="english">English</option>
              <option value="german">German</option>
              <option value={"category1"}>Category 1</option>
              <option value={"category2"}>Category 2</option>
              <option value={"category3"}>Category 3</option>
              */}
              {
                ["stack1", "stack2", "stack3", "stack4", "stack5"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))
              }
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
        <div style={{ flex:1, width: "100%", height: "100%", overflow:"hidden", border: "1px solid grey" }}>                 
          <GroupedBarChart data={selectedStackedData} colorIdx={28}  />
        </div>
      </div>
      <div style={{width: "80vw", maxWidth:"500px", height: "300px", position: "relative" }}>                 
          <StackedBarChart data={selectedStackedData} colorIdx={50} orientation='horizontal'  />
      </div>
      <div id="select-optional" className={`${controlStyles["select-optional"]}`}>
            <label htmlFor="choose-data">Choose data:</label>
            <select id="choose-data" value={selectedData} onChange={handleChange}>
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
)};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);