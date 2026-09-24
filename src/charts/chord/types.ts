export type node = {
    name: string; color: string;
}

export type link = {
    source: string; target: string; value: number;
}

export type matrixData = {
  name: string;
  values: number[];
};

export type chordData = {
    nodes?: node[]; links: link[];
}

export type chordDatum = {
    name: string;
    values: number[]
}