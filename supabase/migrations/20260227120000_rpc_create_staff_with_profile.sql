-- Función atómica: crear profile (staff) + cafe_staff en una transacción.
-- Solo para uso desde server action con service role (bypass RLS).
-- Recibe pin_hash ya hasheado desde la app.

create or replace function public.create_staff_with_profile(
  p_cafe_id uuid,
  p_full_name text,
  p_role text,
  p_cedula text,
  p_pin_hash text,
  p_can_issue boolean default true,
  p_can_redeem boolean default true,
  p_is_active boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_staff_id uuid;
begin
  -- Validación cédula solo dígitos (en app también)
  if p_cedula is null or trim(p_cedula) = '' or p_cedula !~ '^[0-9]+$' then
    raise exception 'La cédula es obligatoria (solo dígitos).';
  end if;
  if length(trim(p_full_name)) < 2 then
    raise exception 'El nombre debe tener al menos 2 caracteres.';
  end if;
  if p_pin_hash is null or length(trim(p_pin_hash)) < 1 then
    raise exception 'El PIN es obligatorio.';
  end if;

  -- Duplicado: ya existe profile con esa cédula
  if exists (select 1 from public.profiles where cedula = p_cedula) then
    raise exception 'Ya existe un usuario con esa cédula.';
  end if;

  -- Duplicado: ya existe staff en este cafe con esa cédula
  if exists (
    select 1 from public.cafe_staff
    where cafe_id = p_cafe_id and cedula is not null and trim(cedula) = trim(p_cedula)
  ) then
    raise exception 'Ya existe un empleado con esa cédula en esta cafetería.';
  end if;

  -- 1) Insert profile (role staff)
  insert into public.profiles (role, full_name, cedula, pin_hash)
  values ('staff'::public.app_role, trim(p_full_name), p_cedula, p_pin_hash)
  returning id into v_profile_id;

  -- 2) Insert cafe_staff con profile_id
  insert into public.cafe_staff (
    cafe_id, full_name, name, role, cedula, pin_hash, profile_id,
    is_owner, can_issue, can_redeem, is_active
  )
  values (
    p_cafe_id, trim(p_full_name), trim(p_full_name), coalesce(nullif(trim(p_role), ''), 'Staff'),
    p_cedula, p_pin_hash, v_profile_id,
    false, coalesce(p_can_issue, true), coalesce(p_can_redeem, true), coalesce(p_is_active, true)
  )
  returning id into v_staff_id;

  return json_build_object('staff_id', v_staff_id, 'profile_id', v_profile_id);
end;
$$;

-- Permitir ejecución al service_role y a roles autenticados que usen la action
grant execute on function public.create_staff_with_profile(uuid, text, text, text, text, boolean, boolean, boolean) to service_role;
