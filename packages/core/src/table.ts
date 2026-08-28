/**
 * Stable `./table.js` import path for the columnar data container.
 *
 * Free helpers live in table-coerce.ts; public types in table-types.ts; the
 * ColumnTable class in table-column.ts. This barrel re-exports all three —
 * the export list below must stay byte-identical (same names, same kinds).
 */

export type {
  CellValue,
  Columns,
  Discreteness,
  FieldType,
  ParsedColumnOptions,
  Rows,
} from "./table-types.js";
export {
  cellToNumber,
  cellsToNumeric,
  cellsToQuantitative,
  discretenessOf,
  inferFieldType,
  isISODateString,
} from "./table-coerce.js";
export { ColumnTable } from "./table-column.js";
