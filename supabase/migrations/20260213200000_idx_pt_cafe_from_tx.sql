-- Índice para consultas de "canjeado en mi cafetería" (ownerSummary)
create index if not exists idx_pt_cafe_from_tx on public.point_transactions(cafe_id, from_profile_id, tx_type);
