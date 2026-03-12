import { createRoot } from 'react-dom/client';
import { StockPriceChart } from '../src';
import { JKSEData } from './data/stockprice';
import { WaterfallDiagram } from './charts/waterfall-chart';
import { SunburstChart } from './charts/SunburstChart';
import { DumbbellDiagram } from './charts/dumbbell-chart';
import { PopulationPyramidChart } from './charts/populationPyramid';
import { ZoomableCirclePacks } from './charts/zoomableCirclePacks';
import { SortableSankey } from './charts/sortableSankey';
import { StackedBarchartVariants } from './charts/stackedBarchartVariants';
import { PieNBarchart } from './charts/pieNbarchart';

const App = () => {  
  
  return(
  
    <div style={{paddingBottom: "20px"}}>
      <DumbbellDiagram />    
      <WaterfallDiagram />
      <SunburstChart />
      <div style={{
          width: '80vw',
          height: '450px', display:"flex", flexDirection:"column", overflow:'hidden', 
          marginTop: '20px', border: '2px solid red'}}>
            
            <StockPriceChart data={JKSEData} mode="candlestick" tooltipFormat={{prefix: "Rp. "}} />
      </div>
      <PopulationPyramidChart />
      <ZoomableCirclePacks />
      <SortableSankey />
      <StackedBarchartVariants />
      <PieNBarchart />
    </div>
)};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);