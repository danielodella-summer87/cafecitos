drop extension if exists "pg_net";

alter table "public"."cafe_reviews" drop constraint "cafe_reviews_cafe_id_profile_id_key";

alter table "public"."cafe_reviews" drop constraint "cafe_reviews_rating_check";

alter table "public"."cafe_staff" drop constraint "cafe_staff_cedula_pin_check";

alter table "public"."cafe_staff" drop constraint "cafe_staff_pin_hash_len_chk";

alter table "public"."point_transactions" drop constraint "point_transactions_actor_staff_id_fkey";

alter table "public"."rewards" drop constraint "rewards_cafe_id_fkey";

alter table "public"."settings_global" drop constraint "settings_global_singleton";

alter table "public"."cafes" drop constraint "cafes_cafe_tier_id_fkey";

drop function if exists "public"."create_staff_with_profile"(p_cafe_id uuid, p_full_name text, p_role text, p_cedula text, p_pin_hash text, p_can_issue boolean, p_can_redeem boolean, p_is_active boolean, p_display_role text);

drop view if exists "public"."v_cafe_staff_owner";

drop view if exists "public"."v_cafe_points_totals";

drop view if exists "public"."v_cafe_promos_active";

drop view if exists "public"."v_cafe_reviews_stats";

drop view if exists "public"."v_panel_clientes_global";

alter table "public"."cafe_promos" drop constraint "cafe_promos_pkey";

drop index if exists "public"."cafe_reviews_cafe_id_profile_id_key";

drop index if exists "public"."idx_cafe_promos_cafe_id";

drop index if exists "public"."idx_cafe_reviews_cafe_id";

drop index if exists "public"."idx_cafe_staff_cafe_cedula_unique";

drop index if exists "public"."idx_cafe_staff_profile_id";

drop index if exists "public"."idx_point_transactions_actor_staff_id";

drop index if exists "public"."cafe_promos_pkey";

drop index if exists "public"."cafes_image_code_unique";


  create table "public"."promos" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "image_code" text,
    "is_active" boolean not null default true,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."cafe_promos" drop column "description";

alter table "public"."cafe_promos" drop column "id";

alter table "public"."cafe_promos" drop column "image_code";

alter table "public"."cafe_promos" drop column "title";

alter table "public"."cafe_promos" add column "promo_id" uuid not null;

alter table "public"."cafe_promos" alter column "created_at" set not null;

alter table "public"."cafe_reviews" alter column "created_at" set not null;

alter table "public"."cafe_reviews" alter column "rating" set data type integer using "rating"::integer;

alter table "public"."cafe_reviews" alter column "updated_at" set not null;

alter table "public"."cafe_staff" add column "display_role" text;

alter table "public"."cafe_staff" alter column "created_at" set not null;

alter table "public"."cafe_staff" alter column "full_name" set not null;

alter table "public"."cafe_staff" alter column "name" drop not null;

alter table "public"."cafe_staff" alter column "role" set default 'STAFF'::text;

alter table "public"."cafes" drop column "geocode_query";

alter table "public"."cafes" drop column "geocode_source";

alter table "public"."cafes" drop column "geocoded_at";

alter table "public"."cafes" drop column "lat";

alter table "public"."cafes" drop column "lng";

alter table "public"."cafes" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."cafes" alter column "name" drop not null;

alter table "public"."point_transactions" drop column "actor_staff_id";

alter table "public"."profiles" add column "cafe_id" uuid;

alter table "public"."profiles" alter column "full_name" drop not null;

alter table "public"."rewards" alter column "cost_points" set default 0;

alter table "public"."rewards" alter column "cost_points" drop not null;

alter table "public"."rewards" alter column "description" drop default;

alter table "public"."rewards" alter column "description" drop not null;

alter table "public"."rewards" alter column "is_active" drop not null;

alter table "public"."rewards" alter column "is_global" drop not null;

alter table "public"."settings_global" drop column "created_at";

alter table "public"."settings_global" alter column "max_points_per_day" set default 0;

alter table "public"."settings_global" alter column "max_points_per_day" drop not null;

alter table "public"."settings_global" alter column "max_points_per_hour" set default 0;

alter table "public"."settings_global" alter column "max_points_per_hour" drop not null;

