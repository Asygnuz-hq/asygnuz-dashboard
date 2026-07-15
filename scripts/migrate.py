#!/usr/bin/env python3
"""
Migra los datos de los 3 Excel originales de ASYGNUZ a Supabase.

Requisitos:
  pip3 install --user openpyxl requests
  Haber corrido supabase/schema.sql en el proyecto de Supabase.
  Tener .env.local (en la raíz del proyecto) con:
    NEXT_PUBLIC_SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...

Uso:
  python3 scripts/migrate.py
  python3 scripts/migrate.py --control "/ruta/Control.xlsx" --finanzas "/ruta/Finanzas.xlsx" --personal "/ruta/Personal.xlsx"

Es seguro correrlo varias veces sobre una base vacía; si ya corriste una vez
y vuelves a correrlo, se duplicarán las filas (excepto diseñadores, que usan
upsert por nombre). Si necesitas repetir la migración, vacía las tablas
primero desde el SQL Editor de Supabase.
"""

import argparse
import json
import os
import re
import sys
from datetime import date, datetime

import openpyxl
import requests

MESES_ES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11,
    "diciembre": 12,
}

DEFAULT_FILES = {
    "control": "/Users/juanmanuel/Downloads/Asygnuz_Control_Diseñadores (4) (1).xlsx",
    "finanzas": "/Users/juanmanuel/Downloads/ASYGNUZ_Finanzas (1).xlsx",
    "personal": "/Users/juanmanuel/Downloads/Contabilidad perosnales.xlsx",
}

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# --------------------------------------------------------------------------
# Config / conexión
# --------------------------------------------------------------------------

def load_env_file(path):
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def get_config():
    env = load_env_file(os.path.join(PROJECT_ROOT, ".env.local"))
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n"
            "Complétalos en .env.local (raíz del proyecto) antes de correr este script."
        )
    return url.rstrip("/"), key


# --------------------------------------------------------------------------
# Helpers de parseo
# --------------------------------------------------------------------------

