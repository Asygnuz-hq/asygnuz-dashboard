"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type Employee = {
  id: string;
  nombres: string;
  apellidos: string;
  identificacion: string;
  estado: "activo" | "inactivo" | "suspendido";
  telefono: string;
  email: string | null;
  fecha_ingreso: string;
};

export default function EmployeesTable() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .is('eliminado_en', null)
      .order('nombres', { ascending: true });
      
    if (error) {
      console.error("Error fetching employees:", error);
    } else {
      setEmployees(data || []);
    }
    setIsLoading(false);
  };

  const handleFieldChange = (id: string, field: keyof Employee, value: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, [field]: value } : emp))
    );
  };

  const handleSave = async (id: string) => {
    const employeeToSave = employees.find((e) => e.id === id);
    if (!employeeToSave) return;
    
    // Update en Supabase
    const { error } = await supabase
      .from('empleados')
      .update({
        nombres: employeeToSave.nombres,
        apellidos: employeeToSave.apellidos,
        identificacion: employeeToSave.identificacion,
        telefono: employeeToSave.telefono,
        estado: employeeToSave.estado
      })
      .eq('id', id);

    if (error) {
      console.error("Error updating employee:", error);
      alert("Error al actualizar: " + error.message);
      // Revertir cambios en caso de error
      // fetchEmployees();
    } else {
      setEditingId(null);
    }
  };

  const handleAddExample = async () => {
    const newEmp = {
      nombres: "Nuevo",
      apellidos: "Empleado",
      identificacion: "000000",
      estado: "activo",
      telefono: "0000000",
      fecha_ingreso: new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('empleados')
      .insert([newEmp])
      .select();

    if (error) {
      console.error("Error inserting employee:", error);
      alert("Error al insertar: " + error.message);
    } else if (data) {
      setEmployees((prev) => [...prev, data[0] as Employee]);
    }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Cargando empleados...</div>;

  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950">
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="text-lg font-semibold">Directorio de Empleados</h2>
        <button 
          onClick={handleAddExample}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
        >
          + Nuevo Empleado
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nombres</th>
              <th className="px-4 py-3 font-medium">Apellidos</th>
              <th className="px-4 py-3 font-medium">Identificación</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No hay empleados registrados.
                </td>
              </tr>
            )}
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  {editingId === emp.id ? (
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full bg-background"
                      value={emp.nombres}
                      onChange={(e) => handleFieldChange(emp.id, "nombres", e.target.value)}
                    />
                  ) : (
                    emp.nombres
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === emp.id ? (
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full bg-background"
                      value={emp.apellidos}
                      onChange={(e) => handleFieldChange(emp.id, "apellidos", e.target.value)}
                    />
                  ) : (
                    emp.apellidos
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === emp.id ? (
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full bg-background"
                      value={emp.identificacion}
                      onChange={(e) => handleFieldChange(emp.id, "identificacion", e.target.value)}
                    />
                  ) : (
                    emp.identificacion
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === emp.id ? (
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full bg-background"
                      value={emp.telefono}
                      onChange={(e) => handleFieldChange(emp.id, "telefono", e.target.value)}
                    />
                  ) : (
                    emp.telefono || '-'
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === emp.id ? (
                    <select
                      className="border rounded px-2 py-1 w-full bg-background"
                      value={emp.estado}
                      onChange={(e) => handleFieldChange(emp.id, "estado", e.target.value as any)}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="suspendido">Suspendido</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.estado === "activo"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : emp.estado === "suspendido" 
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {emp.estado.charAt(0).toUpperCase() + emp.estado.slice(1)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {editingId === emp.id ? (
                    <button 
                      onClick={() => handleSave(emp.id)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Guardar
                    </button>
                  ) : (
                    <button 
                      onClick={() => setEditingId(emp.id)}
                      className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 font-medium"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
