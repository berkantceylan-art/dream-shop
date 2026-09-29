-- =====================================================================
-- Dream Shop — başlangıç şeması (v1)
-- Roller: user, store_owner, admin, data_buyer
-- Kredi: sadece platform içi, paraya çevrilemez. Tüm hareketler defterde (ledger).
-- KVKK: 3. kişilere yalnızca anonim + toplu (min. 10 kişilik gruplar) veri.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMLAR ----------
create type user_role        as enum ('user','store_owner','admin','data_buyer');
create type store_status     as enum ('pending','approved','suspended');
create type product_status   as enum ('draft','pending','active','archived');
create type product_kind     as enum ('house','car','clothing','accessory','furniture','other');
create type wear_slot        as enum ('head','top','bottom','shoes','outerwear','accessory');
create type item_status      as enum ('owned','listed','sold','gifted');
create type item_source      as enum ('store','resale','gift','signup');
create type credit_tx_type   as enum ('signup_bonus','topup','product_purchase','resale_sale','resale_purchase','transfer','gift','admin_adjust','refund');
create type payment_status   as enum ('pending','paid','failed','refunded');
create type listing_status   as enum ('active','sold','cancelled');
create type consent_type     as enum ('kvkk_terms','aggregate_analytics','marketing');
create type event_type       as enum ('view','wishlist','cart','purchase','resale');

-- ---------- COĞRAFYA ----------
create table cities (
  id    smallint primary key,            -- plaka kodu (1-81)
  name  text not null unique
);

create table malls (
  id       uuid primary key default gen_random_uuid(),
  city_id  smallint not null references cities(id),
  name     text not null,
  district text,
  scene_url text,                         -- 3D sahne (.glb)
  created_at timestamptz default now()
);

-- ---------- KULLANICILAR ----------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  role         user_role not null default 'user',
  city_id      smallint references cities(id),
  birth_year   smallint check (birth_year between 1900 and 2100),
  gender       text,
  created_at   timestamptz default now()
);

create table consents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       consent_type not null,
  granted    boolean not null,
  version    text not null,               -- metin sürümü (ör. 'kvkk-2026-09')
  created_at timestamptz default now()
);
create index on consents(user_id, type, created_at desc);

create table avatars (
  user_id    uuid primary key references profiles(id) on delete cascade,
  config     jsonb not null default '{}', -- vücut, ten, saç, yüz vb.
  model_url  text,
  updated_at timestamptz default now()
);

-- ---------- MAĞAZALAR & ÜRÜNLER ----------
create table stores (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id),
  name       text not null,
  slug       text unique not null,
  city_id    smallint not null references cities(id),
  mall_id    uuid references malls(id),   -- null = cadde mağazası
  tax_no     text,
  logo_url   text,
  scene_url  text,
  status     store_status not null default 'pending',
  created_at timestamptz default now()
);

create table categories (
  id        serial primary key,
  parent_id int references categories(id),
  name      text not null,
  kind      product_kind not null
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references stores(id), -- null = admin ürünü
  category_id   int not null references categories(id),
  kind          product_kind not null,
  wear_slot     wear_slot,                   -- sadece giyilebilirler
  name          text not null,
  brand         text,
  description   text,
  real_price_try numeric(12,2),              -- gerçek fiyat (raporlama için)
  credit_price  bigint not null check (credit_price >= 0),
  model_url     text,                        -- 3D model (.glb)
  thumbnail_url text,
  attributes    jsonb not null default '{}', -- renk, beden, motor vb.
  status        product_status not null default 'pending',
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);
create index on products(store_id);
create index on products(category_id, status);

-- ---------- KREDİ ----------
create table wallets (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0)
);

create table credit_transactions (          -- değiştirilemez defter
  id         bigserial primary key,
  from_user  uuid references profiles(id),  -- null = sistem
  to_user    uuid references profiles(id),  -- null = sistem
  amount     bigint not null check (amount > 0),
  type       credit_tx_type not null,
  ref_id     uuid,                          -- ürün/ilan/ödeme id
  note       text,
  created_at timestamptz default now()
);
create index on credit_transactions(from_user);
create index on credit_transactions(to_user);

