-- cafe_staff: cedula + pin_hash para login de empleados (creados por dueño)
alter table public.cafe_staff
  add column if not exists cedula text,
  add column if not exists pin_hash text;

-- unique por cafetería + cédula (un empleado una cédula por café)
create unique index if not exists idx_cafe_staff_cafe_cedula_unique
  on public.cafe_staff (cafe_id, cedula)
  where cedula is not null and cedula <> '';

-- cuando hay cédula debe haber pin_hash
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cafe_staff_cedula_pin_check') then
    alter table public.cafe_staff
      add constraint cafe_staff_cedula_pin_check check (
        (cedula is null or trim(cedula) = '') or (pin_hash is not null and length(trim(pin_hash)) > 0)
      );
  end if;
end $$;

-- point_transactions: actor staff (empleado que ejecutó la transacción)
alter table public.point_transactions
  add column if not exists actor_staff_id uuid references public.cafe_staff(id) on delete set null;

create index if not exists idx_point_transactions_actor_staff_id on public.point_transactions(actor_staff_id);
