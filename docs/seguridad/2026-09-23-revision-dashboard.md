# Revisión de seguridad del dashboard — punto de partida para la segunda revisión

Fecha de la primera pasada: 23 de septiembre de 2026 (Claude, con un agente de lectura de código).
Repo: `Asygnuz-hq/asygnuz-dashboard` (Next.js 16 + Supabase, desplegado en Vercel).
Para: Warles Rivera — segunda revisión independiente (ver épica en Kaneo, proyecto ASYGNUZ Software).

Este documento dice **qué se revisó, qué se encontró, qué ya se corrigió y qué NO se ha verificado**. La idea es que no repitas lo hecho y te concentres en lo que falta o en romper lo que ya se arregló.

## Modelo de seguridad en una página

- **Auth:** Supabase Auth (correo + contraseña, CAPTCHA Turnstile, 2FA TOTP opcional). El registro público está **apagado** (`disable_signup: true`).
- **Tenant:** tabla `tenants`; `profiles.tenant_id`; `tenant_id` en ~27 tablas de negocio. Las policies RLS filtran por `current_tenant_id()` (función `security definer`).
- **Módulos por tenant:** `tenants.modulos_habilitados` (jsonb), fail-closed. Se exige en el middleware (`src/lib/supabase/middleware.ts`) y en rutas puntuales (`/api/espocrm/metrics`).
- **2FA en base de datos:** policy RLS *restrictiva* `mfa_requerido` (`mfa_ok()`): quien ya tiene un factor verificado necesita `aal2`. No obliga a quien aún no activó 2FA.
- **Secretos por tenant:** `tenant_kaneo` y `tenant_kaneo_fuentes` (RLS sin políticas: solo `service_role`). Los tokens de Meta viven en `meta_conexiones` y **ya no se pueden leer con la sesión del usuario** (SELECT revocado en esas columnas); solo el servidor los lee (`src/lib/meta/conexion.ts`).
- **Rutas API:** el middleware **excluye** `/api/*` (matcher). Cada ruta debe autenticarse sola.

Archivos SQL: `supabase/schema-tenants.sql`, `schema-tenants-branding.sql`, `schema-seguridad-sprint0.sql`, `schema-seguridad-sprint1a.sql`, `schema-seguridad-sprint1b.sql`. Prueba de aislamiento: `supabase/test-aislamiento.sql` (no deja datos: termina con una excepción a propósito).

## Hallazgos de la primera pasada

