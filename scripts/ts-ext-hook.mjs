// Para correr pruebas con Node sobre src/: resuelve "./archivo" a "./archivo.ts" (Next lo hace solo).
// Uso: node --import ./scripts/ts-ext-hook.mjs scripts/test-....mjs
import { registerHooks } from "node:module";
registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (e) {
      if (spec.startsWith(".") && !spec.endsWith(".ts")) return next(`${spec}.ts`, ctx);
      throw e;
    }
  },
});
