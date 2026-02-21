-- Tabla de tracking del regalo de bienvenida (una activación por profile)
create table if not exists public.welcome_gifts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

-- RPC: canjear regalo de bienvenida con código DDMM (fecha registro en America/Montevideo)
create or replace function public.redeem_welcome_gift(p_profile_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_code text;
  v_profile_created_at timestamptz;
  v_already uuid;
begin
  -- Obtener created_at del perfil en timezone Uruguay
  select p.created_at into v_profile_created_at
  from public.profiles p
  where p.id = p_profile_id;

  if v_profile_created_at is null then
    return jsonb_build_object('ok', false, 'message', 'Perfil no encontrado');
  end if;

  v_expected_code := to_char((v_profile_created_at at time zone 'America/Montevideo'), 'DDMM');

  if trim(coalesce(p_code, '')) <> v_expected_code then
    return jsonb_build_object('ok', false, 'message', 'Código incorrecto');
  end if;

  -- Idempotencia: ya redimido?
  select profile_id into v_already
  from public.welcome_gifts
  where profile_id = p_profile_id and redeemed_at is not null;

  if v_already is not null then
    return jsonb_build_object('ok', false, 'message', 'El regalo ya fue activado');
  end if;

  -- Insertar movimiento +10 (earn) — mismo mecanismo que el resto de la app
  insert into public.point_transactions (
    tx_type,
    cafe_id,
    actor_owner_profile_id,
    from_profile_id,
    to_profile_id,
    amount,
    note
  ) values (
    'earn',
    null,
    null,
    null,
    p_profile_id,
    10,
    'Regalo de bienvenida'
  );

  -- Marcar como redimido (insert or update)
  insert into public.welcome_gifts (profile_id, redeemed_at)
  values (p_profile_id, now())
  on conflict (profile_id) do update set redeemed_at = now();

  return jsonb_build_object('ok', true, 'credited', 10, 'message', 'Regalo activado. ¡Disfrutá tus 10 cafecitos!');
end;
$$;

-- Permisos: la app llama con service role (server action), no hace falta grant a authenticated
grant execute on function public.redeem_welcome_gift(uuid, text) to service_role;
grant execute on function public.redeem_welcome_gift(uuid, text) to authenticated;

comment on table public.welcome_gifts is 'Registro de activación del regalo de bienvenida (código DDMM). Una vez por profile.';
