import { sankeyData, rawLink } from "../../src/types";

export const inactiveColor = "#d1d5db"

export const englishFreq = [
    { label: "A", value: 8167 },
    { label: "B", value: 1492 },
    { label: "C", value: 2782 },
    { label: "D", value: 4253 },
    { label: "E", value: 12702 },
    { label: "F", value: 2288 },
    { label: "G", value: 2015 },
    { label: "H", value: 6094 },
    { label: "I", value: 6966 },
    { label: "J", value: 153 },
    { label: "K", value: 772 },
    { label: "L", value: 4025 },
    { label: "M", value: 2406 },
    { label: "N", value: 6749 },
    { label: "O", value: 7507 },
    { label: "P", value: 1929 },
    { label: "Q", value: 95 },
    { label: "R", value: 5987 },
    { label: "S", value: 6327 },
    { label: "T", value: 9056 },
    { label: "U", value: 2758 },
    { label: "V", value: 978 },
    { label: "W", value: 2360 },
    { label: "X", value: 150 },
    { label: "Y", value: 1974 },
    { label: "Z", value: 74 },
];

export const germanFreq = [
    { label: "A", value: 49004 },
    { label: "Ä", value: 4965 },
    { label: "B", value: 17785 },
    { label: "C", value: 36940 },
    { label: "D", value: 44264 },
    { label: "E", value: 149403 },
    { label: "F", value: 17020 },
    { label: "G", value: 30778 },
    { label: "H", value: 61621 },
    { label: "I", value: 76184 },
    { label: "J", value: 2546 },
    { label: "K", value: 11361 },
    { label: "L", value: 39694 },
    { label: "M", value: 27415 },
    { label: "N", value: 92783 },
    { label: "O", value: 26590 },
    { label: "Ö", value: 3229 },
    { label: "P", value: 7638 },
    { label: "Q", value: 283 },
    { label: "R", value: 65295 },
    { label: "S", value: 64256 },
    { label: "ß", value: 3486 },
    { label: "T", value: 60114 },
    { label: "U", value: 37083 },
    { label: "Ü", value: 6380 },
    { label: "V", value: 7429 },
    { label: "W", value: 2360 },
    { label: "X", value: 150 },
    { label: "Y", value: 1974 },
    { label: "Z", value: 74 },
];

export const sampleData = [
  { label: "Alpha", value: 34 },
  { label: "Beta", value: 22 },
  { label: "Gamma", value: 47 },
  { label: "Delta", value: 19 },
  { label: "Epsilon", value: 55 },
];

export const categoryDataV1 = [
  { label: "Electronics", value: 95 },
  { label: "Apparel", value: 210 },
  { label: "Home", value: 150 },
  { label: "Toys", value: 320 },
  { label: "Books", value: 70 },
];

export const categoryDataV2 = [
  { label: "Electronics", value: 280 },
  { label: "Apparel", value: 190 },
  { label: "Groceries", value: 240 },
  { label: "Toys", value: 120 },
  { label: "Outdoor", value: 160 },
  { label: "Health", value: 95 },
  { label: "Baby Products", value: 60 },
];

export const categoryDataV3 = [
  { label: "Mobile", value: 310 },
  { label: "Computers", value: 265 },
  { label: "Apparel", value: 175 },
  { label: "Home", value: 140 },
  { label: "Sports", value: 195 },
  { label: "Beauty", value: 130 },
  { label: "Furniture", value: 220 },
  { label: "Office Supplies", value: 90 },
];


