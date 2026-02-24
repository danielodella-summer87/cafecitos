# Supabase: login + db push

Para poder correr `supabase db push` en tu máquina.

## Con navegador

```bash
cd /Users/danielodella/PROYECTOS/cafecitos/web

supabase login
supabase projects list
supabase link --project-ref mlelobxpvkfdtnnpoeyr
supabase db push
```

## Sin navegador (token)

1. En [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) generá un access token.
2. En la terminal:

```bash
cd /Users/danielodella/PROYECTOS/cafecitos/web
export SUPABASE_ACCESS_TOKEN="TU_TOKEN"
supabase link --project-ref mlelobxpvkfdtnnpoeyr
supabase db push
```

## Después de db push

- Entrá a `/app/admin` → pestaña **Promociones**.
- Creá una promo: debería guardar y cerrar el modal sin el error de "public.promotions".
