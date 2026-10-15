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

### Paso 2: Redactar Propuestas según la Guía de Marca
Por cada conversación devuelta en la lista:
1. Analiza el historial de los últimos mensajes del usuario.
2. Lee atentamente el campo `guia_marca` del cliente:
   - Aplica el tono solicitado (formal/informal, médico, cercano).
   - Respeta estrictamente los precios públicos y lo que **NO** se debe prometer.
   - Si el usuario muestra interés en comprar o consultar, incluye el link de agenda.
3. Verifica que la ventana de 24 horas no haya vencido (`horas_restantes > 0`).

### Paso 3: Presentar a JM para Aprobación (NO ENVIAR AÚN)
Muestra a JM una tabla o lista clara con las propuestas de respuesta:

```markdown
### 📬 Respuestas Propuestas para Aprobación

1. **Cliente:** Dra. Ingrid Patiño | **Usuario:** @carlos_medina (Vence en 4 h)
   - **Último mensaje recibido:** "¿Cuánto cuesta la consulta y dónde están ubicados?"
   - **Respuesta propuesta:**
     > "¡Hola Carlos! La consulta dermatológica tiene un valor de $250.000 COP y estamos ubicados en El Poblado, Medellín. Puedes agendar tu espacio con nuestro equipo aquí: https://wa.me/573001234567. ¡Será un gusto atenderte!"

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
    "texto": "<TEXTO_APROBADO>"
  }'
```

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
