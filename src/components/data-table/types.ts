export type ColumnType =
  | "text"
  | "number"
  | "date"
  | "month"
  | "select"
  | "boolean"
  | "foreign-select"
  | "readonly-cop"
  | "readonly-usd"
  | "readonly-percent"
  | "readonly-number"
  | "readonly-text"
  | "readonly-date"
  | "readonly-days-since";

export type ForeignKeyConfig = {
  /** Supabase table this column references */
  table: string;
  /** Column used as the option value (usually "id") */
  valueField: string;
  /** Column shown to the user (e.g. "nombre") */
  labelField: string;
};

export type ColumnDef = {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
  required?: boolean;
  foreignKey?: ForeignKeyConfig;
  defaultValue?: string | number | boolean;
  /** For type "readonly-days-since": which column holds the date to count from (defaults to "creado_en"). */
  sinceKey?: string;
};
