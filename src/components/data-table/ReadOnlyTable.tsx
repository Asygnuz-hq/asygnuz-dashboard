"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ColumnDef } from "./types";
import { formatCOP, formatUSD, formatPercent, formatDate, formatMonth } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

type ReadOnlyTableProps = {
  source: string;
  columns: ColumnDef[];
  orderBy?: string;
  ascending?: boolean;
};

function renderValue(col: ColumnDef, row: Row) {
  const value = row[col.key];
  switch (col.type) {
    case "readonly-cop":
      return formatCOP(value);
    case "readonly-usd":
      return formatUSD(value);
    case "readonly-percent":
      return formatPercent(value);
    case "date":
      return formatDate(value);
    case "month":
      return formatMonth(value);
    default:
      return value === null || value === undefined || value === "" ? "-" : String(value);
  }
}

export function ReadOnlyTable({ source, columns, orderBy, ascending = false }: ReadOnlyTableProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from(source).select("*");
      if (orderBy) query = query.order(orderBy, { ascending });
      const { data } = await query;
      setRows((data as Row[]) ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, source, orderBy, ascending]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                Cargando...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                No hay datos todavía.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="border-t border-border">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                    {renderValue(col, row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
