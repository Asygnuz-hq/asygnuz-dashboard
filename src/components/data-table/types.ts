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
  | "readonly-text";

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
};
