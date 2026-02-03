import { timeFormat, sum, min, max, group, timeWeek, timeMonth } from "d3";
import { stockDataFormatted, nonDailyStockData  } from "./types";
const dayFormat = timeFormat("%A"),dayIndexFormat = timeFormat("%w"), monthFormat = timeFormat("%B");

export const createWeeklyData = (formattedData:stockDataFormatted[]): nonDailyStockData[] => {                 
    return parseWeek(formattedData).reduce<nonDailyStockData[]>((acc, week)=>{
        const first = week[0]
        const last = week[week.length - 1]

        const volumeSum = week.reduce((sum: number, d: stockDataFormatted) => sum + d.volume, 0)

        const weekData: nonDailyStockData = {
            date: first.date,
            endDate: last.date,

            open: first.open,
            close: last.close,
            adj_close: last.adj_close,

            volumeOpen: first.volume,
            volumeClose: last.volume,
            volume: Math.round(volumeSum / week.length),

            hi: max(week, (d: stockDataFormatted) => d.hi)!,
            low: min(week, (d: stockDataFormatted) => d.low)!
        }

        acc.push(weekData)
        return acc
    }, [])
}
            
function parseWeek(data: stockDataFormatted[]): stockDataFormatted[][]{
    const weeks: stockDataFormatted[][] = []
    let week: stockDataFormatted[] = []

    let startDayIndex = 0
    let dayArray: string[] = []

    data.forEach((d, i) => {
        const currentDay = dayFormat(d.date)
        const dayIndex = +dayIndexFormat(d.date)

        if (dayArray.length === 0) {
            week.push(d)
            startDayIndex = dayIndex
            dayArray.push(currentDay)
            return
        }

        if (!dayArray.includes(currentDay) && dayIndex > startDayIndex) {
            week.push(d)
            dayArray.push(currentDay)

            if (i === data.length - 1) {
                weeks.push(week)
            }
        } else {
            weeks.push(week)
            week = [d]
            startDayIndex = dayIndex
            dayArray = [currentDay]
        }
    })

    return weeks
}

export const createWeeklyDataD3 = (formattedData: stockDataFormatted[]): nonDailyStockData[] => {
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