create table credit_packages (
  id        serial primary key,
  name      text not null,
  credits   bigint not null,
  price_try numeric(10,2) not null,
  active    boolean default true
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id),
  package_id   int not null references credit_packages(id),
  provider     text not null,              -- iyzico / paytr
  provider_ref text,
  amount_try   numeric(10,2) not null,
  status       payment_status not null default 'pending',
  created_at   timestamptz default now()
);

-- ---------- ENVANTER & 2. EL ----------
create table inventory_items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references profiles(id),
  product_id    uuid not null references products(id),
  source        item_source not null,
  paid_credits  bigint not null default 0,
  status        item_status not null default 'owned',
  equipped      boolean not null default false,
  acquired_at   timestamptz default now()
);
create index on inventory_items(owner_id, status);

create table resale_listings (
  id                uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id),
  seller_id         uuid not null references profiles(id),
  price             bigint not null check (price > 0),
  status            listing_status not null default 'active',
  buyer_id          uuid references profiles(id),
  created_at        timestamptz default now(),
  closed_at         timestamptz
);

-- ---------- İLGİ OLAYLARI (raporlamanın ham verisi) ----------
create table product_events (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id),
  type       event_type not null,
  created_at timestamptz default now()
);
create index on product_events(product_id, type, created_at);

-- ---------- 3. KİŞİLER (VERİ ALICILARI) ----------
create table data_buyers (
  id         uuid primary key default gen_random_uuid(),
  company    text not null,
  tax_no     text,
  approved   boolean default false,
  created_at timestamptz default now()
);
create table data_buyer_members (
  buyer_id uuid references data_buyers(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  primary key (buyer_id, user_id)
);
create table report_orders (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid not null references data_buyers(id),
  filters    jsonb not null,               -- şehir, yaş aralığı, kategori, marka, tarih
  price_try  numeric(12,2),
  status     payment_status default 'pending',
  result_url text,
  created_at timestamptz default now()
);

-- =====================================================================
-- YARDIMCI FONKSİYONLAR
-- =====================================================================
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- Yeni üye: profil + cüzdan + başlangıç kredisi
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare bonus bigint := 1000;
begin
  insert into profiles(id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text,1,8)));
  insert into wallets(user_id, balance) values (new.id, bonus);
  insert into credit_transactions(to_user, amount, type, note)
  values (new.id, bonus, 'signup_bonus', 'Hoş geldin kredisi');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Mağazadan ürün satın al
