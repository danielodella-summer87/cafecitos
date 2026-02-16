-- Niveles de cafeterías (independientes de tiers de clientes)
create table if not exists public.cafe_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_total_points integer not null default 0,
  badge_color text,
  created_at timestamptz default now()
);

create unique index if not exists idx_cafe_tiers_name on public.cafe_tiers(name);

alter table public.cafes
  add column if not exists cafe_tier_id uuid references public.cafe_tiers(id) on delete set null;

-- Vista: total neto (earn - redeem) por cafetería
create or replace view public.v_cafe_points_totals as
select
  pt.cafe_id,
  sum(
    case
      when pt.tx_type = 'earn'   then pt.amount
      when pt.tx_type = 'redeem' then -pt.amount
      else 0
    end
  )::int as total_points,
  count(*)::int as movimientos
from public.point_transactions pt
where pt.cafe_id is not null
group by pt.cafe_id;

-- Seeds (solo si no existen por nombre)
insert into public.cafe_tiers (name, min_total_points, badge_color)
select * from (values
  ('Bronce', 0,   '#B87333'),
  ('Plata', 200, '#C0C0C0'),
  ('Oro',   500, '#D4AF37'),
  ('Elite', 1000,'#111827')
) as v(name, min_total_points, badge_color)
where not exists (select 1 from public.cafe_tiers ct where ct.name = v.name);

-- Función: recalcular y asignar cafe_tier_id según total_points
create or replace function public.recalc_cafe_tiers()
returns void
language sql
security definer
as $$
  update public.cafes c
  set cafe_tier_id = t.id
  from public.v_cafe_points_totals agg
  join lateral (
    select id
    from public.cafe_tiers ct
    where ct.min_total_points <= coalesce(agg.total_points, 0)
    order by ct.min_total_points desc
    limit 1
  ) t on true
  where c.id = agg.cafe_id;

  -- Cafeterías sin movimientos quedan en el tier mínimo (Bronce)
  update public.cafes c
  set cafe_tier_id = (select id from public.cafe_tiers where min_total_points = 0 order by id limit 1)
  where c.id not in (select cafe_id from public.v_cafe_points_totals);
$$;

-- Ejecutar una vez al aplicar la migración
select public.recalc_cafe_tiers();
