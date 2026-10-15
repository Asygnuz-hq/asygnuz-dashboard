---
name: bandeja-instagram
description: Responder mensajes pendientes de Instagram en ASYGNUZ siguiendo la guía de marca de cada cliente con aprobación previa de JM.
---

# Skill de Claude Code — Bandeja de Instagram ASYGNUZ

Esta skill permite a Claude responder conversaciones pendientes de Instagram desde el terminal, utilizando las rutas de agente protegidas del dashboard (`/api/bandeja/agente/*`), aplicando el tono y directrices de la guía de marca de cada cuenta, y **esperando siempre la aprobación explícita de JM** antes de realizar cualquier envío.

---

## 1. Configuración de Entorno

El token de agente se lee exclusivamente desde la variable de entorno `ASYGNUZ_BANDEJA_TOKEN` (generado en `/portal-admin`). Nunca escribas claves directamente en este archivo.

Asegúrate de tener en tu shell:
```bash
export ASYGNUZ_BANDEJA_TOKEN="asg_ag_..."
export ASYGNUZ_API_URL="https://app.asygnuz.com" # o http://localhost:3000 en local
```

---

## 2. Instrucciones de Ejecución para Claude

Cuando JM te pida: *"revisa los mensajes de Instagram"*, *"revisa los DMs pendientes"* o uses esta skill:

### Paso 1: Consultar Pendientes
Ejecuta la siguiente llamada HTTP (usando `curl` o fetch):
```bash
curl -s -X GET "$ASYGNUZ_API_URL/api/bandeja/agente/pendientes" \
  -H "Authorization: Bearer $ASYGNUZ_BANDEJA_TOKEN"
```

Si no hay pendientes, responde:
> "🎉 ¡Bandeja al día! No hay conversaciones pendientes dentro de la ventana de 24 horas."

### Paso 2: Redactar Propuestas según la Guía de Marca y Canal Permitido
Por cada conversación devuelta en la lista:
1. Revisa el campo **`canal_respuesta`** devuelto por la API:
   - **`dm`**: El usuario envió un mensaje directo y su ventana de 24 horas está abierta (`horas_restantes > 0`). Se responde normalmente por DM.
   - **`respuesta_privada`**: La conversación proviene de un comentario en un post/reel. El usuario **NUNCA** ha enviado un DM. Meta permite **una única respuesta privada** dentro de un plazo de 7 días. Se enviará automáticamente vinculada al comentario de origen.
   - **`solo_publica`**: **PROHIBIDO ENVIAR DM EN FRÍO** (puede causar suspensión o bloqueo de la cuenta por spam en Meta). La respuesta privada única ya fue utilizada o expiraron los 7 días. En este canal solo se permite responder públicamente al comentario con `"tipo_envio": "publica"`.
2. Analiza el historial de los últimos mensajes o del comentario.
3. Lee atentamente el campo `guia_marca` del cliente:
   - Aplica el tono solicitado (formal/informal, médico, cercano).
   - Respeta estrictamente los precios públicos y lo que **NO** se debe prometer.
   - Si el usuario muestra interés en comprar o consultar, incluye el link de agenda.

### Paso 3: Presentar a JM para Aprobación (NO ENVIAR AÚN)
Muestra a JM una tabla o lista clara con las propuestas de respuesta, indicando claramente el canal:

```markdown
### 📬 Respuestas Propuestas para Aprobación

1. **Cliente:** Dra. Ingrid Patiño | **Usuario:** @carlos_medina | **Canal:** 💬 DM directo (Vence en 4 h)
   - **Último mensaje recibido:** "¿Cuánto cuesta la consulta y dónde están ubicados?"
   - **Respuesta propuesta:**
     > "¡Hola Carlos! La consulta dermatológica tiene un valor de $250.000 COP y estamos ubicados en El Poblado, Medellín. Puedes agendar tu espacio con nuestro equipo aquí: https://wa.me/573001234567. ¡Será un gusto atenderte!"

2. **Cliente:** Dra. Ingrid Patiño | **Usuario:** @mariana_g | **Canal:** 🔒 Respuesta privada a comentario (1 permitida en 7 días)
   - **Comentario en post:** "Información del tratamiento facial por favor"
   - **Respuesta privada propuesta:**
     > "¡Hola Mariana! Te enviamos la información completa de nuestro tratamiento por privado. Incluye valoración facial y protocolo personalizado..."

3. **Cliente:** Dra. Ingrid Patiño | **Usuario:** @pedro_l | **Canal:** 📢 Solo pública (DM en frío bloqueado)
   - **Comentario:** "Excelente servicio 🙌"
   - **Respuesta pública propuesta (tipo_envio: "publica"):**
     > "¡Muchas gracias Pedro! Nos alegra mucho atenderte."

---
¿Deseas enviar todas las respuestas, modificar alguna o aprobarlas una por una?
```

### Paso 4: Envío tras Aprobación
**SOLO tras confirmación explícita de JM** (ej. *"aprobado"*, *"envíalas"*, o cambios específicos), realiza el POST por cada conversación aprobada:

```bash
curl -s -X POST "$ASYGNUZ_API_URL/api/bandeja/agente/responder" \
  -H "Authorization: Bearer $ASYGNUZ_BANDEJA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversacion_id": "<ID_CONVERSACION>",
    "texto": "<TEXTO_APROBADO>",
    "tipo_envio": "automatica"
  }'
```
*(Para responder públicamente a comentarios en canal `solo_publica`, usa `"tipo_envio": "publica"`).*

### Paso 5: Reporte Final
Informa a JM con el resumen del proceso:
- Número de mensajes enviados exitosamente (quedarán registrados con la etiqueta `🤖 Claude` en el dashboard).
- Conversaciones que quedaron pendientes o que requieran atención manual.

---

## 3. Instalación de la Skill en tu Mac

Para tenerla disponible globalmente en Claude Code, copia este archivo:
```bash
mkdir -p ~/.claude/skills/bandeja-instagram
cp docs/claude-bandeja/SKILL.md ~/.claude/skills/bandeja-instagram/SKILL.md
```
