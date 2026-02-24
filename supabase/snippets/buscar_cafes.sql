-- 1) Buscar por name / city / address (cualquier coincidencia)
select id, name, city, address
from cafes
where
  lower(coalesce(name,'')) like '%prado%'
  or lower(coalesce(city,'')) like '%prado%'
  or lower(coalesce(address,'')) like '%prado%'
order by name;

-- 2) Buscar por la dirección que vos tenés: "Suarez 3724" (y variantes)
select id, name, city, address
from cafes
where
  lower(coalesce(address,'')) like '%suarez%'
  or lower(coalesce(address,'')) like '%suárez%'
  or lower(coalesce(address,'')) like '%3724%'
order by name;

-- 3) Listar TODAS las cafeterías (para confirmar nombres exactos)
select id, name, city, address
from cafes
order by name;
