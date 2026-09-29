-- =====================================================================
-- 0003: Katalog — kategoriler, her ile bir AVM, mağaza onayı, giydirme,
--        ürün görselleri deposu
-- =====================================================================

-- ---------- Kategoriler ----------
insert into categories(id, parent_id, name, kind) values
  (1,  null, 'Giyim',       'clothing'),
  (2,  1,    'Üst giyim',   'clothing'),
  (3,  1,    'Alt giyim',   'clothing'),
  (4,  1,    'Ayakkabı',    'clothing'),
  (5,  1,    'Dış giyim',   'clothing'),
  (6,  null, 'Aksesuar',    'accessory'),
  (7,  null, 'Otomobil',    'car'),
  (8,  null, 'Konut',       'house'),
  (9,  null, 'Mobilya',     'furniture'),
  (10, null, 'Elektronik',  'other'),
  (11, null, 'Kozmetik',    'other')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('categories','id'), greatest(11, (select max(id) from categories)));

-- ---------- Her ile bir başlangıç AVM'si ----------
insert into malls(city_id, name)
select c.id, c.name || ' Dream AVM' from cities c
where not exists (select 1 from malls m where m.city_id = c.id);

-- ---------- Mağaza durumu yalnızca admin tarafından değiştirilebilir ----------
create or replace function guard_store_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not is_admin() then
    raise exception 'Mağaza durumunu yalnızca admin değiştirebilir';
  end if;
  if new.owner_id is distinct from old.owner_id and not is_admin() then
    raise exception 'Mağaza sahibi değiştirilemez';
  end if;
  return new;
end $$;
drop trigger if exists stores_guard on stores;
create trigger stores_guard before update on stores for each row execute function guard_store_status();

-- Admin: mağazayı onayla / askıya al. Onaylanınca sahibi store_owner olur.
create or replace function admin_set_store_status(p_store uuid, p_status store_status) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  update stores set status = p_status where id = p_store returning owner_id into v_owner;
  if p_status = 'approved' and v_owner is not null then
    update profiles set role = 'store_owner' where id = v_owner and role = 'user';
  end if;
end $$;

-- Admin: kullanıcı rolü ata
create or replace function admin_set_role(p_user uuid, p_role user_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  update profiles set role = p_role where id = p_user;
end $$;

-- ---------- Giydirme ----------
-- Aynı giyim yuvasında (üst/alt/ayakkabı...) aynı anda tek ürün giyilir.
create or replace function equip_item(p_item uuid, p_on boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_slot wear_slot; v_attrs jsonb;
begin
  select p.wear_slot, p.attributes into v_slot, v_attrs
  from inventory_items i join products p on p.id = i.product_id
  where i.id = p_item and i.owner_id = auth.uid() and i.status = 'owned';
  if not found then raise exception 'Ürün envanterinde değil'; end if;
  if v_slot is null then raise exception 'Bu ürün giyilemez'; end if;

  if p_on then
    update inventory_items i set equipped = false
      from products p
     where p.id = i.product_id and i.owner_id = auth.uid() and p.wear_slot = v_slot and i.id <> p_item;
  end if;
  update inventory_items set equipped = p_on where id = p_item;
  return v_attrs;
end $$;

-- Envanterdeki ürünleri güncellemeyi yalnızca fonksiyonlar yapsın
drop policy if exists "inv equip" on inventory_items;

-- ---------- Olay kaydı: aynı ürüne 10 dk içinde tek 'view' ----------
create or replace function log_product_event(p_product uuid, p_type event_type) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if p_type = 'view' and exists (
    select 1 from product_events where user_id = auth.uid() and product_id = p_product
      and type = 'view' and created_at > now() - interval '10 minutes') then return; end if;
  insert into product_events(user_id, product_id, type) values (auth.uid(), p_product, p_type);
end $$;

-- ---------- Favoriler (istek listesi = en değerli ilgi verisi) ----------
create table if not exists wishlist (
  user_id    uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);
alter table wishlist enable row level security;
drop policy if exists "wishlist own" on wishlist;
create policy "wishlist own" on wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Ürün görselleri deposu ----------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Herkes okuyabilir; yükleme yalnızca kendi klasörüne (klasör adı = kullanıcı id)
drop policy if exists "product images read" on storage.objects;
create policy "product images read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product images upload" on storage.objects;
create policy "product images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "product images delete" on storage.objects;
create policy "product images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Admin: tüm profilleri, olayları ve envanteri görebilir (mevcut politikalar yeterli) ----------
-- Admin istatistikleri
create or replace function admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'users',          (select count(*) from profiles),
    'users_today',    (select count(*) from profiles where created_at > now() - interval '1 day'),
    'stores',         (select count(*) from stores where status = 'approved'),
    'stores_pending', (select count(*) from stores where status = 'pending'),
    'products',       (select count(*) from products where status = 'active'),
    'purchases',      (select count(*) from credit_transactions where type = 'product_purchase'),
    'credits_spent',  (select coalesce(sum(amount),0) from credit_transactions where type = 'product_purchase'),
    'analytics_consent', (select count(distinct user_id) from consents where type = 'aggregate_analytics' and granted)
  );
end $$;
