# chartformers

[![npm version](https://img.shields.io/npm/v/chartformers)](https://www.npmjs.com/package/chartformers)
[![npm downloads](https://img.shields.io/npm/dw/chartformers)](https://www.npmjs.com/package/chartformers)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/chartformers)](https://bundlephobia.com/package/chartformers)
[![GitHub stars](https://img.shields.io/github/stars/petrando/chartformers)](https://github.com/petrando/chartformers)
[![license](https://img.shields.io/npm/l/chartformers)](./LICENSE)


**chartformers** is a lightweight React.js library for rendering **interactive, responsive, and animated D3.js charts**.  
![Demo](https://raw.githubusercontent.com/Petrando/chartformers/master/media/Pie.gif)
It is designed to simplify chart creation in modern React apps while retaining the full power of D3 under the hood.

## ✨ Features
- Easy-to-use React components for common chart types  
- Smooth animated transitions  
- Small bundle size
- Full typescript
- Responsive charts that auto-fit their containers  
- Simple styling with the included CSS  
- Powered by D3.js + React

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
  export const stackData2 = [
    {
      label: "Initech",
      alpha: 14900,
      beta: 8800,
      delta: 9600,
      epsilon: 5400,
      theta: 6100,
    },
    {
      label: "Umbrella",
      alpha: 6800,
      beta: 7400,
      delta: 17100,
      epsilon: 9300,
      theta: 5200,
    },
    {
      label: "Hooli",
      alpha: 6900,
      beta: 10400,
      delta: 7400,
      epsilon: 16200,
      theta: 5700,
    },  
    {
      label: "Aperture Labs",
      alpha: 8200,
      beta: 9100,
      delta: 14300,
      epsilon: 7600,
      theta: 4600,
    },  
    {
      label: "Cyberdyne Systems",
      alpha: 18800,
      beta: 9700,
      delta: 6900,
      epsilon: 8300,
      theta: 6200,
    },
    {
      label: "Massive Dynamic",
      alpha: 9600,
      beta: 7800,
      delta: 4900,
      epsilon: 7200,
      theta: 15500,
    },
  ];

  return (
    <div className="w-full h-60 md:h-96">
      <StackedBarChart data={stackData2} />
    </div>
  );
}
```
![Demo](https://raw.githubusercontent.com/Petrando/chartformers/master/media/StackedBarChart.gif)

For full explanations on the options and properties, with live demo:
## Visit the [chartformers documentation](https://chartformers-docs.vercel.app/).  


Or you can grab the source code at:
## the [github repo](https://github.com/Petrando/chartformers)
