# ASYGNUZ Dashboard

Panel financiero y operativo de ASYGNUZ: Finanzas, Diseñadores y Deudas Personales.
Reemplaza los 3 Excel (`Asygnuz_Control_Diseñadores`, `ASYGNUZ_Finanzas`, `Contabilidad personales`)
por una app web multiusuario con base de datos real.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Recharts · Supabase (Postgres + Auth + RLS) · Vercel.

## Puesta en marcha

1. **Base de datos**: crea un proyecto en [supabase.com](https://supabase.com), luego en
   **SQL Editor** pega y corre el contenido de [`supabase/schema.sql`](supabase/schema.sql).
2. **Variables de entorno**: copia `.env.local.example` a `.env.local` y completa con los
   valores de tu proyecto (Project Settings → API en Supabase):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
3. **Usuarios**: en Supabase → Authentication → Users, crea un usuario (email + contraseña)
   por cada persona que va a usar el dashboard.
4. **Instalar y correr en local**:
   ```bash
   npm install
   npm run dev
   ```
   Abre http://localhost:3000 e inicia sesión con uno de los usuarios creados.
5. **Migrar los datos de los Excel existentes** (una sola vez, después del paso 1):
   ```bash
   pip3 install --user openpyxl requests
   python3 scripts/migrate.py
   ```
   Lee las rutas de los 3 Excel por defecto desde `~/Downloads`; usa `--control`,
   `--finanzas`, `--personal` si están en otra ubicación.
6. **Desplegar en Vercel**:
   ```bash
   npx vercel login
   npx vercel --prod
   ```
   Agrega las mismas 3 variables de entorno del paso 2 en el proyecto de Vercel
   (Project Settings → Environment Variables) antes de desplegar.

## Estructura

- `src/app/(app)/` — páginas protegidas (dashboard + módulos), requieren sesión.
- `src/app/login/` — inicio de sesión.
- `src/components/data-table/` — tabla editable reutilizable (CRUD) y tabla de solo lectura para vistas calculadas.
- `supabase/schema.sql` — esquema completo: tablas, columnas calculadas, vistas de resumen y políticas de acceso.
- `scripts/migrate.py` — migración única de los 3 Excel a Supabase.