alter table "public"."settings_global" alter column "max_points_per_month" set default 0;

alter table "public"."settings_global" alter column "max_points_per_month" drop not null;

alter table "public"."settings_global" alter column "max_redeem_per_day" set default 0;

alter table "public"."settings_global" alter column "max_redeem_per_day" drop not null;

alter table "public"."settings_global" alter column "updated_at" drop not null;

alter table "public"."settings_global" alter column "welcome_bonus_points" drop not null;

alter table "public"."tiers" drop column "badge_bg";

alter table "public"."tiers" drop column "badge_fg";

alter table "public"."tiers" drop column "created_at";

alter table "public"."tiers" alter column "badge_text" drop default;

alter table "public"."tiers" alter column "badge_text" drop not null;

alter table "public"."tiers" alter column "dot_color" drop default;

alter table "public"."tiers" alter column "dot_color" drop not null;

alter table "public"."tiers" alter column "is_active" drop not null;

alter table "public"."tiers" alter column "min_points" drop not null;

alter table "public"."tiers" alter column "sort_order" drop not null;

CREATE UNIQUE INDEX cafe_reviews_unique_user_cafe ON public.cafe_reviews USING btree (cafe_id, profile_id);

CREATE INDEX cafe_staff_cafe_id_idx ON public.cafe_staff USING btree (cafe_id);

CREATE UNIQUE INDEX cafe_staff_cafe_profile_unique ON public.cafe_staff USING btree (cafe_id, profile_id);

CREATE UNIQUE INDEX cafe_staff_one_owner_uq ON public.cafe_staff USING btree (cafe_id) WHERE (role = 'OWNER'::text);

CREATE UNIQUE INDEX cafe_staff_unique_cafe_profile ON public.cafe_staff USING btree (cafe_id, profile_id) WHERE (profile_id IS NOT NULL);

CREATE UNIQUE INDEX cafe_tiers_name_uq ON public.cafe_tiers USING btree (name);

CREATE UNIQUE INDEX cafes_image_code_uq ON public.cafes USING btree (image_code) WHERE (image_code IS NOT NULL);

CREATE INDEX idx_profiles_cafe ON public.profiles USING btree (cafe_id);

CREATE UNIQUE INDEX profiles_cedula_unique ON public.profiles USING btree (cedula);

CREATE INDEX profiles_tier_id_idx ON public.profiles USING btree (tier_id);

CREATE UNIQUE INDEX profiles_unique_cedula ON public.profiles USING btree (cedula) WHERE ((cedula IS NOT NULL) AND (btrim(cedula) <> ''::text));

CREATE UNIQUE INDEX promos_pkey ON public.promos USING btree (id);

CREATE UNIQUE INDEX cafe_promos_pkey ON public.cafe_promos USING btree (cafe_id, promo_id);

CREATE UNIQUE INDEX cafes_image_code_unique ON public.cafes USING btree (image_code);

alter table "public"."promos" add constraint "promos_pkey" PRIMARY KEY using index "promos_pkey";

alter table "public"."cafe_promos" add constraint "cafe_promos_pkey" PRIMARY KEY using index "cafe_promos_pkey";

alter table "public"."cafe_promos" add constraint "cafe_promos_promo_id_fkey" FOREIGN KEY (promo_id) REFERENCES public.promos(id) ON DELETE CASCADE not valid;

alter table "public"."cafe_promos" validate constraint "cafe_promos_promo_id_fkey";

alter table "public"."cafe_reviews" add constraint "cafe_reviews_rating_1_5" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."cafe_reviews" validate constraint "cafe_reviews_rating_1_5";

alter table "public"."cafes" add constraint "cafes_image_code_format" CHECK (((image_code IS NULL) OR (image_code ~ '^[0-9]{2}$'::text))) not valid;

alter table "public"."cafes" validate constraint "cafes_image_code_format";

alter table "public"."cafes" add constraint "cafes_image_code_unique" UNIQUE using index "cafes_image_code_unique";

alter table "public"."cafes" add constraint "cafes_name_min_len" CHECK (((name IS NULL) OR (length(TRIM(BOTH FROM name)) >= 5))) not valid;

alter table "public"."cafes" validate constraint "cafes_name_min_len";

