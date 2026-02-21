-- Backfill: marcar regalo de bienvenida como canjeado para todos los perfiles que aún no tienen registro.
insert into public.welcome_gifts (profile_id, redeemed_at, created_at)
select p.id, now(), now()
from public.profiles p
left join public.welcome_gifts wg on wg.profile_id = p.id
where wg.profile_id is null;
