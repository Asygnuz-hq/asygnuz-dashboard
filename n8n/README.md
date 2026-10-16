# Flujos de n8n — Bandeja de Instagram & Automatizaciones ASYGNUZ

Este directorio contiene los flujos listos para importar en la instancia de n8n alojada en el VPS (`https://35-231-56-44.sslip.io`).

---

## 1. Archivos incluidos

1. **`instagram-meta.json` (Flujo A — Webhook de Instagram: Verificación y Reenvío):**
   - **GET:** Responde el `hub.challenge` de verificación exigido por Meta en texto plano si coincide estrictamente con `META_VERIFY_TOKEN` (falla cerrada: 403 si no coincide o no está configurado).
   - **POST:** Valida la firma criptográfica `X-Hub-Signature-256` (HMAC SHA-256) contra `META_INSTAGRAM_APP_SECRET` con comparación segura de longitud y tiempo constante (`timingSafeEqual`, falla cerrada: 401 si no coincide o no está configurado).
   - **Arquitectura desacoplada:** Responde `200 OK` de inmediato a Meta para cumplir el SLA (<3s) y reenvía el cuerpo crudo y encabezados hacia el endpoint del dashboard:
     `POST /api/bandeja/procesar-evento` con encabezado `Authorization: Bearer $BANDEJA_N8N_SECRET`.
   - Toda la lógica de negocio (deduplicación en `ig_eventos`, límite de 60/h, respuestas públicas/privadas, links con tracking `/r/[id]`, bienvenida y prevención de DMs en frío) se ejecuta directamente en TypeScript en el dashboard (`src/lib/bandeja/procesar.ts`).

2. **`instagram-alertas.json` (Flujo B — Alertas cada 15 minutos):**
   - Revisa conversaciones en estado `pendiente` cuyo último mensaje del usuario esté entre 21 y 24 horas de antigüedad (menos de 3 horas restantes de la ventana de 24 horas).
   - Envía un mensaje consolidado con los usuarios pendientes y el tiempo restante para evitar que se venza la ventana.
   - El nodo de salida permite configurar WhatsApp, Telegram, Slack o correo fácilmente.

---

## 2. Variables de Entorno / Credenciales en n8n y Vercel

### En n8n (Settings → Variables o variables de entorno del contenedor):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `META_VERIFY_TOKEN` | Token secreto para validar el webhook en Meta (falla cerrada si falta) | `asygnuz_ig_verify_secret_...` |
| `META_INSTAGRAM_APP_SECRET` | App Secret de Instagram en Meta Developers (para HMAC SHA-256) | `a1b2c3d4e5f6...` |
| `BANDEJA_N8N_SECRET` | Secreto compartido para autenticar n8n contra el dashboard | `sec_n8n_dashboard_...` |
| `DASHBOARD_URL` | URL del dashboard de ASYGNUZ | `https://app.asygnuz.com` |
| `CANAL_ALERTA_WEBHOOK_URL` | (Opcional) Webhook para recibir las alertas de 15m | `https://...` |

### En Vercel (Variables de Entorno del Dashboard):
- `BANDEJA_N8N_SECRET`: Debe ser idéntico al configurado en n8n.
- `META_INSTAGRAM_APP_SECRET`: Para doble validación criptográfica en el endpoint `/api/bandeja/procesar-evento`.
- `BANDEJA_LIMITE_POR_HORA`: (Opcional, por defecto `60`) Tope de respuestas automáticas exitosas por cuenta por hora.

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

> **Actualización (2026-10-15):** n8n bloquea `require('crypto')` en los nodos Code (task runners). Por eso el flujo `instagram-meta` ya **no valida la firma**: recupera el cuerpo original desde `binary.data` (opción Raw Body), lo reenvía **byte por byte** (HTTP Request con `contentType: raw`) junto con `x-hub-signature-256`, y el dashboard (`/api/bandeja/procesar-evento`) valida la firma en tiempo constante, fallando cerrado. Avisos sin firma se rechazan con 401 en n8n.
