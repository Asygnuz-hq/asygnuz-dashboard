-- ASYGNUZ Dashboard — Presupuesto mensual de pauta para Portal de Cliente.
-- Pega este script en Supabase → SQL Editor → Run. Idempotente.
--
-- Agrega a portal_proyecto el presupuesto mensual planeado de pauta en Meta Ads
-- para que el Panel de Avance calcule el ritmo de presupuesto (gastado vs planeado).

alter table portal_proyecto
add column if not exists presupuesto_mensual_pauta numeric null;

-- Verificación:
-- select tenant_id, presupuesto_mensual_pauta from portal_proyecto;
