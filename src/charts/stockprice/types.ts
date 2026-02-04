export interface stockData {
    date: string;
    open: string | number;
    hi: string | number;
    low: string | number;
    close: string | number;
    adj_close: string | number;
    volume: string | number;
}

export interface stockDataFormatted {
    date: Date
    open: number
    hi: number
    low: number
    close: number
    adj_close: number
    volume: number
}

export type lineDatum = { date: Date; value: number }

export interface nonDailyStockData {
  date: Date;
  endDate: Date;
  open: number;
  close: number;
  adj_close: number;
  hi: number;
  low: number;
  volumeOpen: number;
  volumeClose: number;
  volume: number;
}

export type tooltipPosData = { xPos: number, low: number, volume: number }

export type tooltipData = { date: Date, open: number, hi: number, low: number, close: number, volume: number }
