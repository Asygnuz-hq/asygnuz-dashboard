# Flujos de n8n — Bandeja de Instagram & Automatizaciones ASYGNUZ

Este directorio contiene los flujos listos para importar en la instancia de n8n alojada en el VPS (`https://35-231-56-44.sslip.io`).

---

## 1. Archivos incluidos

1. **`instagram-meta.json` (Flujo A — Webhook de Instagram):**
   - **GET:** Responde el `hub.challenge` de verificación exigido por Meta en texto plano si coincide con el `META_VERIFY_TOKEN`.
   - **POST:** Valida la firma criptográfica `X-Hub-Signature-256` (HMAC SHA-256) contra el `META_INSTAGRAM_APP_SECRET`. Responde `200 OK` de inmediato a Meta para cumplir el SLA y enruta DMs y comentarios sin IA hacia Supabase (`ig_eventos`, `ig_conversaciones`, `ig_mensajes`, `ig_acciones`).
   - Deduplica por `meta_evento_id` e ignora ecos de la propia cuenta.
   - Aplica el límite seguro de **máximo 60 respuestas automáticas por hora**.

2. **`instagram-alertas.json` (Flujo B — Alertas cada 15 minutos):**
   - Revisa conversaciones en estado `pendiente` cuyo último mensaje del usuario esté entre 21 y 24 horas de antigüedad (menos de 3 horas restantes de la ventana de 24 horas).
   - Envía un mensaje consolidado con los usuarios pendientes y el tiempo restante para evitar que se venza la ventana.
   - El nodo de salida permite configurar WhatsApp, Telegram, Slack o correo fácilmente.

---

## 2. Variables de Entorno / Credenciales en n8n

En n8n, ve a **Settings → Variables** o configura las variables de entorno en el contenedor/VPS:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SUPABASE_URL` | URL de tu proyecto de Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta service_role (nunca expuesta al cliente) | `eyJhbGciOi...` |
| `META_VERIFY_TOKEN` | Token secreto que inventas para validar el webhook en Meta | `asygnuz_ig_webhook_2026_secret` |
| `META_INSTAGRAM_APP_SECRET` | Secret de la App de Instagram en Meta Developers | `a1b2c3d4e5f6...` |
| `CANAL_ALERTA_WEBHOOK_URL` | (Opcional) Webhook para recibir las alertas de 15m | `https://...` |

---

## 3. Pasos de Importación en n8n

1. Entra a tu panel de n8n: `https://35-231-56-44.sslip.io`
2. En el menú superior izquierdo, haz clic en **Workflows → Import from File**.
3. Selecciona `n8n/instagram-meta.json` y guárdalo con el nombre **`instagram-meta`**.
4. Haz clic en **Activate** (switch arriba a la derecha).
5. Repite el proceso para `n8n/instagram-alertas.json` y activa el flujo.

---

## 4. Configuración en Meta Developers ("ASYGNUZ Métricas")

1. Entra a [developers.facebook.com](https://developers.facebook.com) y abre tu App (**ASYGNUZ Métricas** en modo desarrollo).
2. En el menú lateral, ve a **Instagram → Configuración de la API (o Webhooks)**.
3. Haz clic en **Editar suscripción** (Callback URL):
   - **URL de devolución de llamada:** `https://35-231-56-44.sslip.io/webhook/instagram-meta`
   - **Token de verificación:** El mismo valor que pusiste en `META_VERIFY_TOKEN`.
4. Haz clic en **Verificar y guardar**. Meta enviará la petición GET y n8n responderá el challenge automáticamente.
5. Suscríbete a los campos:
   - `messages` (DMs entrantes)
   - `comments` (Comentarios en posts y reels)
   - `messaging_postbacks` (Clics en botones)
