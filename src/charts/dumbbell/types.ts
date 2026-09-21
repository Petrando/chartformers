export type numericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export type dumbbellDatum = {
  label: string;
  [key: string]: number | string;
}