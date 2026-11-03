# MCP de Asygnuz

Conecta Claude Code con un solo portal del dashboard. Puede leer su contexto, parrilla, flujos y avance, y crear o editar piezas de la parrilla si el token lo permite.

**No puede:** borrar piezas, cambiar flujos, enviar mensajes, publicar en Instagram ni ver finanzas, nómina, CRM, pauta u otros portales. Cada escritura queda en `agente_auditoria`.

## Instalar
1. Corre `supabase/schema-tokens-agente-mcp.sql` en Supabase **antes** de desplegar.
2. En `/portal-admin`, genera un token con alcance `MCP: <portal>`. Marca "Puede editar la parrilla" solo si hace falta.
3. Instala y registra el servidor:

```bash
cd mcp/asygnuz && npm install
```

```bash
claude mcp add asygnuz --env ASYGNUZ_AGENTE_TOKEN=asg_ag_tu_token -- node "$PWD/server.mjs"
```

`ASYGNUZ_API_URL` es opcional (por defecto `https://app.asygnuz.com`). Para revocar el acceso, usa "Revocar" en `/portal-admin`.

## Pruebas
```bash
cd mcp/asygnuz && npm test
```

```bash
node --experimental-strip-types scripts/test-agente-permisos.mjs
```
