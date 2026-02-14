select p.cedula, p.full_name, w.profile_id, w.balance, w.updated_at
from public.wallets w
join public.profiles p on p.id = w.profile_id
where p.role='consumer'
order by w.updated_at desc nulls last;