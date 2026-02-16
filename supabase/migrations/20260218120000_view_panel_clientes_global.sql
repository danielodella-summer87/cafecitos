-- 0) (opcional) ver si ya existe
-- select to_regclass('public.v_panel_clientes_global') as exists;

-- 1) Crear/actualizar la VIEW
create or replace view public.v_panel_clientes_global as
with tx as (
  select
    pt.id,
    pt.cafe_id,
    pt.created_at,
    pt.amount,
    pt.tx_type,
    case
      when pt.tx_type = 'earn'   then pt.to_profile_id
      when pt.tx_type = 'redeem' then pt.from_profile_id
      else null
    end as cliente_id
  from public.point_transactions pt
  where pt.tx_type in ('earn','redeem')
),
cliente_totales as (
  select
    cliente_id,
    count(*) as movimientos,
    sum(case when tx_type='earn'   then amount else 0 end) as generado,
    sum(case when tx_type='redeem' then amount else 0 end) as canjeado,
    ( sum(case when tx_type='earn'   then amount else 0 end)
    - sum(case when tx_type='redeem' then amount else 0 end) ) as neto
  from tx
  where cliente_id is not null
  group by cliente_id
),
cafeteria_preferida as (
  select
    cliente_id,
    cafe_id,
    sum(amount) as total_movido,
    row_number() over (partition by cliente_id order by sum(amount) desc) as rn
  from tx
  where cliente_id is not null and cafe_id is not null
  group by cliente_id, cafe_id
),
cafeteria_preferida_pick as (
  select cliente_id, cafe_id
  from cafeteria_preferida
  where rn = 1
)
select
  p.id as cliente_id,
  coalesce(p.full_name, 'Cliente ' || p.cedula, p.cedula) as cliente,
  coalesce(c.name, '—') as cafeteria_preferida,
  ct.movimientos,
  ct.generado,
  ct.canjeado,
  ct.neto
from cliente_totales ct
join public.profiles p on p.id = ct.cliente_id
left join cafeteria_preferida_pick cpp on cpp.cliente_id = ct.cliente_id
left join public.cafes c on c.id = cpp.cafe_id
where p.role = 'consumer'
order by ct.neto desc, ct.movimientos desc;

-- 2) Permisos (CLAVE para que PostgREST la vea)
grant usage on schema public to anon, authenticated;
grant select on public.v_panel_clientes_global to anon, authenticated;

-- 3) Recargar schema cache de PostgREST
notify pgrst, 'reload schema';