| Sev. | Hallazgo | Estado |
|---|---|---|
| Crítico | Tablas de RRHH (`empleados`, `contratos`, `nominas`, …) con `USING (true)` para el rol PUBLIC/anon | **Corregido** (sprint 0): policies por tenant solo `authenticated`, `revoke` a `anon`. Las tablas estaban vacías, no hubo fuga real |
| Crítico | Next.js 16.2.10 con CVE crítica y 3 altas | **Corregido**: 16.3.6, `npm audit` = 0 |
| Alto | Registro abierto en Supabase + todo usuario nuevo caía en el tenant de ASYGNUZ | **Corregido**: registro apagado (manual, en el panel); `handle_new_user` manda a tenant "Sin asignar" |
| Alto | Un miembro podía hacerse `admin` o cambiarse de tenant (PATCH a `profiles`) | **Corregido**: trigger `proteger_profiles` |
| Alto | Tokens de Meta legibles vía PostgREST por cualquier usuario del tenant | **Corregido** (sprint 1b): SELECT revocado en columnas de token |
| Alto | 2FA solo en la interfaz | **Parcial**: `mfa_requerido` en BD para quien ya tiene factor. Falta forzar el alta y exigir `aal2` en `/api` (Kaneo #37) |
| Alto | EspoCRM con credenciales globales | **Mitigado, no resuelto**: `/api/espocrm/metrics` exige módulo `crm`. Falta `tenant_espocrm` (Kaneo #34) |
| Medio | OAuth de Meta sin `state` anti-CSRF | **Corregido**: nonce en cookie httpOnly (`src/lib/metaState.ts`) |
| Medio | Crons aceptaban `Bearer undefined` | **Corregido** (`src/lib/cronAuth.ts`) |
| Medio | `/api/mercado` y `/api/trm` sin sesión | **Corregido** + tope de símbolos y validación de fecha |
| Medio | Sin headers de seguridad (clickjacking) | **Corregido**: `X-Frame-Options`, `frame-ancestors 'none'`, nosniff, etc. No hay CSP completa a propósito (Turnstile/PostHog/Cal.com/iframes) |
| Medio | `configuracion` era una fila global | **Corregido** (1b): una fila por tenant |
| Medio | `exportar-publico` público con token en la URL; inyección de fórmulas | **Fórmulas corregidas**. Sin rate limit ni rotación de token (Kaneo #40) |
| Medio | Policies de Emergencia con `USING (true)`; formulario público sin captcha | **Pendiente** (Kaneo #41) |
| Bajo | `taskId`/`projectId` de Kaneo sin validar/codificar; errores upstream expuestos | **Pendiente** (Kaneo #38) |
| Bajo | Bodies de POST sin validar (no hay zod) | **Pendiente** (Kaneo #42) |
| Info | Vistas `v_*` con `security_invoker` en el SQL, pero no comprobado en la BD real | **Sin verificar** (Kaneo #29) |

## Lo que se probó (evidencia)

- `supabase/test-aislamiento.sql` (23-sep): usuario de otro tenant, usuario "Sin asignar" y clave anónima. 28 comprobaciones OK: no ven datos de ASYGNUZ, no pueden UPDATE/DELETE ajeno, no leen `access_token`, no se hacen admin ni cambian de tenant; `anon` sin permiso en RRHH y `meta_conexiones`.
- Producción, sin sesión: rutas endurecidas responden 401; páginas protegidas redirigen a `/login`; headers presentes.

## Lo que NO se ha verificado (empieza por aquí)

1. **Vistas `v_*` en la base real:** `pg_class.reloptions` de `v_historico_mensual`, `v_saldo_cuentas`, `v_rentabilidad_cliente`, `v_roi_campanas`, `v_costo_equipo_mes`. `create or replace view` puede resetear `security_invoker`.
2. **Grants a `anon`/`authenticated`** en todas las tablas y funciones (solo se revisaron las de RRHH y Meta). Funciones `security definer` ejecutables por `public`.
3. **Sesiones reales de dos tenants** (no simuladas con `set role`): IDOR con ids cambiados en `/api/meta/*` y `/api/kaneo/*` (`?conexion_id=`, `?fuente=`, `projectId`).
4. **Escritura cruzada:** `INSERT` con el `tenant_id` de otro tenant (solo se probó UPDATE/DELETE sobre filas ajenas).
5. **Rutas que usan `service_role`** (Kaneo, `exportar-publico`, crons, meta): ¿alguna actúa sobre datos que la sesión no puede ver?
6. **Ajustes de Supabase Auth:** confirmación de correo, límites de intentos, duración de sesión, CAPTCHA también en registro/recuperación.
7. **Variables en Vercel:** qué es `NEXT_PUBLIC_*` y qué no; qué hay en Preview vs Production (las de Meta estaban solo en Production).
8. **Embed de Kaneo** (`/kaneo`, iframe global): impacto multi-tenant y `frame-ancestors` de Kaneo (solo permite `app.asygnuz.com`, que aún no existe).
9. **Flujo de recuperación de contraseña / invitaciones** de Supabase.
10. **PostHog:** un dashboard público compartido con el uso de todos los tenants (`/analitica`, Kaneo #30).

## Cómo reproducir

- Aislamiento: pegar `supabase/test-aislamiento.sql` en el SQL Editor **de un proyecto de prueba** con los SQL del repo aplicados. El mensaje de error final es el reporte.
- Rutas sin sesión: `curl -i https://asygnuz-dashboard.vercel.app/api/<ruta>` debe dar 401.

## Fuera de alcance

Kaneo (ya tiene su propio informe), pentest externo, WAF, SSO empresarial.