export const year1 = [
  { label: "Jin", ["Mandatory Math"]: 7, ["Interest Math"]: 8, English: 9, ["Bahasa Indonesia"]: 8, Physics: 6, Chemistry: 7, Biology: 9, Economy: 6, Geography: 7, ["Social Science"]: 6, ["Country History"]: 5, ["World History"]: 6 },
  { label: "Asuka", ["Mandatory Math"]: 7, ["Interest Math"]: 5, English: 10, ["Bahasa Indonesia"]: 9, Physics: 6, Chemistry: 8, Biology: 9, Economy: 7, Geography: 8, ["Social Science"]: 6, ["Country History"]: 4, ["World History"]: 6 },
  { label: "Hwoarang", ["Mandatory Math"]: 9, ["Interest Math"]: 10, English: 6, ["Bahasa Indonesia"]: 8, Physics: 4, Chemistry: 7, Biology: 8, Economy: 3, Geography: 6, ["Social Science"]: 5, ["Country History"]: 9, ["World History"]: 8 },
  { label: "Ling", ["Mandatory Math"]: 2, ["Interest Math"]: 3, English: 6, ["Bahasa Indonesia"]: 9, Physics: 10, Chemistry: 8, Biology: 9, Economy: 5, Geography: 6, ["Social Science"]: 8, ["Country History"]: 4, ["World History"]: 9 },
  { label: "Nina", ["Mandatory Math"]: 10, ["Interest Math"]: 4, English: 6, ["Bahasa Indonesia"]: 7, Physics: 5, Chemistry: 3, Biology: 9, Economy: 8, Geography: 9, ["Social Science"]: 6, ["Country History"]: 5, ["World History"]: 7 },
  { label: "Paul", ["Mandatory Math"]: 0, ["Interest Math"]: 10, English: 8, ["Bahasa Indonesia"]: 6, Physics: 5, Chemistry: 8, Biology: 7, Economy: 4, Geography: 3, ["Social Science"]: 9, ["Country History"]: 8, ["World History"]: 9 },
];

export const year2 = [
  { label: "Jin", ["Interest Math"]: 9, ["Bahasa Indonesia"]: 6, Physics: 7, Chemistry: 8, Biology: 9, ["Quantum Physics"]: 7 },
  { label: "Asuka", ["Interest Math"]: 8, ["Bahasa Indonesia"]: 4, Physics: 6, Chemistry: 7, Biology: 10, ["Quantum Physics"]: 6 },
  { label: "Hwoarang", ["Interest Math"]: 10, ["Bahasa Indonesia"]: 8, Physics: 7, Chemistry: 6, Biology: 8, ["Quantum Physics"]: 5 },
  { label: "Ling", ["Interest Math"]: 3, ["Bahasa Indonesia"]: 9, Physics: 10, Chemistry: 8, Biology: 9, ["Quantum Physics"]: 7 },
  { label: "Nina", ["Interest Math"]: 8, ["Bahasa Indonesia"]: 7, Physics: 9, Chemistry: 7, Biology: 8, ["Quantum Physics"]: 8 },
  { label: "Bryan", ["Interest Math"]: 5, ["Bahasa Indonesia"]: 6, Physics: 4, Chemistry: 7, Biology: 9, ["Quantum Physics"]: 3 },
  { label: "Anna", ["Interest Math"]: 7, ["Bahasa Indonesia"]: 6, Physics: 6, Chemistry: 7, Biology: 10, ["Quantum Physics"]: 6 },
];

export const stackedData = [
  {
    label: "Q1",
    coal: 120,
    gas: 80,
    solar: 40,
  },
  {
    label: "Q2",
    coal: 150,
    gas: 60,
    solar: 55,
  },
  {
    label: "Q3",
    coal: 170,
    gas: 75,
    solar: 65,
  },
  {
    label: "Q4",
    coal: 130,
    gas: 90,
    solar: 80,
  },
];

export const stackedDataVar1 = [
  {
    label: "Q1",
    coal: 120,
    gas: 80,
    solar: 40,
    wind: 0,
  },
  {
    label: "Q2",
    coal: 150,
    gas: 60,
    solar: 55,
    wind: 20,   // new layer appears
  },
  {
    label: "Q3",
    coal: 170,
    gas: 75,
    solar: 0,
    wind: 35,   // solar disappears
  },
  {
    label: "Q4",
    coal: 130,
    gas: 90,
    solar: 80,  // solar returns
    wind: 25,
  },
];

export const stackedDataVar2 = [
  {
    label: "Q1",
    coal: 110,
    gas: 70,
    solar: 35,
    hydro: 0,
  },
  {
    label: "Q2",
    coal: 160,
    gas: 0,
    solar: 60,
    hydro: 30,  // gas removed, hydro added
  },
  {
    label: "Q3",
    coal: 180,
    gas: 85,    // gas returns
    solar: 0,
    hydro: 40,
  },
  {
    label: "Q4",
    coal: 140,
    gas: 90,
    solar: 75,  // solar returns,
    hydro: 0
  },
];

