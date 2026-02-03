import { timeFormat, sum, min, max, group, timeWeek, timeMonth } from "d3";
import { stockDataFormatted, nonDailyStockData  } from "./types";
const dayFormat = timeFormat("%A"),dayIndexFormat = timeFormat("%w"), monthFormat = timeFormat("%B");

export const createWeeklyData = (formattedData: stockDataFormatted[]): nonDailyStockData[] => {
    const grouped = group(
        formattedData,
        d => timeWeek(d.date) // week start
    )

    return Array.from(grouped.values()).map((week) => {
        const first = week[0]
        const last = week[week.length - 1]

        const volumeSum = sum(week, d => d.volume)

        return {
            date: first.date,
            endDate: last.date,

            open: first.open,
            close: last.close,
            adj_close: last.adj_close,

            volumeOpen: first.volume,
            volumeClose: last.volume,
            volume: Math.round(volumeSum / week.length),

            hi: max(week, d => d.hi)!,
            low: min(week, d => d.low)!
        }
    })
}

export const createMonthlyData = (formattedData: stockDataFormatted[]): nonDailyStockData[] => {
    const grouped = group(
        formattedData,
        d => timeMonth(d.date)
    )

    return Array.from(grouped.values()).map((month) => {
        const first = month[0]
        const last = month[month.length - 1]

        const volumeSum = sum(month, d => d.volume)

        return {
            date: first.date,        // month start
            endDate: last.date,      // last trading day in month

            open: first.open,
            close: last.close,
            adj_close: last.adj_close,

            volumeOpen: first.volume,
            volumeClose: last.volume,
            volume: Math.round(volumeSum / month.length),

            hi: max(month, d => d.hi)!,
            low: min(month, d => d.low)!
        }
    })
}
