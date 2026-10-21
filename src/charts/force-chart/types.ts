import { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import { HierarchyCircularNode, HierarchyLink } from "d3";
import { hierarchyData } from "../../types";

export type networkNode = SimulationNodeDatum & {
    id: string;
    group?: number; 
    radius?: number;
    color?: string;
};

export type networkLink = SimulationLinkDatum<networkNode> & {
    source: string;
    target: string;
    value?: number;
    type?: string;
};

export type networkResolvedLink = Omit<networkLink, "source" | "target"> & {
    source: networkNode;
    target: networkNode;
    value?: number;
    type?: string;
};

export type networkDataType = {
    nodes: networkNode[], links: networkLink[]
}

export type networkEdge = [string, string]

export type networkHierarchyNode = SimulationNodeDatum & HierarchyCircularNode<hierarchyData>;
export type networkHierarchyLink = SimulationLinkDatum<networkHierarchyNode> & 
    HierarchyLink<hierarchyData> & 
    {
        value?: number;
    };