export const stackData1 = [
  {
    label: "Globex",
    alpha: 5400,
    beta: 6900,
    gamma: 8700,
    delta: 13400,
    epsilon: 7600,
    zeta: 4200,
  },
  {
    label: "Initech",
    alpha: 3700,
    beta: 10200,
    gamma: 5300,
    delta: 8400,
    epsilon: 15800,
    zeta: 6900,
  },
  {
    label: "Umbrella",
    alpha: 7500,
    beta: 9100,
    gamma: 6100,
    delta: 12300,
    epsilon: 5800,
    zeta: 4900,
  },
  {
    label: "Aperture Labs",
    alpha: 9700,
    beta: 9300,
    gamma: 6400,
    delta: 4300,
    epsilon: 6700,
    zeta: 4800,
  },
];

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
  // NEW MEMBERS
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

export const stackData3 = [
  {
    label: "Umbrella",
    alpha: 6200,
    beta: 8900,
    delta: 10400,
    epsilon: 4200,
    iota: 5400,
    kappa: 14100,
    lambda: 3900,
  },
  {
    label: "Hooli",
    alpha: 11200,
    beta: 17600,
    delta: 7500,
    epsilon: 8400,
    iota: 5900,
    kappa: 3600,
    lambda: 4200,
  },
  {
    label: "Vehement Capital",
    alpha: 5100,
    beta: 9600,
    delta: 13200,
    epsilon: 7300,
    iota: 6900,
    kappa: 4600,
    lambda: 3800,
  },

  // NEW MEMBERS
  {
    label: "Stark Industries",
    alpha: 10800,
    beta: 8200,
    delta: 19000,
    epsilon: 7600,
    iota: 6800,
    kappa: 4700,
    lambda: 5200,
  },
  {
    label: "Tyrell Corporation",
    alpha: 15800,
    beta: 8800,
    delta: 7200,
    epsilon: 5500,
    iota: 4300,
    kappa: 3600,
    lambda: 3000,
  },
];

/*sankey data*/
export const flightData: rawLink[] = [
  { source: "Brazil", target: "Portugal", value: 5 },
  { source: "Brazil", target: "France", value: 1 },
  { source: "Brazil", target: "Spain", value: 1 },
  { source: "Brazil", target: "England", value: 1 },

  { source: "Portugal", target: "Angola", value: 2 },
  { source: "Portugal", target: "Senegal", value: 1 },
  { source: "Portugal", target: "Morocco", value: 1 },
  { source: "Portugal", target: "South Africa", value: 3 },

  { source: "Angola", target: "China", value: 5 },
  { source: "Angola", target: "India", value: 1 },
  { source: "Angola", target: "Japan", value: 3 },

  { source: "Canada", target: "Portugal", value: 1 },
  { source: "Canada", target: "France", value: 5 },
  { source: "Canada", target: "England", value: 1 },

  { source: "France", target: "Angola", value: 1 },
  { source: "France", target: "Senegal", value: 3 },
  { source: "France", target: "Mali", value: 3 },
  { source: "France", target: "Morocco", value: 3 },
  { source: "France", target: "South Africa", value: 1 },

  { source: "Senegal", target: "China", value: 5 },
  { source: "Senegal", target: "India", value: 1 },
  { source: "Senegal", target: "Japan", value: 3 },

  { source: "Mexico", target: "Portugal", value: 1 },
  { source: "Mexico", target: "France", value: 1 },
  { source: "Mexico", target: "Spain", value: 5 },
  { source: "Mexico", target: "England", value: 1 },

  { source: "Spain", target: "Senegal", value: 1 },
  { source: "Spain", target: "Morocco", value: 3 },
  { source: "Spain", target: "South Africa", value: 1 },

  { source: "Morocco", target: "China", value: 5 },
  { source: "Morocco", target: "India", value: 1 },
  { source: "Morocco", target: "Japan", value: 3 },

  { source: "USA", target: "Portugal", value: 1 },
  { source: "USA", target: "France", value: 1 },
  { source: "USA", target: "Spain", value: 1 },
  { source: "USA", target: "England", value: 5 },

  { source: "England", target: "Angola", value: 1 },
  { source: "England", target: "Senegal", value: 1 },
  { source: "England", target: "Morocco", value: 2 },
  { source: "England", target: "South Africa", value: 7 },

  { source: "South Africa", target: "China", value: 5 },
  { source: "South Africa", target: "India", value: 1 },
  { source: "South Africa", target: "Japan", value: 3 },

  { source: "Mali", target: "China", value: 5 },
  { source: "Mali", target: "India", value: 1 },
  { source: "Mali", target: "Japan", value: 3 }
];

