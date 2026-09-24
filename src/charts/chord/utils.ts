import { matrixData, link } from "./types";



export function flatToMatrix(data: link[]): matrixData[] {
    const names = Array.from(
        new Set(data.flatMap(d => [d.source, d.target]))
    );

    const valueMap = new Map(
        data.map(d => [`${d.source}|${d.target}`, d.value])
    );

    return names.map(name => ({
        name,
        values: names.map(target =>
            valueMap.get(`${name}|${target}`) ?? 0
        )
    }));
}