def parse_mes(value):
    """Normaliza a 'YYYY-MM-01'. Acepta datetime o texto tipo 'Junio 2026'."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return f"{value.year:04d}-{value.month:02d}-01"
    if isinstance(value, date):
        return f"{value.year:04d}-{value.month:02d}-01"
    if isinstance(value, str):
        m = re.match(r"\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(\d{4})", value.strip())
        if m:
            month = MESES_ES.get(m.group(1).lower())
            if month:
                return f"{int(m.group(2)):04d}-{month:02d}-01"
    return None


def parse_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        v = value.strip()
        m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", v)
        if m:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return f"{y:04d}-{mo:02d}-{d:02d}"
    return None


def num(value, default=0):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def text(value):
    if value is None:
        return None
    v = str(value).strip()
    return v or None


def is_truthy_es(value):
    v = (text(value) or "").strip().lower()
    return v in ("si", "sí", "true", "1", "yes")


def derive_trm(monto_original, cop_equivalente, fallback):
    """Reconstruye la TRM implícita en las columnas 'Equiv. COP (auto)' del Excel."""
    o = num(monto_original, 0)
    c = num(cop_equivalente, 0)
    if o:
        return round(c / o, 4)
    return fallback


# --------------------------------------------------------------------------
# Cliente REST de Supabase (usa la service_role key, evita RLS)
# --------------------------------------------------------------------------

class Supabase:
    def __init__(self, url, key):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def insert(self, table, rows, on_conflict=None):
        if not rows:
            return []
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {}
        prefer = "return=representation"
        if on_conflict:
            params["on_conflict"] = on_conflict
            prefer = "resolution=merge-duplicates," + prefer
        headers = dict(self.headers, Prefer=prefer)
        resp = requests.post(endpoint, headers=headers, params=params, data=json.dumps(rows, default=str))
        if resp.status_code >= 300:
            print(f"  ERROR insertando en {table}: {resp.status_code} {resp.text[:400]}")
            return []
        return resp.json()

    def update(self, table, filters, patch):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {k: f"eq.{v}" for k, v in filters.items()}
        headers = dict(self.headers, Prefer="return=minimal")
        resp = requests.patch(endpoint, headers=headers, params=params, data=json.dumps(patch, default=str))
        if resp.status_code >= 300:
            print(f"  ERROR actualizando {table}: {resp.status_code} {resp.text[:400]}")

    def select(self, table, select="*", filters=None):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {"select": select}
        if filters:
            params.update({k: f"eq.{v}" for k, v in filters.items()})
        resp = requests.get(endpoint, headers=self.headers, params=params)
        if resp.status_code >= 300:
            print(f"  ERROR leyendo {table}: {resp.status_code} {resp.text[:400]}")
            return []
        return resp.json()


# --------------------------------------------------------------------------
# Migración: ASYGNUZ_Finanzas
# --------------------------------------------------------------------------

def migrate_finanzas(sb, path):
    print(f"\n== Finanzas: {path} ==")
    wb = openpyxl.load_workbook(path, data_only=True)

    dash = wb["Dashboard"]
    trm_global = num(dash["B4"].value, 0)
    mes_activo = parse_mes(dash["E4"].value)
    print(f"  TRM del día: {trm_global} | Mes activo: {mes_activo}")
    sb.update("configuracion", {"id": 1}, {"trm_actual": trm_global, "mes_activo": mes_activo})

    # --- Ingresos (header fila 5, datos desde fila 6) ---
    ws = wb["Ingresos"]
    rows, skipped = [], 0
    for r in range(6, ws.max_row + 1):
        cliente = ws.cell(r, 1).value
        if not cliente:
            continue
        mes = parse_mes(ws.cell(r, 3).value)
        moneda = text(ws.cell(r, 4).value) or "COP"
        moneda = moneda if moneda in ("COP", "USD") else "COP"
        monto = num(ws.cell(r, 5).value)
        trm = derive_trm(monto, ws.cell(r, 6).value, trm_global) if moneda == "USD" else trm_global
        estado_raw = (text(ws.cell(r, 8).value) or "Pendiente").lower()
        if not mes:
            skipped += 1
            continue
        rows.append({
            "cliente": text(cliente),
            "concepto": text(ws.cell(r, 2).value),
            "mes": mes,
            "moneda": moneda,
            "monto_original": monto,
            "trm_aplicada": trm,
            "estado": "Cobrado" if estado_raw.startswith("cobr") else "Pendiente",
            "fecha_pago_real": parse_date(ws.cell(r, 9).value),
            "fecha_pago_esperada": parse_date(ws.cell(r, 10).value),
            "factura_no": text(ws.cell(r, 11).value),
            "notas": text(ws.cell(r, 12).value),
        })
    sb.insert("ingresos", rows)
    print(f"  Ingresos: {len(rows)} filas migradas, {skipped} omitidas (mes inválido)")

    # --- Gastos_Fijos (header fila 5, datos desde fila 6) ---
    ws = wb["Gastos_Fijos"]
    rows = []
    for r in range(6, ws.max_row + 1):
        concepto = ws.cell(r, 1).value
        if not concepto:
            continue
        moneda = text(ws.cell(r, 4).value) or "COP"
        moneda = moneda if moneda in ("COP", "USD") else "COP"
        monto = num(ws.cell(r, 5).value)
        trm = derive_trm(monto, ws.cell(r, 6).value, trm_global) if moneda == "USD" else trm_global
        rows.append({
            "concepto": text(concepto),
            "categoria": text(ws.cell(r, 3).value),
            "moneda": moneda,
            "monto": monto,
            "trm_aplicada": trm,
            "frecuencia": text(ws.cell(r, 7).value) or "Mensual",
            "activo": is_truthy_es(ws.cell(r, 8).value) if ws.cell(r, 8).value is not None else True,
            "proveedor": text(ws.cell(r, 9).value),
            "notas": text(ws.cell(r, 10).value),
        })
    sb.insert("gastos_fijos", rows)
    print(f"  Gastos Fijos: {len(rows)} filas migradas")

    # --- Gastos_Variables (header fila 5, datos desde fila 6) ---
    ws = wb["Gastos_Variables"]
    rows, skipped = [], 0
    for r in range(6, ws.max_row + 1):
        concepto = ws.cell(r, 1).value
        if not concepto:
            continue
        mes = parse_mes(ws.cell(r, 2).value)
        if not mes:
            skipped += 1
            continue
        moneda = text(ws.cell(r, 4).value) or "COP"
        moneda = moneda if moneda in ("COP", "USD") else "COP"
        monto = num(ws.cell(r, 5).value)
        trm = derive_trm(monto, ws.cell(r, 6).value, trm_global) if moneda == "USD" else trm_global
        rows.append({
            "concepto": text(concepto),
            "mes": mes,
            "categoria": text(ws.cell(r, 3).value),
            "moneda": moneda,
            "monto": monto,
            "trm_aplicada": trm,
            "fecha": parse_date(ws.cell(r, 7).value),
            "proveedor": text(ws.cell(r, 8).value),
            "proyecto_relacionado": text(ws.cell(r, 9).value),
            "notas": text(ws.cell(r, 10).value),
        })
    sb.insert("gastos_variables", rows)
    print(f"  Gastos Variables: {len(rows)} filas migradas, {skipped} omitidas (mes inválido)")

    # --- Inversiones (header fila 3, datos desde fila 4) ---
    ws = wb["Inversiones"]
    rows = []
    for r in range(4, ws.max_row + 1):
        desc = ws.cell(r, 2).value
        if not desc:
            continue
        moneda = text(ws.cell(r, 4).value) or "COP"
        moneda = moneda if moneda in ("COP", "USD") else "COP"
        monto_inv = num(ws.cell(r, 5).value)
        trm_entrada = derive_trm(monto_inv, ws.cell(r, 6).value, trm_global) if moneda == "USD" else trm_global
        valor_actual = num(ws.cell(r, 7).value)
        trm_valoracion = derive_trm(valor_actual, ws.cell(r, 8).value, trm_global) if moneda == "USD" else trm_global
        rows.append({
            "tipo": text(ws.cell(r, 1).value),
            "activo_descripcion": text(desc),
            "fecha_entrada": parse_date(ws.cell(r, 3).value),
            "moneda": moneda,
            "monto_invertido": monto_inv,
            "trm_entrada": trm_entrada,
            "valor_actual_manual": valor_actual,
            "trm_valoracion": trm_valoracion,
            "estado": text(ws.cell(r, 11).value),
            "notas": text(ws.cell(r, 12).value),
        })
    sb.insert("inversiones", rows)
    print(f"  Inversiones: {len(rows)} filas migradas")

    # --- Fundacion (header fila 3, datos desde fila 4) ---
    ws = wb["Fundacion"]
    rows = []
    for r in range(4, ws.max_row + 1):
        causa = ws.cell(r, 2).value
        if not causa:
            continue
        moneda = text(ws.cell(r, 5).value) or "COP"
        moneda = moneda if moneda in ("COP", "USD") else "COP"
        monto = num(ws.cell(r, 6).value)
        trm = derive_trm(monto, ws.cell(r, 7).value, trm_global) if moneda == "USD" else trm_global
        estado_raw = (text(ws.cell(r, 8).value) or "Comprometido").lower()
        rows.append({
            "fecha": parse_date(ws.cell(r, 1).value) or date.today().isoformat(),
            "causa_proyecto": text(causa),
            "beneficiario": text(ws.cell(r, 3).value),
            "descripcion": text(ws.cell(r, 4).value),
            "moneda": moneda,
            "monto": monto,
            "trm_aplicada": trm,
            "estado": "Pagado" if estado_raw.startswith("pag") else "Comprometido",
            "fecha_pago": parse_date(ws.cell(r, 9).value),
        })
    sb.insert("fundacion_donaciones", rows)
    print(f"  Fundación: {len(rows)} filas migradas")

    return mes_activo


# --------------------------------------------------------------------------
# Migración: Asygnuz_Control_Diseñadores
# --------------------------------------------------------------------------

def migrate_control(sb, path):
    print(f"\n== Diseñadores: {path} ==")
    wb = openpyxl.load_workbook(path, data_only=True)

    # --- Control Mensual (header fila 5, datos desde fila 6) ---
    ws = wb["Control Mensual"]
    nombres = set()
    tareas = []
    for r in range(6, ws.max_row + 1):
        nombre = text(ws.cell(r, 1).value)
        if not nombre:
            continue
        nombres.add(nombre)
        tareas.append({
            "disenador": nombre,
            "mes": parse_mes(ws.cell(r, 2).value),
            "proyecto_tarea": text(ws.cell(r, 3).value) or "(sin título)",
            "tipo": text(ws.cell(r, 4).value),
            "piezas_entregadas": num(ws.cell(r, 5).value),
            "revisiones": num(ws.cell(r, 6).value),
            "fecha_limite": parse_date(ws.cell(r, 7).value),
            "fecha_entregada": parse_date(ws.cell(r, 8).value),
            "estado": text(ws.cell(r, 9).value) or "Pendiente",
            "tarifa_cop": num(ws.cell(r, 10).value),
            "calificacion": num(ws.cell(r, 12).value, None),
            "aprobado": is_truthy_es(ws.cell(r, 13).value),
            "notas": text(ws.cell(r, 14).value),
        })

    sb.insert("disenadores", [{"nombre": n, "activo": True} for n in sorted(nombres)], on_conflict="nombre")
    id_map = {d["nombre"]: d["id"] for d in sb.select("disenadores", "id,nombre")}

    rows, skipped = [], 0
    for t in tareas:
        if not t["mes"] or t["disenador"] not in id_map:
            skipped += 1
            continue
        row = {k: v for k, v in t.items() if k != "disenador"}
        row["disenador_id"] = id_map[t["disenador"]]
        rows.append(row)
    sb.insert("control_mensual_tareas", rows)
    print(f"  Diseñadores: {len(id_map)} | Tareas: {len(rows)} migradas, {skipped} omitidas")

    # --- Cobros a Clientes (header fila 5, datos desde fila 6) ---
    ws = wb["Cobros a Clientes"]
    rows, skipped = [], 0
    for r in range(6, ws.max_row + 1):
        cliente = ws.cell(r, 1).value
        if not cliente:
            continue
        mes = parse_mes(ws.cell(r, 2).value)
        if not mes:
            skipped += 1
            continue
        rows.append({
            "cliente": text(cliente),
            "mes": mes,
            "proyecto_pieza": text(ws.cell(r, 3).value),
            "tipo": text(ws.cell(r, 4).value),
            "piezas_cobradas": num(ws.cell(r, 5).value),
            "tarifa_unit_usd": num(ws.cell(r, 6).value),
            "fecha_factura": parse_date(ws.cell(r, 8).value),
            "estado_cobro": text(ws.cell(r, 9).value) or "Pendiente",
            "pagado": is_truthy_es(ws.cell(r, 10).value),
            "margen_adicional_usd": num(ws.cell(r, 11).value, None),
            "notas": text(ws.cell(r, 12).value),
        })
    sb.insert("cobros_clientes", rows)
    print(f"  Cobros a Clientes: {len(rows)} filas migradas, {skipped} omitidas (mes inválido)")


# --------------------------------------------------------------------------
# Migración: Contabilidad personales
# --------------------------------------------------------------------------

def migrate_personal(sb, path):
    print(f"\n== Deudas personales: {path} ==")
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Hoja 1"]

    # 3 grupos de columnas, uno por socio "acreedor": (col deudor, col monto)
    groups = [
        ("Pablo", 2, 3),
        ("Juan Manuel", 5, 6),
        ("Andres", 8, 9),
    ]
    rows = []
    for r in range(4, ws.max_row + 1):
        for acreedor, col_deudor, col_monto in groups:
            deudor = ws.cell(r, col_deudor).value
            monto = num(ws.cell(r, col_monto).value, 0)
            if not deudor or monto == 0:
                continue
            rows.append({
                "acreedor": acreedor,
                "deudor": text(deudor),
                "monto": monto,
                "moneda": "COP",
                "estado": "Pendiente",
            })
    sb.insert("deudas_personales", rows)
    print(f"  Deudas personales: {len(rows)} filas migradas")


# --------------------------------------------------------------------------
# Verificación final
# --------------------------------------------------------------------------

def print_verification(sb, mes_activo):
    print("\n== Verificación ==")
    hist = sb.select("v_historico_mensual", "*", {"mes": mes_activo})
    if hist:
        h = hist[0]
        print(f"  Mes activo ({mes_activo}) según v_historico_mensual:")
        print(f"    Ingresos COP:      {h['ingresos_cop']:,.0f}")
        print(f"    Gastos COP:        {h['gastos_cop']:,.0f}")
        print(f"    Utilidad Neta COP: {h['utilidad_neta_cop']:,.0f}")
        print(f"    Margen:            {h['margen_pct'] * 100:.1f}%")
        print("  Compara estos valores contra la fila 8 de la pestaña 'Dashboard' del Excel original.")
    else:
        print("  No se encontró fila en v_historico_mensual para el mes activo (revisa que haya ingresos/gastos ese mes).")


def main():
    parser = argparse.ArgumentParser(description="Migra los 3 Excel de ASYGNUZ a Supabase.")
    parser.add_argument("--control", default=DEFAULT_FILES["control"])
    parser.add_argument("--finanzas", default=DEFAULT_FILES["finanzas"])
    parser.add_argument("--personal", default=DEFAULT_FILES["personal"])
    args = parser.parse_args()

    url, key = get_config()
    sb = Supabase(url, key)

    mes_activo = migrate_finanzas(sb, args.finanzas)
    migrate_control(sb, args.control)
    migrate_personal(sb, args.personal)
    print_verification(sb, mes_activo)
    print("\nMigración completa.")


if __name__ == "__main__":
    main()