export const flightData1: rawLink[] = [
  { source: "Brazil", target: "Portugal", value: 5 },
  { source: "Brazil", target: "France", value: 1 },
  { source: "Brazil", target: "Spain", value: 1 },
  { source: "Brazil", target: "England", value: 1 },
  { source: "Brazil", target: "Germany", value: 2 },

  { source: "Portugal", target: "Angola", value: 2 },
  { source: "Portugal", target: "Morocco", value: 1 },
  { source: "Portugal", target: "South Africa", value: 3 },
  { source: "Portugal", target: "Nigeria", value: 1 },

  { source: "France", target: "Angola", value: 1 },
  { source: "France", target: "Morocco", value: 3 },
  { source: "France", target: "South Africa", value: 1 },
  { source: "France", target: "Nigeria", value: 2 },

  { source: "Mexico", target: "Portugal", value: 1 },
  { source: "Mexico", target: "France", value: 1 },
  { source: "Mexico", target: "Spain", value: 5 },
  { source: "Mexico", target: "England", value: 1 },
  { source: "Mexico", target: "Germany", value: 1 },

  { source: "Spain", target: "Morocco", value: 3 },
  { source: "Spain", target: "South Africa", value: 1 },
  { source: "Spain", target: "Nigeria", value: 1 },

  { source: "USA", target: "Portugal", value: 1 },
  { source: "USA", target: "France", value: 1 },
  { source: "USA", target: "Spain", value: 1 },
  { source: "USA", target: "England", value: 5 },
  { source: "USA", target: "Germany", value: 3 },

  { source: "England", target: "Angola", value: 1 },
  { source: "England", target: "Morocco", value: 2 },
  { source: "England", target: "South Africa", value: 7 },
  { source: "England", target: "Nigeria", value: 3 },

  { source: "Angola", target: "China", value: 5 },
  { source: "Angola", target: "Japan", value: 3 },
  { source: "Angola", target: "South Korea", value: 1 },

  { source: "Morocco", target: "China", value: 5 },
  { source: "Morocco", target: "Japan", value: 3 },
  { source: "Morocco", target: "South Korea", value: 2 },

  { source: "South Africa", target: "China", value: 5 },
  { source: "South Africa", target: "Japan", value: 3 },
  { source: "South Africa", target: "South Korea", value: 1 },

  { source: "Argentina", target: "Portugal", value: 1 },
  { source: "Argentina", target: "France", value: 2 },
  { source: "Argentina", target: "Spain", value: 3 },
  { source: "Argentina", target: "England", value: 1 },
  { source: "Argentina", target: "Germany", value: 2 },

  { source: "Germany", target: "Angola", value: 1 },
  { source: "Germany", target: "Morocco", value: 2 },
  { source: "Germany", target: "South Africa", value: 1 },
  { source: "Germany", target: "Nigeria", value: 3 },

  { source: "Nigeria", target: "China", value: 3 },
  { source: "Nigeria", target: "Japan", value: 2 },
  { source: "Nigeria", target: "South Korea", value: 4 }
];

