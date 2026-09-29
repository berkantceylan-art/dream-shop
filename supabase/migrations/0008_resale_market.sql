-- =====================================================================
-- 0008: 2. el pazarı — ilan ver, geri çek, satın al (%5 komisyon),
--        hızlı sat (ödenen tutarın %50'si). Tekrar çalıştırılabilir.
-- =====================================================================

alter type credit_tx_type add value if not exists 'resale_fee';
alter type credit_tx_type add value if not exists 'quick_sell';

alter table resale_listings add column if not exists note    text;
alter table resale_listings add column if not exists city_id smallint references cities(id);
create index if not exists resale_active_idx on resale_listings(status, created_at desc);

-- Ayarlar (admin değiştirebilir)
create table if not exists market_settings (
  id              boolean primary key default true check (id),
  fee_percent     numeric(4,2) not null default 5,
  quick_sell_pct  numeric(4,2) not null default 50
);
insert into market_settings(id) values (true) on conflict do nothing;
alter table market_settings enable row level security;
drop policy if exists "market settings read" on market_settings;
create policy "market settings read" on market_settings for select using (true);
drop policy if exists "market settings admin" on market_settings;
create policy "market settings admin" on market_settings for update using (is_admin()) with check (is_admin());

-- İlanlar yalnızca fonksiyonlarla oluşturulur / değiştirilir
drop policy if exists "listing create" on resale_listings;
drop policy if exists "listing cancel" on resale_listings;

-- ---------- İlan ver ----------
create or replace function create_listing(p_item uuid, p_price bigint, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_city smallint;
begin
  if p_price is null or p_price < 1 or p_price > 10000000 then raise exception 'Geçersiz fiyat'; end if;
  update inventory_items set status = 'listed', equipped = false
   where id = p_item and owner_id = auth.uid() and status = 'owned';
  if not found then raise exception 'Bu eşya satışa uygun değil'; end if;
  select city_id into v_city from profiles where id = auth.uid();
  insert into resale_listings(inventory_item_id, seller_id, price, note, city_id)
  values (p_item, auth.uid(), p_price, left(p_note, 280), v_city) returning id into v_id;
  return v_id;
end $$;

-- ---------- İlanı geri çek ----------
create or replace function cancel_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_item uuid;
begin
  update resale_listings set status = 'cancelled', closed_at = now()
   where id = p_listing and seller_id = auth.uid() and status = 'active'
  returning inventory_item_id into v_item;
  if v_item is null then raise exception 'İlan bulunamadı'; end if;
  update inventory_items set status = 'owned' where id = v_item;
end $$;

-- ---------- İlandan satın al (komisyon düşülür) ----------
drop function if exists buy_listing(uuid);
create or replace function buy_listing(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare l resale_listings%rowtype; v_fee bigint; v_new uuid; v_product uuid;
begin
  select * into l from resale_listings where id = p_listing and status = 'active' for update;
  if not found then raise exception 'Bu ilan artık yok'; end if;
  if l.seller_id = auth.uid() then raise exception 'Kendi ilanını satın alamazsın'; end if;

  update wallets set balance = balance - l.price where user_id = auth.uid() and balance >= l.price;
  if not found then raise exception 'Yetersiz kredi'; end if;

  select ceil(l.price * fee_percent / 100) into v_fee from market_settings;
  v_fee := least(coalesce(v_fee, 0), l.price);
  update wallets set balance = balance + (l.price - v_fee) where user_id = l.seller_id;

  update inventory_items set status = 'sold', equipped = false where id = l.inventory_item_id
    returning product_id into v_product;
  insert into inventory_items(owner_id, product_id, source, paid_credits)
    values (auth.uid(), v_product, 'resale', l.price) returning id into v_new;
  update resale_listings set status = 'sold', buyer_id = auth.uid(), closed_at = now() where id = p_listing;

  if l.price - v_fee > 0 then
    insert into credit_transactions(from_user, to_user, amount, type, ref_id)
    values (auth.uid(), l.seller_id, l.price - v_fee, 'resale_purchase', p_listing);
  end if;
  if v_fee > 0 then
    insert into credit_transactions(from_user, amount, type, ref_id, note)
    values (auth.uid(), v_fee, 'resale_fee', p_listing, 'Pazar komisyonu');
  end if;
  insert into product_events(user_id, product_id, type) values (auth.uid(), v_product, 'resale');
  return v_new;
end $$;

-- ---------- Hızlı sat: platforma anında satış ----------
create or replace function quick_sell(p_item uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_paid bigint; v_price bigint; v_amount bigint;
begin
  select i.paid_credits, p.credit_price into v_paid, v_price
  from inventory_items i join products p on p.id = i.product_id
  where i.id = p_item and i.owner_id = auth.uid() and i.status = 'owned';
  if not found then raise exception 'Bu eşya satışa uygun değil'; end if;
  select floor(coalesce(nullif(v_paid, 0), v_price) * quick_sell_pct / 100) into v_amount from market_settings;
  update inventory_items set status = 'sold', equipped = false where id = p_item;
  if v_amount > 0 then
    update wallets set balance = balance + v_amount where user_id = auth.uid();
    insert into credit_transactions(to_user, amount, type, ref_id, note)
    values (auth.uid(), v_amount, 'quick_sell', p_item, 'Hızlı satış');
  end if;
  return v_amount;
end $$;

-- ---------- Pazar görünümü (yalnızca güvenli alanlar; arşivlenmiş ürünler de satılabilir) ----------
drop view if exists market_listings;
create view market_listings as
select l.id, l.price, l.note, l.created_at, l.seller_id, l.city_id,
       pp.username as seller_username, c.name as city_name,
       i.paid_credits as seller_paid,
       p.id as product_id, p.name, p.brand, p.kind, p.wear_slot, p.credit_price as store_price,
       p.thumbnail_url, p.attributes, p.category_id
from resale_listings l
join inventory_items i on i.id = l.inventory_item_id
join products p on p.id = i.product_id
join profiles pp on pp.id = l.seller_id
left join cities c on c.id = l.city_id
where l.status = 'active';
grant select on market_listings to authenticated;
revoke all on market_listings from anon;
