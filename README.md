# chartformers

[![npm version](https://img.shields.io/npm/v/chartformers)](https://www.npmjs.com/package/chartformers)
[![npm downloads](https://img.shields.io/npm/dw/chartformers)](https://www.npmjs.com/package/chartformers)
[![packagephobia](https://packagephobia.com/badge?p=chartformers)](https://packagephobia.com/result?p=chartformers)
[![bundlejs](https://img.shields.io/badge/bundlejs-minzipped-brightgreen)](https://bundlejs.com/?q=chartformers)
[![GitHub stars](https://img.shields.io/github/stars/petrando/chartformers)](https://github.com/petrando/chartformers)
[![license](https://img.shields.io/npm/l/chartformers)](./LICENSE)


**chartformers** is a lightweight React.js library for rendering **interactive, responsive, and animated D3.js charts**.  
![Demo](https://raw.githubusercontent.com/Petrando/chartformers/master/media/Pie.gif)
It is designed to simplify chart creation in modern React apps while retaining the full power of D3 under the hood.

## ✨ Features
- Easy-to-use React components for common chart types  
- Smooth animated transitions  
- Performance First: Tiny footprint (~46kB gzipped) with full tree-shaking support.
- Full typescript
- Responsive charts that auto-fit their containers  
- Simple styling with the included CSS  
- Powered by D3.js + React 19
n
## 📦 Installation

```bash
npm install chartformers@latest
```   

To use a bar chart component import these:  
```bash
import { BarChart } from 'chartformers';
import 'chartformers/dist/chartformers.css';
```
Render the chart inside a container with explicit width and height:
```js
<div className="w-full h-60 md:h-96">
  <BarChart data={[]} />
</div>
```

## Example: sortable stacked bar chart
```js
import { StackedBarChart } from "chartformers"; 
import 'chartformers/dist/chartformers.css';

export default function StackedBarChartExample() {  
  const companyData = [
    {
      "label": "TechStream",
      "Hardware": 5409,
      "Software": 8200,
      "Services": 10390,
      "Consulting": 21500,
      "Maintenance": 7506
    },
    {
      "label": "InnovateX",
      "Hardware": 11265,
      "Software": 8657,
      "Services": 18200,
      "Consulting": 9400,
      "Maintenance": 5286
    },
    {
      "label": "CloudSphere",
      "Hardware": 16087,
      "Software": 14200,
      "Services": 22400,
      "Consulting": 19423,
      "Maintenance": 11935
    },
    {
      "label": "DataVantage",
      "Hardware": 9912,
      "Software": 15900,
      "Services": 14674,
      "Consulting": 13322,
      "Maintenance": 11500
    },
    {
      "label": "CyberCore",
      "Hardware": 3488,
      "Software": 5520,
      "Services": 6685,
      "Consulting": 7433,
      "Maintenance": 5769
    },
    {
      "label": "AetherSystems",
      "Hardware": 6811,
      "Software": 8900,
      "Services": 8582,
      "Consulting": 24100,
      "Maintenance": 6700
    }
  ];

  return (
    <div className="w-full h-60 md:h-96">
      <StackedBarChart data={companyData} />
    </div>
  );
}
```
![Demo](https://raw.githubusercontent.com/Petrando/chartformers/master/media/StackedBarChart.gif)

For full explanations on the options and properties, with live demo:
## Visit the [chartformers documentation](https://chartformers-doc.vercel.app/).  


Or you can grab the source code at:
## the [github repo](https://github.com/Petrando/chartformers)
