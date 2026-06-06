import { waterfallDatum } from "../../types";

export const colors = { inflows:"#22c55e", outflows: "#ef4444" }

export const formatWaterfallData = (data: waterfallDatum[]) => {
    let start = 0, end = 0, prevEnd = end
    const formattedData = data.map((d, i)=> {
        start = prevEnd
        end = start + d.value              
        prevEnd = end

        return { ...d, start, end }
    })

    return formattedData
}