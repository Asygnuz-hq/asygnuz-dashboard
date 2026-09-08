"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import EmployeesTable from "./components/EmployeesTable";
import PayrollTable from "./components/PayrollTable";

const now = new Date();

export default function HrPage() {
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Nómina / RRHH"
        subtitle="Empleados, contratos y liquidación de nómina con aportes de ley."
      />
      <EmployeesTable />
      <PayrollTable month={month} year={year} />
    </div>
  );
}