create or replace function purchase_product(p_product uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_price bigint; v_item uuid;
begin
  select credit_price into v_price from products where id = p_product and status = 'active';
  if v_price is null then raise exception 'Ürün bulunamadı'; end if;

  update wallets set balance = balance - v_price
   where user_id = auth.uid() and balance >= v_price;
  if not found then raise exception 'Yetersiz kredi'; end if;

  insert into inventory_items(owner_id, product_id, source, paid_credits)
  values (auth.uid(), p_product, 'store', v_price) returning id into v_item;

  insert into credit_transactions(from_user, amount, type, ref_id)
  values (auth.uid(), v_price, 'product_purchase', p_product);
  insert into product_events(user_id, product_id, type) values (auth.uid(), p_product, 'purchase');
  return v_item;
end $$;

-- Kredi gönder / hediye et
create or replace function transfer_credits(p_to uuid, p_amount bigint, p_gift boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 or p_to = auth.uid() then raise exception 'Geçersiz işlem'; end if;
  update wallets set balance = balance - p_amount
   where user_id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'Yetersiz kredi'; end if;
  update wallets set balance = balance + p_amount where user_id = p_to;
  if not found then raise exception 'Alıcı bulunamadı'; end if;
  insert into credit_transactions(from_user, to_user, amount, type)
  values (auth.uid(), p_to, p_amount, case when p_gift then 'gift' else 'transfer' end::credit_tx_type);
end $$;

-- 2. el ilanını satın al
create or replace function buy_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l resale_listings%rowtype;
begin
  select * into l from resale_listings where id = p_listing and status = 'active' for update;
  if not found then raise exception 'İlan yok'; end if;
  if l.seller_id = auth.uid() then raise exception 'Kendi ilanın'; end if;

  update wallets set balance = balance - l.price where user_id = auth.uid() and balance >= l.price;
  if not found then raise exception 'Yetersiz kredi'; end if;
  update wallets set balance = balance + l.price where user_id = l.seller_id;

  update inventory_items set status = 'sold', equipped = false where id = l.inventory_item_id;
  insert into inventory_items(owner_id, product_id, source, paid_credits)
    select auth.uid(), product_id, 'resale', l.price from inventory_items where id = l.inventory_item_id;
  update resale_listings set status = 'sold', buyer_id = auth.uid(), closed_at = now() where id = p_listing;

  insert into credit_transactions(from_user, to_user, amount, type, ref_id)
  values (auth.uid(), l.seller_id, l.price, 'resale_purchase', p_listing);
end $$;

-- =====================================================================
-- ANONİM RAPOR GÖRÜNÜMÜ (3. kişiler yalnızca bunu görür)
-- Sadece 'aggregate_analytics' rızası güncel olarak verilmiş kullanıcılar,
-- ve en az 10 farklı kullanıcı içeren gruplar (k-anonimlik).
-- =====================================================================
create materialized view analytics_interest as
with latest as (
  select distinct on (user_id) user_id, granted
  from consents where type = 'aggregate_analytics'
  order by user_id, created_at desc
)
select
  date_trunc('month', e.created_at)::date as month,
  pr.city_id,
  (floor((extract(year from now()) - pr.birth_year) / 10) * 10)::int as age_band,
  p.kind, p.category_id, p.brand, e.type as event,
  count(*) as events,
  count(distinct e.user_id) as users
from product_events e
join latest l on l.user_id = e.user_id and l.granted
join profiles pr on pr.id = e.user_id
join products p on p.id = e.product_id
group by 1,2,3,4,5,6,7
having count(distinct e.user_id) >= 10;

-- =====================================================================
-- RLS
-- =====================================================================
alter table profiles            enable row level security;
alter table consents            enable row level security;
alter table avatars             enable row level security;
alter table stores              enable row level security;
alter table products            enable row level security;
alter table wallets             enable row level security;
alter table credit_transactions enable row level security;
alter table inventory_items     enable row level security;
alter table resale_listings     enable row level security;
alter table product_events      enable row level security;
alter table payments            enable row level security;
alter table data_buyers         enable row level security;
alter table data_buyer_members  enable row level security;
alter table report_orders       enable row level security;
alter table cities              enable row level security;
alter table malls               enable row level security;
alter table categories          enable row level security;
alter table credit_packages     enable row level security;

-- Herkese açık katalog
create policy "read cities"     on cities          for select using (true);
create policy "read malls"      on malls           for select using (true);
create policy "read categories" on categories      for select using (true);
create policy "read packages"   on credit_packages for select using (active);
create policy "read stores"     on stores   for select using (status = 'approved' or owner_id = auth.uid() or is_admin());
create policy "read products"   on products for select using (
  status = 'active' or is_admin()
  or exists (select 1 from stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Profil & avatar
create policy "profiles read"   on profiles for select using (true);
create policy "profiles update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = my_role());
create policy "avatars read"    on avatars for select using (true);
create policy "avatars upsert"  on avatars for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rıza: kullanıcı kendi kaydını ekler/okur (silinemez = iz kaydı)
create policy "consents own read"   on consents for select using (user_id = auth.uid() or is_admin());
create policy "consents own insert" on consents for insert with check (user_id = auth.uid());

-- Kredi: sadece okuma; yazma fonksiyonlarla
create policy "wallet own"  on wallets for select using (user_id = auth.uid() or is_admin());
create policy "tx own"      on credit_transactions for select using (from_user = auth.uid() or to_user = auth.uid() or is_admin());
create policy "pay own"     on payments for select using (user_id = auth.uid() or is_admin());

-- Envanter
create policy "inv read"   on inventory_items for select using (true);  -- başkalarının evi/garajı görünebilir
create policy "inv equip"  on inventory_items for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 2. el
create policy "listing read"   on resale_listings for select using (status = 'active' or seller_id = auth.uid() or buyer_id = auth.uid());
create policy "listing create" on resale_listings for insert with check (
  seller_id = auth.uid() and exists (select 1 from inventory_items i
    where i.id = inventory_item_id and i.owner_id = auth.uid() and i.status = 'owned'));
create policy "listing cancel" on resale_listings for update using (seller_id = auth.uid() and status = 'active')
  with check (status in ('active','cancelled'));

-- Olaylar: kullanıcı kendi olayını yazar, kimse ham veriyi okuyamaz (admin hariç)
create policy "events insert" on product_events for insert with check (user_id = auth.uid());
create policy "events admin"  on product_events for select using (is_admin());

-- Mağaza paneli
create policy "store create" on stores for insert with check (owner_id = auth.uid() and status = 'pending');
create policy "store edit"   on stores for update using (owner_id = auth.uid() or is_admin());
create policy "product create" on products for insert with check (
  is_admin() or exists (select 1 from stores s where s.id = store_id and s.owner_id = auth.uid() and s.status = 'approved'));
create policy "product edit" on products for update using (
  is_admin() or exists (select 1 from stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Admin her şeyi yönetir
create policy "admin malls"      on malls           for all using (is_admin()) with check (is_admin());
create policy "admin categories" on categories      for all using (is_admin()) with check (is_admin());
create policy "admin packages"   on credit_packages for all using (is_admin()) with check (is_admin());

-- 3. kişiler paneli
create policy "buyer read"  on data_buyers for select using (
  is_admin() or exists (select 1 from data_buyer_members m where m.buyer_id = id and m.user_id = auth.uid()));
create policy "buyer members" on data_buyer_members for select using (user_id = auth.uid() or is_admin());
create policy "orders read" on report_orders for select using (
  is_admin() or exists (select 1 from data_buyer_members m where m.buyer_id = report_orders.buyer_id and m.user_id = auth.uid()));
create policy "orders create" on report_orders for insert with check (
  exists (select 1 from data_buyer_members m join data_buyers b on b.id = m.buyer_id
          where m.buyer_id = report_orders.buyer_id and m.user_id = auth.uid() and b.approved));

-- Anonim rapor: ham tabloyu değil, sadece görünümü aç
revoke all on analytics_interest from anon, authenticated;
grant select on analytics_interest to service_role;

-- =====================================================================
-- BAŞLANGIÇ VERİSİ: 81 il
-- =====================================================================
insert into cities(id,name) values
(1,'Adana'),(2,'Adıyaman'),(3,'Afyonkarahisar'),(4,'Ağrı'),(5,'Amasya'),(6,'Ankara'),(7,'Antalya'),(8,'Artvin'),(9,'Aydın'),(10,'Balıkesir'),
(11,'Bilecik'),(12,'Bingöl'),(13,'Bitlis'),(14,'Bolu'),(15,'Burdur'),(16,'Bursa'),(17,'Çanakkale'),(18,'Çankırı'),(19,'Çorum'),(20,'Denizli'),
(21,'Diyarbakır'),(22,'Edirne'),(23,'Elazığ'),(24,'Erzincan'),(25,'Erzurum'),(26,'Eskişehir'),(27,'Gaziantep'),(28,'Giresun'),(29,'Gümüşhane'),(30,'Hakkari'),
(31,'Hatay'),(32,'Isparta'),(33,'Mersin'),(34,'İstanbul'),(35,'İzmir'),(36,'Kars'),(37,'Kastamonu'),(38,'Kayseri'),(39,'Kırklareli'),(40,'Kırşehir'),
(41,'Kocaeli'),(42,'Konya'),(43,'Kütahya'),(44,'Malatya'),(45,'Manisa'),(46,'Kahramanmaraş'),(47,'Mardin'),(48,'Muğla'),(49,'Muş'),(50,'Nevşehir'),
(51,'Niğde'),(52,'Ordu'),(53,'Rize'),(54,'Sakarya'),(55,'Samsun'),(56,'Siirt'),(57,'Sinop'),(58,'Sivas'),(59,'Tekirdağ'),(60,'Tokat'),
(61,'Trabzon'),(62,'Tunceli'),(63,'Şanlıurfa'),(64,'Uşak'),(65,'Van'),(66,'Yozgat'),(67,'Zonguldak'),(68,'Aksaray'),(69,'Bayburt'),(70,'Karaman'),
(71,'Kırıkkale'),(72,'Batman'),(73,'Şırnak'),(74,'Bartın'),(75,'Ardahan'),(76,'Iğdır'),(77,'Yalova'),(78,'Karabük'),(79,'Kilis'),(80,'Osmaniye'),(81,'Düzce');
