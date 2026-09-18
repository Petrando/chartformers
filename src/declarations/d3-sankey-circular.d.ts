declare module "d3-sankey-circular" {
    import {
        SankeyNode,
        SankeyLink,
        SankeyGraph
    } from "d3-sankey";

    export interface SankeyCircularNodeExtra {
        circular?: boolean;
        circularPathData?: unknown;
        path?: unknown;
    }

    export interface SankeyCircularLinkExtra {
        circular?: boolean;
        circularPathData?: unknown;
    }

    export type SankeyCircularNode<Datum = unknown> =
        SankeyNode<Datum, SankeyCircularLink<Datum>> &
        SankeyCircularNodeExtra;

    export type SankeyCircularLink<Datum = unknown> =
        SankeyLink<Datum, SankeyCircularNode<Datum>> &
        SankeyCircularLinkExtra;

    export interface SankeyCircularGraph<Datum = unknown> {
        nodes: SankeyCircularNode<Datum>[];
        links: SankeyCircularLink<Datum>[];
    }

    export interface SankeyCircularGenerator<
        Datum = unknown,
        NodeDatum extends SankeyCircularNode<Datum> = SankeyCircularNode<Datum>,
        LinkDatum extends SankeyCircularLink<Datum> = SankeyCircularLink<Datum>
    > {
        (graph: {
            nodes: NodeDatum[];
            links: LinkDatum[];
        }): SankeyCircularGraph<Datum>;

        nodeWidth(): number;
        nodeWidth(value: number): this;

        nodePadding(): number;
        nodePadding(value: number): this;

        nodeAlign(): unknown;
        nodeAlign(value: unknown): this;

        nodeSort(): ((a: NodeDatum, b: NodeDatum) => number) | null;
        nodeSort(value: ((a: NodeDatum, b: NodeDatum) => number) | null): this;

        linkSort(): ((a: LinkDatum, b: LinkDatum) => number) | null;
        linkSort(value: ((a: LinkDatum, b: LinkDatum) => number) | null): this;

        extent(): [[number, number], [number, number]];
        extent(value: [[number, number], [number, number]]): this;

        size(): [number, number];
        size(value: [number, number]): this;
    }

    export function sankeyCircular<
        Datum = unknown,
        NodeDatum extends SankeyCircularNode<Datum> = SankeyCircularNode<Datum>,
        LinkDatum extends SankeyCircularLink<Datum> = SankeyCircularLink<Datum>
    >(): SankeyCircularGenerator<Datum, NodeDatum, LinkDatum>;
}