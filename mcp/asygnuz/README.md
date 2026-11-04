# MCP de Asygnuz

Conecta Claude Code con un solo portal del dashboard. Puede leer su contexto, parrilla, flujos y avance, y crear o editar piezas de la parrilla y flujos automáticos de Instagram si el token lo permite.

**No puede:** borrar piezas ni flujos, enviar mensajes, publicar en Instagram ni ver finanzas, nómina, CRM, pauta u otros portales. Cada escritura queda en `agente_auditoria`.

## Instalar
1. Corre `supabase/schema-tokens-agente-mcp.sql` en Supabase **antes** de desplegar.
2. En `/portal-admin`, genera un token con alcance `MCP: <portal>`. Marca "Puede editar la parrilla y los flujos automáticos" solo si hace falta.
3. Instala y registra el servidor:

```bash
cd mcp/asygnuz && npm install
```

```bash
claude mcp add asygnuz --env ASYGNUZ_AGENTE_TOKEN=asg_ag_tu_token -- node "$PWD/server.mjs"
```

`ASYGNUZ_API_URL` es opcional (por defecto `https://app.asygnuz.com`). El token vence al año: cuando pase, genera otro en `/portal-admin` y vuelve a registrarlo. Para quitar el acceso antes, usa "Revocar".

## Flujos automáticos
`crear_flujo` y `actualizar_flujo` trabajan sobre la cuenta de Instagram vinculada al portal en `portal_meta_conexiones`. Sin ese vínculo, `listar_flujos` y `contexto.cuentas` salen vacíos y crear devuelve 409: vincula la cuenta en `/portal-admin`.

Un flujo creado aquí nace apagado. Al activarlo responde solo a personas reales, así que necesita aprobación explícita. La API rechaza dos flujos activos de la misma cuenta que compitan por una palabra y los DM de más de 1000 bytes.

## Pruebas
```bash
cd mcp/asygnuz && npm test
```

```bash
node --experimental-strip-types scripts/test-agente-permisos.mjs
```

```bash
node --experimental-strip-types scripts/test-agente-flujos.mjs
```
