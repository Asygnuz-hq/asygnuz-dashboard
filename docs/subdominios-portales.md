# Subdominios para Portales Exclusivos (`*.asygnuz.com`)

Cada cliente con el módulo `portal_cliente` puede abrir su portal desde su propio subdominio (ej. `https://lumia.asygnuz.com`), con apertura animada de su logo y pantalla de login white-label.

## 1. Base de datos (una sola vez)

En **Supabase → SQL Editor**, ejecutar en orden:
1. `supabase/schema-portal-exclusivo.sql` (columnas de subdominio/marca, Parrilla v2, aprobación 1 clic y tabla `portal_hojas`).
2. `supabase/seed-portal-lumia.sql` (crea el portal de Lumia precargado con Black Week, Jornada 1, Banco de Ideas, Benchmarking, Matriz de Ángulos y Listas de Tomas).

## 2. DNS y Vercel (activar `*.asygnuz.com` o subdominios puntuales)

### Opción recomendada (automática para todos los clientes futuros)
1. En tu proveedor DNS de `asygnuz.com` (ej. Cloudflare):
   - Crear un registro **CNAME** `*` → `cname.vercel-dns.com` (Proxy desactivado / DNS Only si Vercel emite el SSL).
   - Nota: en DNS los registros explícitos existentes (`app`, `kaneo`, `crm`) siempre tienen prioridad y no se ven afectados.
2. En **Vercel → proyecto `asygnuz-dashboard` → Settings → Domains**:
   - Agregar `*.asygnuz.com` (o agregar uno por uno, ej. `lumia.asygnuz.com`, si prefieres control manual).

## 3. Cloudflare Turnstile y Supabase Auth

1. **Cloudflare Turnstile** (donde está tu widget de `NEXT_PUBLIC_TURNSTILE_SITE_KEY`):
   - En *Hostname Management*, agregar `asygnuz.com` (cubre subdominios) o `lumia.asygnuz.com`. Sin esto, el CAPTCHA rechazará el login en el subdominio.
2. **Supabase → Authentication → URL Configuration**:
   - En *Redirect URLs*, agregar `https://*.asygnuz.com/**`.

## 4. Dar de alta al usuario del cliente

1. En **Supabase → Authentication → Users → Add user**: crear el usuario (ej. correo de Sebastián o Dr. Alejandro).
2. En **ASYGNUZ → Portales de Clientes → Lumia Odontología → Acceso del cliente**: escribir ese correo y hacer clic en **Vincular**.

## 5. Probar antes de apuntar el DNS

- Desde `app.asygnuz.com/portal-admin` → entra a **Lumia Odontología** → **Ver como lo ve el cliente** → botón **Probar apertura con logo**.
- También puedes previsualizar el login white-label de cualquier cliente en `https://app.asygnuz.com/login?portal=lumia`.
