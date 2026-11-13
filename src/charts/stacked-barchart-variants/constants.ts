import { type marginType } from "../../types";
import { type labelAxisType, type valueAxisType } from "./types";

export const defaultMargin = { top: 20, right: 30, bottom: 30, left: 30 }
export const defaultLabelAxis = {
    paddingInner: 0.4,//NOTE: in the component paddingInner is by default calculated according to container's width
    paddingOuter: 0.2,
    align: 0.2,
    tickSizeInner: 6,
}

export const defaultValueAxis = {
    ticks: 10,
    tickSizeInner: 6
}