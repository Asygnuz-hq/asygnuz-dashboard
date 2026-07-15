-- ASYGNUZ Dashboard — arregla la fuente de precios de cripto otra vez
-- (Binance también está bloqueado desde los servidores de Vercel; cambiamos a Coinbase)
-- Pega en Supabase → SQL Editor → New query → Run.

alter table mercado_watchlist drop constraint if exists mercado_watchlist_fuente_check;

update mercado_watchlist set fuente = 'coinbase', query_id = 'BTC' where simbolo = 'BTC';
update mercado_watchlist set fuente = 'coinbase', query_id = 'BNB' where simbolo = 'BNB';

alter table mercado_watchlist add constraint mercado_watchlist_fuente_check check (fuente in ('yahoo', 'coinbase'));
