import { waterfallDatum } from "../../types";

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