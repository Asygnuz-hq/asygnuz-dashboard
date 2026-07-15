"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ColumnDef } from "./types";
import {
  formatCOP,
  formatUSD,
  formatPercent,
  formatDate,
  formatMonth,
  currentMonthValue,
} from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type ForeignOptions = Record<string, { value: string; label: string }[]>;

type DataTableProps = {
  table: string;
  columns: ColumnDef[];
  monthFilterKey?: string;
  orderBy?: string;
  ascending?: boolean;
  hasCreatedBy?: boolean;
  /** Extra fixed `.eq()` filters applied to every query, e.g. scoping rows to a client. */
  filters?: { column: string; value: string }[];
  /** Values merged into every new row on create (e.g. cliente_id when scoped to a client). */
  fixedValues?: Row;
  /** If set, each row gets a "Ver" link to `${detailBasePath}/${row.id}`. */
  detailBasePath?: string;
  /** Called after any successful create/update/delete, e.g. to refresh KPIs elsewhere on the page. */
  onChange?: () => void;
};

function buildPayload(values: Row, cols: ColumnDef[]) {
  const payload: Row = {};
  for (const col of cols) {
    const v = values[col.key];
    if (col.type === "number") {
      payload[col.key] = v === "" || v === null || v === undefined ? 0 : Number(v);
    } else if (v === "") {
      payload[col.key] = null;
    } else {
      payload[col.key] = v;
    }
  }
  return payload;
}

