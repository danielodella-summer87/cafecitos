-- 1) Ver cafés existentes (copiá el id que quieras)
select id, name, created_at
from public.cafes
order by created_at desc;

-- 2) Ver cuánto canjeó Rosyta por cada cafetería (sin pegar UUIDs)
select
  t.cafe_id,
  c.name as cafe_name,
  coalesce(sum(t.amount), 0) as redeemed_in_cafe
from public.point_transactions t
left join public.cafes c on c.id = t.cafe_id
where t.tx_type = 'redeem'
  and t.from_profile_id = (select id from public.profiles where cedula='40031685' limit 1)
group by t.cafe_id, c.name
order by redeemed_in_cafe desc;

-- 3) (opcional) Ver lo generado (earn) por cada cafetería
select
  t.cafe_id,
  c.name as cafe_name,
  coalesce(sum(t.amount), 0) as earned_in_cafe
from public.point_transactions t
left join public.cafes c on c.id = t.cafe_id
where t.tx_type = 'earn'
  and t.to_profile_id = (select id from public.profiles where cedula='40031685' limit 1)
group by t.cafe_id, c.name
order by earned_in_cafe desc;