alter table "public"."profiles" add constraint "profiles_cafe_id_fkey" FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) not valid;

alter table "public"."profiles" validate constraint "profiles_cafe_id_fkey";

alter table "public"."cafes" add constraint "cafes_cafe_tier_id_fkey" FOREIGN KEY (cafe_tier_id) REFERENCES public.cafe_tiers(id) not valid;

alter table "public"."cafes" validate constraint "cafes_cafe_tier_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_staff_with_profile(p_cafe_id uuid, p_full_name text, p_cedula text, p_pin_hash text, p_role public.app_role, p_is_active boolean DEFAULT true, p_can_issue boolean DEFAULT true, p_can_redeem boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_profile_id uuid;
  v_cafe_staff_id uuid;
begin
  insert into public.profiles (full_name, cedula, pin_hash, role)
  values (p_full_name, p_cedula, p_pin_hash, p_role)
  returning id into v_profile_id;

  insert into public.cafe_staff (cafe_id, profile_id, full_name, role, is_active, can_issue, can_redeem)
  values (p_cafe_id, v_profile_id, p_full_name, 'Staff', p_is_active, p_can_issue, p_can_redeem)
  returning id into v_cafe_staff_id;

  return v_profile_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_staff_with_profile(p_cafe_id uuid, p_full_name text, p_cedula text, p_pin_hash text, p_role public.app_role, p_is_active boolean, p_can_issue boolean, p_can_redeem boolean, p_display_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_profile_id uuid;
begin
  insert into public.profiles (full_name, cedula, pin_hash, role)
  values (p_full_name, p_cedula, p_pin_hash, 'staff'::public.app_role)
  returning id into v_profile_id;

  insert into public.cafe_staff (
    cafe_id, profile_id, full_name, role, is_active, can_issue, can_redeem
  )
  values (
    p_cafe_id, v_profile_id, p_full_name,
    coalesce(nullif(trim(p_display_role), ''), 'Staff'),
    p_is_active, p_can_issue, p_can_redeem
  );

  return v_profile_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.limit_cafe_staff()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (select count(*) from public.cafe_staff where cafe_id = new.cafe_id) >= 5 then
    raise exception 'Máximo 5 autorizados por cafetería';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.owner_create_staff_user(p_cafe_id uuid, p_full_name text, p_role text, p_cedula text, p_pin_4 text, p_can_issue boolean DEFAULT true, p_can_redeem boolean DEFAULT true, p_is_active boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile_id uuid;
  v_cedula text;
  v_pin text;
begin
  v_cedula := regexp_replace(coalesce(p_cedula,''), '\D', '', 'g');
  v_pin := regexp_replace(coalesce(p_pin_4,''), '\D', '', 'g');

  if length(btrim(coalesce(p_full_name,''))) < 2 then
    raise exception 'Nombre inválido';
  end if;

  if length(v_cedula) < 6 then
    raise exception 'Cédula inválida';
  end if;

  if length(v_pin) <> 4 then
    raise exception 'PIN inválido (debe ser 4 dígitos)';
  end if;

  -- 1) Crear profile (si no existe por cédula)
  select id into v_profile_id
  from public.profiles
  where cedula = v_cedula
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (role, full_name, cedula, pin_hash)
    values ('staff', btrim(p_full_name), v_cedula, crypt(v_pin, gen_salt('bf')))
    returning id into v_profile_id;
  else
    -- Si existía, lo “promovemos” a staff si no lo era (opcional)
    update public.profiles
      set role = case when role is null then 'staff' else role end,
          full_name = coalesce(nullif(btrim(full_name),''), btrim(p_full_name))
    where id = v_profile_id;
  end if;

  -- 2) Insert en cafe_staff vinculado al profile
  insert into public.cafe_staff (
    cafe_id, profile_id, full_name, role,
    is_owner, is_active, can_issue, can_redeem
  )
  values (
    p_cafe_id, v_profile_id, btrim(p_full_name), coalesce(nullif(btrim(p_role),''),'STAFF'),
    false, coalesce(p_is_active,true), coalesce(p_can_issue,true), coalesce(p_can_redeem,true)
  );

  return v_profile_id;
end;
$function$
;