export function DataTable({
  table,
  columns,
  monthFilterKey,
  orderBy,
  ascending = false,
  hasCreatedBy = true,
  filters,
  fixedValues,
  detailBasePath,
  onChange,
}: DataTableProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foreignOptions, setForeignOptions] = useState<ForeignOptions>({});
  const [monthFilter, setMonthFilter] = useState<string>("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Row>({});
  const [creating, setCreating] = useState(false);
  const [newValues, setNewValues] = useState<Row>({});

  const editableColumns = columns.filter((c) => !c.type.startsWith("readonly"));

  const selectString = useMemo(() => {
    const foreignSelects = columns
      .filter((c) => c.type === "foreign-select" && c.foreignKey)
      .map((c) => `${c.foreignKey!.table}(${c.foreignKey!.labelField})`);
    return ["*", ...foreignSelects].join(", ");
  }, [columns]);

  // filters is an array literal from the caller; key by JSON to avoid refetch
  // loops from a new-but-equal array reference on every render.
  const filtersKey = useMemo(() => JSON.stringify(filters ?? []), [filters]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from(table).select(selectString);
    for (const f of filters ?? []) query = query.eq(f.column, f.value);
    if (orderBy) query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) setError(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, table, selectString, orderBy, ascending, filtersKey]);

  useEffect(() => {
    // loadRows is an async data fetch; its setState calls happen after
    // an await, not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    async function loadForeignOptions() {
      const results: ForeignOptions = {};
      for (const col of columns) {
        if (col.type === "foreign-select" && col.foreignKey) {
          const fk = col.foreignKey;
          const { data } = await supabase
            .from(fk.table)
            .select(`${fk.valueField}, ${fk.labelField}`)
            .order(fk.labelField, { ascending: true });
          results[col.key] = ((data as Row[]) ?? []).map((r) => ({
            value: r[fk.valueField],
            label: r[fk.labelField],
          }));
        }
      }
      setForeignOptions(results);
    }
    loadForeignOptions();
  }, [columns, supabase]);

  const months = useMemo(() => {
    if (!monthFilterKey) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r[monthFilterKey]) set.add(r[monthFilterKey]);
    });
    return Array.from(set).sort().reverse();
  }, [rows, monthFilterKey]);

  const filteredRows = useMemo(() => {
    if (!monthFilterKey || monthFilter === "todos") return rows;
    return rows.filter((r) => r[monthFilterKey] === monthFilter);
  }, [rows, monthFilterKey, monthFilter]);

  function startCreate() {
    const defaults: Row = {};
    editableColumns.forEach((c) => {
      defaults[c.key] =
        c.defaultValue ??
        (c.type === "boolean" ? false : c.type === "month" ? currentMonthValue() : "");
    });
    setNewValues(defaults);
    setCreating(true);
    setError(null);
  }

  async function saveCreate() {
    setError(null);
    const payload = { ...buildPayload(newValues, editableColumns), ...fixedValues };
    if (hasCreatedBy) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      payload.created_by = user?.id ?? null;
    }
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      setError(error.message);
      return;
    }
    setCreating(false);
    setNewValues({});
    loadRows();
    onChange?.();
  }

  function startEdit(row: Row) {
    const values: Row = {};
    editableColumns.forEach((c) => {
      values[c.key] = row[c.key] ?? "";
    });
    setEditValues(values);
    setEditingId(row.id);
    setError(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    const payload = buildPayload(editValues, editableColumns);
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    loadRows();
    onChange?.();
  }

  async function deleteRow(id: string) {
    if (!confirm("¿Eliminar esta fila? Esta acción no se puede deshacer.")) return;
    setError(null);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    loadRows();
    onChange?.();
  }

  function renderReadValue(col: ColumnDef, row: Row) {
    const value = row[col.key];
    switch (col.type) {
      case "readonly-cop":
        return formatCOP(value);
      case "readonly-usd":
        return formatUSD(value);
      case "readonly-percent":
        return formatPercent(value);
      case "readonly-number":
        return value ?? "-";
      case "date":
        return formatDate(value);
      case "month":
        return formatMonth(value);
      case "boolean":
        return value ? "Sí" : "No";
      case "foreign-select":
        return col.foreignKey ? row[col.foreignKey.table]?.[col.foreignKey.labelField] ?? "-" : "-";
      default:
        return value === null || value === undefined || value === "" ? "-" : String(value);
    }
  }

  function renderInput(col: ColumnDef, values: Row, setValues: (v: Row) => void) {
    const value = values[col.key] ?? "";
    const onChange = (v: unknown) => setValues({ ...values, [col.key]: v });

    switch (col.type) {
      case "number":
        return (
          <input
            type="number"
            step="any"
            value={value}
            required={col.required}
            onChange={(e) => onChange(e.target.value)}
            className="w-28"
          />
        );
      case "date":
        return (
          <input
            type="date"
            value={value || ""}
            required={col.required}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "month":
        return (
          <input
            type="month"
            value={typeof value === "string" ? value.slice(0, 7) : ""}
            required={col.required}
            onChange={(e) => onChange(e.target.value ? `${e.target.value}-01` : "")}
          />
        );
      case "select":
        return (
          <select value={value} required={col.required} onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>
              Selecciona
            </option>
            {(col.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "foreign-select":
        return (
          <select value={value} required={col.required} onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>
              Selecciona
            </option>
            {(foreignOptions[col.key] ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            required={col.required}
            onChange={(e) => onChange(e.target.value)}
            className="w-40"
          />
        );
    }
  }

  function exportCSV() {
    const header = columns.map((c) => c.label);
    const rows = filteredRows.map((row) =>
      columns.map((col) => {
        const raw = col.type === "foreign-select" && col.foreignKey
          ? row[col.foreignKey.table]?.[col.foreignKey.labelField]
          : row[col.key];
        const text = raw === null || raw === undefined ? "" : String(raw);
        return `"${text.replace(/"/g, '""')}"`;
      })
    );
    const csv = [header.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {monthFilterKey && (
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="todos">Todos los meses</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="rounded-md border border-border bg-surface-alt text-sm px-3 py-1.5 text-muted hover:text-foreground"
          >
            Exportar CSV
          </button>
          {!creating && (
            <button
              onClick={startCreate}
              className="rounded-md bg-accent text-accent-foreground text-sm font-medium px-3 py-1.5"
            >
              + Agregar fila
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger rounded-md border border-danger/40 bg-danger/10 px-3 py-2">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <tr className="bg-surface-alt/50 border-t border-border">
                {columns.map((col) =>
                  col.type.startsWith("readonly") ? (
                    <td key={col.key} className="px-3 py-2 text-muted">
                      auto
                    </td>
                  ) : (
                    <td key={col.key} className="px-3 py-2">
                      {renderInput(col, newValues, setNewValues)}
                    </td>
                  )
                )}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={saveCreate} className="text-accent text-sm font-medium mr-3">
                    Guardar
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="text-muted text-sm"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted">
                  No hay datos todavía.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} className="border-t border-border hover:bg-surface-alt/40">
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                        {isEditing && !col.type.startsWith("readonly")
                          ? renderInput(col, editValues, setEditValues)
                          : renderReadValue(col, row)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(row.id)}
                            className="text-accent text-sm font-medium mr-3"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-muted text-sm mr-3"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {detailBasePath && (
                            <Link
                              href={`${detailBasePath}/${row.id}`}
                              className="text-accent text-sm font-medium mr-3"
                            >
                              Ver
                            </Link>
                          )}
                          <button
                            onClick={() => startEdit(row)}
                            className="text-foreground/80 text-sm mr-3"
                          >
                            Editar
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteRow(row.id)} className="text-danger text-sm">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