export const flightData2: rawLink[] = [
  { source: "Brazil", target: "Portugal", value: 4 },
  { source: "Brazil", target: "France", value: 2 },
  { source: "Brazil", target: "Italy", value: 3 },
  { source: "Brazil", target: "England", value: 1 },
  { source: "Brazil", target: "Argentina", value: 5 },

  { source: "Portugal", target: "Nigeria", value: 3 },
  { source: "Portugal", target: "Egypt", value: 2 },
  { source: "Portugal", target: "Turkey", value: 1 },

  { source: "France", target: "Nigeria", value: 4 },
  { source: "France", target: "Egypt", value: 2 },
  { source: "France", target: "Turkey", value: 3 },

  { source: "Italy", target: "Colombia", value: 2 },
  { source: "Italy", target: "Nigeria", value: 1 },
  { source: "Italy", target: "Turkey", value: 4 },

  { source: "England", target: "Argentina", value: 3 },
  { source: "England", target: "Australia", value: 5 },
  { source: "England", target: "Indonesia", value: 2 },
  { source: "England", target: "Thailand", value: 1 },

  { source: "Argentina", target: "Colombia", value: 4 },
  { source: "Argentina", target: "Nigeria", value: 2 },

  { source: "Colombia", target: "Australia", value: 3 },
  { source: "Colombia", target: "Indonesia", value: 5 },
  { source: "Colombia", target: "Russia", value: 1 },

  { source: "Nigeria", target: "Egypt", value: 5 },
  { source: "Nigeria", target: "Australia", value: 2 },
  { source: "Nigeria", target: "Russia", value: 3 },

  { source: "Egypt", target: "Australia", value: 4 },
  { source: "Egypt", target: "Russia", value: 2 },

  { source: "Australia", target: "Indonesia", value: 3 },
  { source: "Australia", target: "Thailand", value: 4 },

  { source: "Indonesia", target: "Thailand", value: 5 },
  { source: "Indonesia", target: "Russia", value: 2 },

  { source: "Thailand", target: "Russia", value: 3 },
  { source: "Thailand", target: "Turkey", value: 4 },

  { source: "Russia", target: "Turkey", value: 5 }
];

export const energyData: rawLink[] = [
  { source: "Agricultural 'waste'", target: "Bio-conversion", value: 124.729 },
  { source: "Bio-conversion", target: "Liquid", value: 0.597 },
  { source: "Bio-conversion", target: "Losses", value: 26.862 },
  { source: "Bio-conversion", target: "Solid", value: 280.322 },
  { source: "Bio-conversion", target: "Gas", value: 81.144 },

  { source: "Biofuel imports", target: "Liquid", value: 35 },
  { source: "Biomass imports", target: "Solid", value: 35 },

  { source: "Coal imports", target: "Coal", value: 11.606 },
  { source: "Coal reserves", target: "Coal", value: 63.965 },
  { source: "Coal", target: "Solid", value: 75.571 },

  { source: "District heating", target: "Industry", value: 10.639 },
  { source: "District heating", target: "Heating and cooling - commercial", value: 22.505 },
  { source: "District heating", target: "Heating and cooling - homes", value: 46.184 },

  { source: "Electricity grid", target: "Over generation / exports", value: 104.453 },
  { source: "Electricity grid", target: "Heating and cooling - homes", value: 113.726 },
  { source: "Electricity grid", target: "H2 conversion", value: 27.14 },
  { source: "Electricity grid", target: "Industry", value: 342.165 },
  { source: "Electricity grid", target: "Road transport", value: 37.797 },
  { source: "Electricity grid", target: "Agriculture", value: 4.412 },
  { source: "Electricity grid", target: "Heating and cooling - commercial", value: 40.858 },
  { source: "Electricity grid", target: "Losses", value: 56.691 },
  { source: "Electricity grid", target: "Rail transport", value: 7.863 },
  { source: "Electricity grid", target: "Lighting & appliances - commercial", value: 90.008 },
  { source: "Electricity grid", target: "Lighting & appliances - homes", value: 93.494 },

  { source: "Gas imports", target: "Ngas", value: 40.719 },
  { source: "Gas reserves", target: "Ngas", value: 82.233 },

  { source: "Gas", target: "Heating and cooling - commercial", value: 0.129 },
  { source: "Gas", target: "Losses", value: 1.401 },
  { source: "Gas", target: "Thermal generation", value: 151.891 },
  { source: "Gas", target: "Agriculture", value: 2.096 },
  { source: "Gas", target: "Industry", value: 48.58 },

  { source: "Geothermal", target: "Electricity grid", value: 7.013 },

  { source: "H2 conversion", target: "H2", value: 20.897 },
  { source: "H2 conversion", target: "Losses", value: 6.242 },
  { source: "H2", target: "Road transport", value: 20.897 },

  { source: "Hydro", target: "Electricity grid", value: 6.995 },

  { source: "Liquid", target: "Industry", value: 121.066 },
  { source: "Liquid", target: "International shipping", value: 128.69 },
  { source: "Liquid", target: "Road transport", value: 135.835 },
  { source: "Liquid", target: "Domestic aviation", value: 14.458 },
  { source: "Liquid", target: "International aviation", value: 206.267 },
  { source: "Liquid", target: "Agriculture", value: 3.64 },
  { source: "Liquid", target: "National navigation", value: 33.218 },
  { source: "Liquid", target: "Rail transport", value: 4.413 },

  { source: "Marine algae", target: "Bio-conversion", value: 4.375 },
  { source: "Ngas", target: "Gas", value: 122.952 },

  { source: "Nuclear", target: "Thermal generation", value: 839.978 },

  { source: "Oil imports", target: "Oil", value: 504.287 },
  { source: "Oil reserves", target: "Oil", value: 107.703 },
  { source: "Oil", target: "Liquid", value: 611.99 },

  { source: "Other waste", target: "Solid", value: 56.587 },
  { source: "Other waste", target: "Bio-conversion", value: 77.81 },

  { source: "Pumped heat", target: "Heating and cooling - homes", value: 193.026 },
  { source: "Pumped heat", target: "Heating and cooling - commercial", value: 70.672 },

  { source: "Solar PV", target: "Electricity grid", value: 59.901 },

  { source: "Solar Thermal", target: "Heating and cooling - homes", value: 19.263 },

  { source: "Solar", target: "Solar Thermal", value: 19.263 },
  { source: "Solar", target: "Solar PV", value: 59.901 },

  { source: "Solid", target: "Agriculture", value: 0.882 },
  { source: "Solid", target: "Thermal generation", value: 400.12 },
  { source: "Solid", target: "Industry", value: 46.477 },

  { source: "Thermal generation", target: "Electricity grid", value: 525.531 },
  { source: "Thermal generation", target: "Losses", value: 787.129 },
  { source: "Thermal generation", target: "District heating", value: 79.329 },

  { source: "UK land based bioenergy", target: "Electricity grid", value: 9.452 },
  { source: "Wave", target: "Bio-conversion", value: 182.01 },
  { source: "Wind", target: "Electricity grid", value: 289.366 }
];