create or replace view "public"."v_cafe_staff_list" as  SELECT cs.id AS cafe_staff_id,
    cs.cafe_id,
    cs.full_name,
    cs.role AS staff_role,
    cs.is_owner,
    cs.is_active,
    cs.can_issue,
    cs.can_redeem,
    cs.created_at,
    p.id AS profile_id,
    p.cedula,
    p.full_name AS profile_full_name,
    p.role AS app_role
   FROM (public.cafe_staff cs
     LEFT JOIN public.profiles p ON ((p.id = cs.profile_id)));


create or replace view "public"."v_report_cafes_30d_all" as  WITH tx AS (
         SELECT point_transactions.cafe_id,
            (count(*))::integer AS movimientos,
            (((COALESCE(sum(
                CASE
                    WHEN (point_transactions.tx_type = 'earn'::public.tx_type) THEN point_transactions.amount
                    ELSE 0
                END), (0)::bigint) + COALESCE(sum(
                CASE
                    WHEN (point_transactions.tx_type = 'transfer_in'::public.tx_type) THEN point_transactions.amount
                    ELSE 0
                END), (0)::bigint)) + COALESCE(sum(
                CASE
                    WHEN ((point_transactions.tx_type = 'adjust'::public.tx_type) AND (point_transactions.amount > 0)) THEN point_transactions.amount
                    ELSE 0
                END), (0)::bigint)))::integer AS generado,
            (((COALESCE(sum(
                CASE
                    WHEN (point_transactions.tx_type = 'redeem'::public.tx_type) THEN point_transactions.amount
                    ELSE 0
                END), (0)::bigint) + COALESCE(sum(
                CASE
                    WHEN (point_transactions.tx_type = 'transfer_out'::public.tx_type) THEN point_transactions.amount
                    ELSE 0
                END), (0)::bigint)) + COALESCE(sum(
                CASE
                    WHEN ((point_transactions.tx_type = 'adjust'::public.tx_type) AND (point_transactions.amount < 0)) THEN (- point_transactions.amount)
                    ELSE 0
                END), (0)::bigint)))::integer AS canjeado
           FROM public.point_transactions
          WHERE (point_transactions.created_at >= (now() - '30 days'::interval))
          GROUP BY point_transactions.cafe_id
        )
 SELECT c.id AS cafe_id,
    c.name AS cafeteria,
    c.image_code,
    c.is_active,
    COALESCE(tx.movimientos, 0) AS movimientos,
    COALESCE(tx.generado, 0) AS generado,
    COALESCE(tx.canjeado, 0) AS canjeado,
    (COALESCE(tx.generado, 0) - COALESCE(tx.canjeado, 0)) AS neto
   FROM (public.cafes c
     LEFT JOIN tx ON ((tx.cafe_id = c.id)))
  ORDER BY (COALESCE(tx.generado, 0) - COALESCE(tx.canjeado, 0)) DESC, c.name;


create or replace view "public"."v_cafe_points_totals" as  SELECT cafe_id,
    (sum(
        CASE
            WHEN (tx_type = 'earn'::public.tx_type) THEN amount
            WHEN (tx_type = 'redeem'::public.tx_type) THEN (- amount)
            ELSE 0
        END))::integer AS total_points,
    (count(*))::integer AS movimientos
   FROM public.point_transactions pt
  WHERE (cafe_id IS NOT NULL)
  GROUP BY cafe_id;


create or replace view "public"."v_cafe_promos_active" as  SELECT cp.cafe_id,
    p.id AS promo_id,
    p.title,
    p.description,
    p.image_code
   FROM (public.cafe_promos cp
     JOIN public.promos p ON ((p.id = cp.promo_id)))
  WHERE ((cp.is_active = true) AND (p.is_active = true) AND ((p.starts_at IS NULL) OR (p.starts_at <= now())) AND ((p.ends_at IS NULL) OR (p.ends_at >= now())));


create or replace view "public"."v_cafe_reviews_stats" as  SELECT cafe_id,
    round(avg(rating), 1) AS avg_rating,
    (count(*))::integer AS reviews_count
   FROM public.cafe_reviews
  GROUP BY cafe_id;


