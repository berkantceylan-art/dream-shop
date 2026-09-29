-- =====================================================================
-- 0009: Evim & Garajım — aktif ev, eşya yerleşimi, araba/ev 3D tipleri
-- (Tekrar çalıştırılabilir)
-- =====================================================================

alter table profiles add column if not exists home_item_id uuid references inventory_items(id) on delete set null;
alter table profiles add column if not exists car_item_id  uuid references inventory_items(id) on delete set null;

-- Evdeki eşyaların konumu (x, z metre; rot radyan)
create table if not exists home_layout (
  item_id    uuid primary key references inventory_items(id) on delete cascade,
  owner_id   uuid not null references profiles(id) on delete cascade,
  x          real not null default 0,
  z          real not null default 0,
  rot        real not null default 0,
  updated_at timestamptz default now()
);
alter table home_layout enable row level security;
drop policy if exists "layout read" on home_layout;
create policy "layout read" on home_layout for select using (true);         -- ev ziyaretleri için
drop policy if exists "layout own" on home_layout;
create policy "layout own" on home_layout for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Aktif evi / sergilenen arabayı seç
create or replace function set_active_item(p_item uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_item is not null and not exists (
    select 1 from inventory_items i join products p on p.id = i.product_id
    where i.id = p_item and i.owner_id = auth.uid() and i.status = 'owned' and p.kind::text = p_kind) then
    raise exception 'Bu eşya sende değil';
  end if;
  if p_kind = 'house' then update profiles set home_item_id = p_item where id = auth.uid();
  elsif p_kind = 'car' then update profiles set car_item_id = p_item where id = auth.uid();
  else raise exception 'Geçersiz tür'; end if;
end $$;

-- Satılan eşyanın yerleşim kaydı temizlensin
create or replace function cleanup_sold_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'owned' and old.status = 'owned' then
    delete from home_layout where item_id = new.id;
    update profiles set home_item_id = null where home_item_id = new.id;
    update profiles set car_item_id = null where car_item_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists inventory_cleanup on inventory_items;
create trigger inventory_cleanup after update of status on inventory_items
  for each row execute function cleanup_sold_item();

-- ---------- Örnek ürünlere 3D tipleri ----------
update products set attributes = attributes || jsonb_build_object('car', v.a::jsonb)
from (values
  ('Şehir Hatchback', '{"shape":"hatchback","color":"#ff6b6b"}'),
  ('Aile SUV''u',      '{"shape":"suv","color":"#4dabf7"}'),
  ('Elektrikli Sedan', '{"shape":"sedan","color":"#f8f9fa"}'),
  ('Spor Coupe',       '{"shape":"coupe","color":"#ffd43b"}')
) as v(n, a)
where products.name = v.n and products.kind = 'car' and not (products.attributes ? 'car');

update products set attributes = attributes || jsonb_build_object('home', v.a::jsonb)
from (values
  ('1+1 Stüdyo Daire',      '{"size":"studio","color":"#ffe3f1"}'),
  ('3+1 Site Dairesi',      '{"size":"flat","color":"#d8ecff"}'),
  ('Bahçeli Müstakil Ev',   '{"size":"house","color":"#fff1c7"}'),
  ('Deniz Manzaralı Villa', '{"size":"villa","color":"#d9f7e8"}')
) as v(n, a)
where products.name = v.n and products.kind = 'house' and not (products.attributes ? 'home');
