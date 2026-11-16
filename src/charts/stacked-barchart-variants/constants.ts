import { type marginType } from "../../types";
import { type labelAxisType, type valueAxisType } from "./types";

export const defaultMargin = { top: 20, right: 30, bottom: 30, left: 30 }
export const defaultLabelAxis = {
    paddingInner: 0.4,//NOTE: in the component paddingInner is by default calculated according to container's width
    paddingOuter: 0.2,
    align: 0.2,
    displayGrid: false,
    tickSizeInner: 6,
    tickPadding: 3,
}

export const defaultValueAxis = {
    ticks: 10,
    displayGrid: true,
    tickSizeInner: 6,
    tickPadding: 3,
}