create or replace view "public"."v_panel_clientes_global" as  WITH tx AS (
         SELECT pt.id,
            pt.cafe_id,
            pt.created_at,
            pt.amount,
            pt.tx_type,
                CASE
                    WHEN (pt.tx_type = 'earn'::public.tx_type) THEN pt.to_profile_id
                    WHEN (pt.tx_type = 'redeem'::public.tx_type) THEN pt.from_profile_id
                    ELSE NULL::uuid
                END AS cliente_id
           FROM public.point_transactions pt
          WHERE (pt.tx_type = ANY (ARRAY['earn'::public.tx_type, 'redeem'::public.tx_type]))
        ), cliente_totales AS (
         SELECT tx.cliente_id,
            count(*) AS movimientos,
            sum(
                CASE
                    WHEN (tx.tx_type = 'earn'::public.tx_type) THEN tx.amount
                    ELSE 0
                END) AS generado,
            sum(
                CASE
                    WHEN (tx.tx_type = 'redeem'::public.tx_type) THEN tx.amount
                    ELSE 0
                END) AS canjeado,
            (sum(
                CASE
                    WHEN (tx.tx_type = 'earn'::public.tx_type) THEN tx.amount
                    ELSE 0
                END) - sum(
                CASE
                    WHEN (tx.tx_type = 'redeem'::public.tx_type) THEN tx.amount
                    ELSE 0
                END)) AS neto
           FROM tx
          WHERE (tx.cliente_id IS NOT NULL)
          GROUP BY tx.cliente_id
        ), cafeteria_preferida AS (
         SELECT tx.cliente_id,
            tx.cafe_id,
            sum(tx.amount) AS total_movido,
            row_number() OVER (PARTITION BY tx.cliente_id ORDER BY (sum(tx.amount)) DESC) AS rn
           FROM tx
          WHERE ((tx.cliente_id IS NOT NULL) AND (tx.cafe_id IS NOT NULL))
          GROUP BY tx.cliente_id, tx.cafe_id
        ), cafeteria_preferida_pick AS (
         SELECT cafeteria_preferida.cliente_id,
            cafeteria_preferida.cafe_id
           FROM cafeteria_preferida
          WHERE (cafeteria_preferida.rn = 1)
        )
 SELECT p.id AS cliente_id,
    COALESCE(p.full_name, ('Cliente '::text || p.cedula), p.cedula) AS cliente,
    cpp.cafe_id AS cafe_preferida_id,
    COALESCE(c.name, '—'::text) AS cafeteria_preferida,
    ct.movimientos,
    ct.generado,
    ct.canjeado,
    ct.neto
   FROM (((cliente_totales ct
     JOIN public.profiles p ON ((p.id = ct.cliente_id)))
     LEFT JOIN cafeteria_preferida_pick cpp ON ((cpp.cliente_id = ct.cliente_id)))
     LEFT JOIN public.cafes c ON ((c.id = cpp.cafe_id)))
  WHERE (p.role = 'consumer'::public.app_role)
  ORDER BY ct.neto DESC, ct.movimientos DESC;


grant delete on table "public"."promos" to "anon";

grant insert on table "public"."promos" to "anon";

grant references on table "public"."promos" to "anon";

grant select on table "public"."promos" to "anon";

grant trigger on table "public"."promos" to "anon";

grant truncate on table "public"."promos" to "anon";

grant update on table "public"."promos" to "anon";

grant delete on table "public"."promos" to "authenticated";

grant insert on table "public"."promos" to "authenticated";

grant references on table "public"."promos" to "authenticated";

grant select on table "public"."promos" to "authenticated";

grant trigger on table "public"."promos" to "authenticated";

grant truncate on table "public"."promos" to "authenticated";

grant update on table "public"."promos" to "authenticated";

grant delete on table "public"."promos" to "service_role";

grant insert on table "public"."promos" to "service_role";

grant references on table "public"."promos" to "service_role";

grant select on table "public"."promos" to "service_role";

grant trigger on table "public"."promos" to "service_role";

grant truncate on table "public"."promos" to "service_role";

grant update on table "public"."promos" to "service_role";

CREATE TRIGGER t_limit_cafe_staff BEFORE INSERT ON public.cafe_staff FOR EACH ROW EXECUTE FUNCTION public.limit_cafe_staff();

CREATE TRIGGER t_cafes_updated_at BEFORE UPDATE ON public.cafes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