export const brexitVoting: rawLink[] = [
  { source: "Remain", target: "Soft or Stay Home", value: 239 },
  { source: "Remain", target: "Die Hard Remainers", value: 120 },
  { source: "Remain", target: "Anything but No Deal", value: 126 },
  { source: "Remain", target: "Literally no idea", value: 53 },
  { source: "Remain", target: "All other groups", value: 116 },
  { source: "Remain", target: "Die Hard No Dealers", value: 5 },
  { source: "Remain", target: "Any Brexit", value: 113 },
  { source: "Remain", target: "May Way or The Highway", value: 5 },

  { source: "Didn't vote", target: "Soft or Stay Home", value: 47 },
  { source: "Didn't vote", target: "Die Hard Remainers", value: 45 },
  { source: "Didn't vote", target: "Anything but No Deal", value: 34 },
  { source: "Didn't vote", target: "Literally no idea", value: 105 },
  { source: "Didn't vote", target: "All other groups", value: 66 },
  { source: "Didn't vote", target: "Die Hard No Dealers", value: 19 },
  { source: "Didn't vote", target: "Any Brexit", value: 6 },
  { source: "Didn't vote", target: "May Way or The Highway", value: 6 },

  { source: "Can't remember", target: "Soft or Stay Home", value: 1 },
  { source: "Can't remember", target: "Die Hard Remainers", value: 4 },
  { source: "Can't remember", target: "Anything but No Deal", value: 2 },
  { source: "Can't remember", target: "Literally no idea", value: 13 },
  { source: "Can't remember", target: "All other groups", value: 10 },
  { source: "Can't remember", target: "Die Hard No Dealers", value: 5 },
  { source: "Can't remember", target: "Any Brexit", value: 3 },
  { source: "Can't remember", target: "May Way or The Highway", value: 1 },

  { source: "Leave", target: "Soft or Stay Home", value: 28 },
  { source: "Leave", target: "Die Hard Remainers", value: 19 },
  { source: "Leave", target: "Anything but No Deal", value: 18 },
  { source: "Leave", target: "Literally no idea", value: 92 },
  { source: "Leave", target: "All other groups", value: 196 },
  { source: "Leave", target: "Die Hard No Dealers", value: 208 },
  { source: "Leave", target: "Any Brexit", value: 60 },
  { source: "Leave", target: "May Way or The Highway", value: 103 }
]

