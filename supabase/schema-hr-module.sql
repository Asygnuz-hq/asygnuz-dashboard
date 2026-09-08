-- ENUMS
CREATE TYPE tipo_contrato AS ENUM ('termino_fijo', 'termino_indefinido', 'prestacion_servicios', 'obra_labor', 'aprendizaje');
CREATE TYPE estado_empleado AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE tipo_ausencia AS ENUM ('vacaciones', 'incapacidad', 'licencia_maternidad', 'licencia_paternidad', 'permiso_remunerado', 'permiso_no_remunerado');
CREATE TYPE estado_ausencia AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- 1. EMPLEADOS
CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    identificacion TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    estado estado_empleado DEFAULT 'activo',
    fecha_ingreso DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    eliminado_en TIMESTAMPTZ
);

-- 2. CONTRATOS Y CONDICIONES
CREATE TABLE contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
    tipo tipo_contrato NOT NULL,
    salario_base NUMERIC(12, 2) NOT NULL,
    auxilio_transporte NUMERIC(12, 2) DEFAULT 0,
    porcentaje_salud_empleado NUMERIC(5, 4) DEFAULT 0.04,
    porcentaje_pension_empleado NUMERIC(5, 4) DEFAULT 0.04,
    porcentaje_arl NUMERIC(5, 4) DEFAULT 0.00522,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    documento_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    eliminado_en TIMESTAMPTZ
);

-- 3. NÓMINA
CREATE TABLE nominas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periodo_mes INTEGER NOT NULL,
    periodo_anio INTEGER NOT NULL,
    estado TEXT DEFAULT 'borrador',
    total_devengado NUMERIC(12,2) DEFAULT 0,
    total_deducido NUMERIC(12,2) DEFAULT 0,
    total_aportes_empresa NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    eliminado_en TIMESTAMPTZ
);

CREATE TABLE nominas_detalle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomina_id UUID REFERENCES nominas(id) ON DELETE CASCADE,
    empleado_id UUID REFERENCES empleados(id),
    dias_trabajados INTEGER DEFAULT 30,
    salario_proporcional NUMERIC(12,2),
    auxilio_transporte_proporcional NUMERIC(12,2),
    deduccion_salud NUMERIC(12,2),
    deduccion_pension NUMERIC(12,2),
    aporte_salud_empresa NUMERIC(12,2),
    aporte_pension_empresa NUMERIC(12,2),
    aporte_arl NUMERIC(12,2),
    aporte_caja_compensacion NUMERIC(12,2),
    neto_a_pagar NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ
);

-- 4. AUSENCIAS Y VACACIONES
CREATE TABLE ausencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
    tipo tipo_ausencia NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_totales INTEGER NOT NULL,
    estado estado_ausencia DEFAULT 'pendiente',
    soporte_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    eliminado_en TIMESTAMPTZ
);

-- 5. COSTOS LABORALES POR PROYECTO
CREATE TABLE asignaciones_proyecto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
    kaneo_project_id TEXT NOT NULL,
    porcentaje_dedicacion NUMERIC(5, 4) NOT NULL,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    costo_imputado NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    eliminado_en TIMESTAMPTZ
);

-- 6. ONBOARDING
CREATE TABLE onboarding_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
    tarea TEXT NOT NULL,
    completado BOOLEAN DEFAULT false,
    fecha_completado TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ
);

-- POLÍTICAS RLS -- acceso total para cualquier usuario autenticado, igual
-- que el resto del dashboard (no hay concepto de cuenta/tenant aquí).
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleados_access" ON empleados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "contratos_access" ON contratos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "nominas_access" ON nominas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "nominas_detalle_access" ON nominas_detalle FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ausencias_access" ON ausencias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "asignaciones_access" ON asignaciones_proyecto FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "onboarding_access" ON onboarding_checklists FOR ALL USING (true) WITH CHECK (true);
