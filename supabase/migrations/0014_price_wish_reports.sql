-- =====================================================================
-- 0014: "Bu fiyata olsa alırım", fiyat alarmı, rapor paketleri ve
--        gelişmiş anonim raporlar (k ≥ 10). Tekrar çalıştırılabilir.
-- =====================================================================

alter type event_type add value if not exists 'price_wish';

-- ---------- Fiyat teklifi / alarm ----------
create table if not exists price_wishes (
  user_id     uuid references profiles(id) on delete cascade,
  product_id  uuid references products(id) on delete cascade,
  price       bigint not null check (price > 0),
  notify      boolean not null default true,
  notified_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  primary key (user_id, product_id)
);
create index if not exists price_wishes_product_idx on price_wishes(product_id);
alter table price_wishes enable row level security;
drop policy if exists "price wishes own" on price_wishes;
create policy "price wishes own" on price_wishes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function set_price_wish(p_product uuid, p_price bigint, p_notify boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare v_list bigint;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select credit_price into v_list from products where id = p_product and status = 'active';
  if v_list is null then raise exception 'Ürün bulunamadı'; end if;
  if p_price is null or p_price < 1 or p_price >= v_list then raise exception 'Teklifin mevcut fiyattan düşük olmalı'; end if;
  insert into price_wishes(user_id, product_id, price, notify)
  values (auth.uid(), p_product, p_price, p_notify)
  on conflict (user_id, product_id) do update set price = excluded.price, notify = excluded.notify, notified_at = null, updated_at = now();
  insert into product_events(user_id, product_id, type) values (auth.uid(), p_product, 'price_wish');
end $$;

-- Fiyat düşünce alarm kuranlara bildirim
create or replace function notify_price_drop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.credit_price < old.credit_price and new.status = 'active' then
    insert into notifications(user_id, type, data)
    select w.user_id, 'price_drop', jsonb_build_object('product_id', new.id, 'name', new.name, 'price', new.credit_price, 'wish', w.price)
    from price_wishes w where w.product_id = new.id and w.notify and w.notified_at is null and new.credit_price <= w.price;
    update price_wishes set notified_at = now()
    where product_id = new.id and notify and notified_at is null and new.credit_price <= price;
  end if;
  return new;
end $$;
drop trigger if exists products_price_drop on products;
create trigger products_price_drop after update of credit_price on products for each row execute function notify_price_drop();

-- ---------- Rapor paketleri (abonelik + rapor başı kredi) ----------
create table if not exists report_plans (
  id              text primary key,
  name            text not null,
  monthly_price_try numeric(10,2) not null,
  monthly_queries int,                 -- null = sınırsız
  reports         text[] not null,     -- bu pakette açık raporlar
  sort            smallint default 0
);
insert into report_plans(id, name, monthly_price_try, monthly_queries, reports, sort) values
  ('baslangic', 'Başlangıç', 4990, 50,  '{overview,interest,profile,funnel,persona}', 1),
  ('pro',       'Pro',       14990, 500, '{overview,interest,profile,funnel,persona,price,brand,variants,time}', 2),
  ('kurumsal',  'Kurumsal',  39990, null,'{overview,interest,profile,funnel,persona,price,brand,variants,time}', 3)
on conflict (id) do nothing;
alter table report_plans enable row level security;
drop policy if exists "plans read" on report_plans;
create policy "plans read" on report_plans for select using (true);
drop policy if exists "plans admin" on report_plans;
create policy "plans admin" on report_plans for all using (is_admin()) with check (is_admin());

alter table data_buyers add column if not exists plan_id        text references report_plans(id);
alter table data_buyers add column if not exists plan_until     date;
alter table data_buyers add column if not exists report_credits int not null default 0;   -- rapor başı satın alınan hak
alter table report_queries add column if not exists buyer_id uuid references data_buyers(id);
alter table report_queries add column if not exists charged  text;                          -- plan | credit | admin

-- Erişim kapısı: paket / kredi / kota kontrolü + kayıt
create or replace function _report_gate(p_report text, f jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare b data_buyers%rowtype; pl report_plans%rowtype; used int; how text;
begin
  if is_admin() then
    insert into report_queries(user_id, kind, filters, charged) values (auth.uid(), p_report, f, 'admin');
    return;
  end if;
  select d.* into b from data_buyers d join data_buyer_members m on m.buyer_id = d.id
  where m.user_id = auth.uid() and d.approved limit 1;
  if not found then raise exception 'Rapor yetkin yok'; end if;
  select * into pl from report_plans where id = b.plan_id and (b.plan_until is null or b.plan_until >= current_date);
  if found and p_report = any(pl.reports) then
    select count(*) into used from report_queries
      where buyer_id = b.id and charged = 'plan' and created_at >= date_trunc('month', now());
    if pl.monthly_queries is null or used < pl.monthly_queries then how := 'plan'; end if;
  end if;
  if how is null then
    if b.report_credits > 0 then
      update data_buyers set report_credits = report_credits - 1 where id = b.id;
      how := 'credit';
    elsif pl.id is not null and p_report = any(pl.reports) then
      raise exception 'Bu ayki sorgu kotan doldu. Rapor kredisi al veya paketini yükselt.';
    else
      raise exception 'Bu rapor paketinde yok. Paketini yükselt veya rapor kredisi al.';
    end if;
  end if;
  insert into report_queries(user_id, buyer_id, kind, filters, charged) values (auth.uid(), b.id, p_report, f, how);
end $$;
revoke all on function _report_gate(text, jsonb) from public, anon, authenticated;

-- Panel özeti: paket, kalan kota, kredi
create or replace function my_report_account() returns jsonb
language plpgsql security definer set search_path = public as $$
declare b data_buyers%rowtype; pl report_plans%rowtype; used int;
begin
  if is_admin() then return jsonb_build_object('admin', true, 'reports', (select reports from report_plans where id = 'kurumsal')); end if;
  select d.* into b from data_buyers d join data_buyer_members m on m.buyer_id = d.id where m.user_id = auth.uid() and d.approved limit 1;
  if not found then return null; end if;
  select * into pl from report_plans where id = b.plan_id and (b.plan_until is null or b.plan_until >= current_date);
  select count(*) into used from report_queries where buyer_id = b.id and charged = 'plan' and created_at >= date_trunc('month', now());
  return jsonb_build_object('company', b.company, 'plan', pl.name, 'plan_id', pl.id, 'plan_until', b.plan_until,
    'quota', pl.monthly_queries, 'used', used, 'credits', b.report_credits, 'reports', coalesce(pl.reports, '{}'));
end $$;

-- Eski raporlar da kapıdan geçsin
create or replace function can_read_reports() returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from data_buyer_members m join data_buyers b on b.id = m.buyer_id where m.user_id = auth.uid() and b.approved);
$$;

-- Ürün filtresi (segmentten bağımsız): kind, category, brand, product
create or replace function _report_products(f jsonb) returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.id from products p
  where (f->>'kind' is null or p.kind::text = f->>'kind')
    and (f->>'category_id' is null or p.category_id = (f->>'category_id')::int)
    and (f->>'brand' is null or p.brand ilike '%' || (f->>'brand') || '%')
    and (f->>'product_id' is null or p.id = (f->>'product_id')::uuid);
$$;
revoke all on function _report_products(jsonb) from public, anon, authenticated;

-- Tarih aralığı yardımcıları
create or replace function _from(f jsonb) returns timestamptz language sql stable as $$
  select coalesce((f->>'from')::date, (now() - interval '30 days')::date)::timestamptz $$;
create or replace function _to(f jsonb) returns timestamptz language sql stable as $$
  select (coalesce((f->>'to')::date, now()::date) + 1)::timestamptz $$;

-- =========================================================
-- 1) GENEL BAKIŞ
-- =========================================================
create or replace function report_overview(f jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; seg int;
begin
  perform _report_gate('overview', f);
  select count(*) into seg from _report_segment(f);
  with ev as (
    select e.* from product_events e
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
      and e.created_at >= _from(f) and e.created_at < _to(f)
  ), k as (
    select type::text t, count(distinct user_id) u, count(*) n from ev group by 1
  ), rising as (
    select p.name, p.brand,
      count(distinct e.user_id) filter (where e.created_at >= now() - interval '7 days') cur,
      count(distinct e.user_id) filter (where e.created_at < now() - interval '7 days' and e.created_at >= now() - interval '14 days') prev
    from product_events e join products p on p.id = e.product_id
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
      and e.created_at >= now() - interval '14 days'
    group by p.id, p.name, p.brand
    having count(distinct e.user_id) filter (where e.created_at >= now() - interval '7 days') >= 10
    order by (count(distinct e.user_id) filter (where e.created_at >= now() - interval '7 days'))::numeric
             / greatest(count(distinct e.user_id) filter (where e.created_at < now() - interval '7 days' and e.created_at >= now() - interval '14 days'), 1) desc
    limit 8
  ), wish as (
    select avg(w.price::numeric / p.credit_price) ratio, count(distinct w.user_id) u
    from price_wishes w join products p on p.id = w.product_id
    where w.user_id in (select user_id from _report_segment(f)) and w.product_id in (select _report_products(f))
  )
  select jsonb_build_object(
    'segment', case when seg >= 10 then seg end,
    'kpis', (select coalesce(jsonb_object_agg(t, jsonb_build_object('users', case when u >= 10 then u end, 'events', case when u >= 10 then n end)), '{}') from k),
    'wish_ratio', (select case when u >= 10 then round(ratio, 3) end from wish),
    'wish_users', (select case when u >= 10 then u end from wish),
    'rising', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'brand', brand, 'cur', cur, 'prev', prev)), '[]') from rising)
  ) into r;
  return r;
end $$;

-- =========================================================
-- 2) FİYAT & TALEP (bu fiyata alırım)
-- =========================================================
create or replace function report_price(f jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform _report_gate('price', f);
  with w as (
    select w.product_id, w.price, p.credit_price list, p.name, p.brand
    from price_wishes w join products p on p.id = w.product_id
    where w.user_id in (select user_id from _report_segment(f)) and w.product_id in (select _report_products(f))
  ), per as (
    select product_id, name, brand, list, count(*) n,
      percentile_cont(0.25) within group (order by price) p25,
      percentile_cont(0.5)  within group (order by price) p50,
      percentile_cont(0.75) within group (order by price) p75
    from w group by product_id, name, brand, list having count(*) >= 10
  ), curve as (
    select pr.product_id, pct, round(pr.list * pct / 100.0) price,
      (select count(*) from w where w.product_id = pr.product_id and w.price >= pr.list * pct / 100.0) buyers
    from per pr cross join generate_series(50, 95, 5) pct
  ), best as (
    select distinct on (product_id) product_id, pct, price, buyers from curve
    where buyers >= 10 order by product_id, price * buyers desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'product', per.name, 'brand', per.brand, 'list', per.list, 'wishers', per.n,
    'p25', round(per.p25), 'median', round(per.p50), 'p75', round(per.p75),
    'median_discount', round((1 - per.p50 / per.list) * 100),
    'curve', (select jsonb_agg(jsonb_build_object('pct', c.pct, 'price', c.price, 'buyers', case when c.buyers >= 10 then c.buyers end) order by c.pct)
              from curve c where c.product_id = per.product_id),
    'best', (select jsonb_build_object('discount', 100 - b.pct, 'price', b.price, 'buyers', b.buyers) from best b where b.product_id = per.product_id)
  ) order by per.n desc), '[]') into r from per;
  return jsonb_build_object('products', r);
end $$;

-- =========================================================
-- 3) DÖNÜŞÜM HUNİSİ
-- =========================================================
create or replace function report_funnel(f jsonb) returns table(label text, views bigint, wishlist bigint, price_wish bigint, purchase bigint)
language plpgsql security definer set search_path = public as $$
declare g text := coalesce(f->>'group_by', 'product');
begin
  perform _report_gate('funnel', f);
  if g not in ('product','brand','category','kind','total') then raise exception 'Geçersiz gruplama'; end if;
  return query
  with ev as (
    select e.user_id, e.type::text t, case g when 'product' then p.name when 'brand' then coalesce(p.brand,'—')
      when 'category' then coalesce(c.name,'—') when 'kind' then p.kind::text else 'Toplam' end lbl
    from product_events e join products p on p.id = e.product_id left join categories c on c.id = p.category_id
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
      and e.created_at >= _from(f) and e.created_at < _to(f)
  )
  select lbl,
    count(distinct user_id) filter (where t = 'view'),
    count(distinct user_id) filter (where t = 'wishlist'),
    count(distinct user_id) filter (where t = 'price_wish'),
    count(distinct user_id) filter (where t = 'purchase')
  from ev group by lbl
  having count(distinct user_id) >= 10
  order by 2 desc limit 50;
end $$;

-- =========================================================
-- 4) MARKA & PAZAR PAYI
-- =========================================================
create or replace function report_brand(f jsonb) returns table(brand text, views bigint, wishes bigint, purchases bigint, credits bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform _report_gate('brand', f);
  return query
  with ev as (
    select e.user_id, e.type::text t, coalesce(p.brand, '—') b, p.credit_price
    from product_events e join products p on p.id = e.product_id
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f - 'brand'))
      and e.created_at >= _from(f) and e.created_at < _to(f)
  )
  select b, count(distinct user_id) filter (where t = 'view'),
    count(distinct user_id) filter (where t in ('wishlist','price_wish')),
    count(distinct user_id) filter (where t = 'purchase'),
    coalesce(sum(credit_price) filter (where t = 'purchase'), 0)::bigint
  from ev group by b having count(distinct user_id) >= 10 order by 2 desc limit 30;
end $$;

-- =========================================================
-- 5) PERSONA (ilgilenen kitle kim?)
-- =========================================================
create or replace function report_persona(f jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; n int;
begin
  perform _report_gate('persona', f);
  create temp table if not exists _aud(user_id uuid primary key) on commit drop;
  truncate _aud;
  insert into _aud select distinct e.user_id from product_events e
  where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
    and e.created_at >= _from(f) and e.created_at < _to(f)
    and (f->>'event' is null or e.type::text = f->>'event');
  select count(*) into n from _aud;
  if n < 10 then return jsonb_build_object('audience', null); end if;
  with p as (select pr.* from profiles pr join _aud a on a.user_id = pr.id),
  dims as (
    select 'age' d, (floor((extract(year from now()) - birth_year) / 10) * 10)::int || '-' || ((floor((extract(year from now()) - birth_year) / 10) * 10)::int + 9) v from p
    union all select 'gender', coalesce(gender, 'belirtilmemiş') from p
    union all select 'city', (select name from cities c where c.id = p.city_id) from p
    union all select 'income', income_band from p
    union all select 'occupation', occupation from p
    union all select 'education', education from p
    union all select 'marital', marital_status from p
    union all select 'housing', housing from p
    union all select 'car', case owns_car when true then 'Arabası var' when false then 'Arabası yok' end from p
    union all select 'interest', unnest(interests) from p
  ), agg as (select d, v, count(*) c from dims where v is not null and v <> '' group by d, v having count(*) >= 10)
  select jsonb_build_object('audience', n,
    'dims', (select jsonb_object_agg(d, arr) from (select d, jsonb_agg(jsonb_build_object('label', v, 'users', c) order by c desc) arr from agg group by d) x))
  into r;
  return r;
end $$;

-- =========================================================
-- 6) BEDEN & VARYANT TALEBİ
-- =========================================================
create or replace function report_variants(f jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform _report_gate('variants', f);
  with aud as (
    select distinct e.user_id from product_events e join products p on p.id = e.product_id
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
      and e.type in ('wishlist','price_wish','purchase') and e.created_at >= _from(f) and e.created_at < _to(f)
  ), s as (
    select 'top' d, top_size v from profiles where id in (select user_id from aud)
    union all select 'bottom', bottom_size::text from profiles where id in (select user_id from aud)
    union all select 'shoe', shoe_size::text from profiles where id in (select user_id from aud)
    union all select 'height', (floor(height_cm / 10) * 10)::int || ' cm' from profiles where id in (select user_id from aud)
  ), colors as (
    select p.attributes->'avatar'->>'color' v, count(distinct e.user_id) c
    from product_events e join products p on p.id = e.product_id
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
      and e.type = 'purchase' and p.attributes->'avatar'->>'color' is not null
    group by 1 having count(distinct e.user_id) >= 10
  ), agg as (select d, v, count(*) c from s where v is not null group by d, v having count(*) >= 10)
  select jsonb_build_object(
    'sizes', (select jsonb_object_agg(d, arr) from (select d, jsonb_agg(jsonb_build_object('label', v, 'users', c) order by v) arr from agg group by d) x),
    'colors', (select coalesce(jsonb_agg(jsonb_build_object('color', v, 'users', c) order by c desc), '[]') from colors)) into r;
  return r;
end $$;

-- =========================================================
-- 7) ZAMAN ANALİZİ (günlük trend + gün×saat ısı haritası)
-- =========================================================
create or replace function report_time(f jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform _report_gate('time', f);
  with ev as (
    select e.user_id, e.type::text t, e.created_at at time zone 'Europe/Istanbul' ts
    from product_events e
    where e.user_id in (select user_id from _report_segment(f)) and e.product_id in (select _report_products(f))
      and e.created_at >= _from(f) and e.created_at < _to(f)
      and (f->>'event' is null or e.type::text = f->>'event')
  ), daily as (
    select ts::date d, count(distinct user_id) u, count(*) n from ev group by 1
  ), heat as (
    select extract(isodow from ts)::int dow, extract(hour from ts)::int h, count(distinct user_id) u from ev group by 1, 2
  )
  select jsonb_build_object(
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'users', case when u >= 10 then u end, 'events', case when u >= 10 then n end) order by d), '[]') from daily),
    'heat', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', h, 'users', case when u >= 10 then u end)), '[]') from heat)) into r;
  return r;
end $$;

-- Eski ilgi / profil raporları paket kapısından geçsin
create or replace function _legacy_gate() returns trigger language plpgsql as $$ begin return new; end $$;

-- Eski ilgi / profil raporları da paket kapısından geçsin

create or replace function report_interest(f jsonb) returns table(label text, users bigint, events bigint)
language plpgsql security definer set search_path = public as $$
declare g text := coalesce(f->>'group_by', 'kind'); v_rows int;
begin
  perform _report_gate('interest', f);
  if g not in ('city','age_band','gender','kind','category','brand','product','month','event') then raise exception 'Geçersiz gruplama'; end if;
  return query
  with seg as (select * from _report_segment(f)),
  ev as (
    select e.user_id, e.type::text as event, e.created_at, p.kind::text as kind, p.brand, p.name as product,
           cat.name as category, s.city_id, s.age_band, s.gender
    from product_events e
    join seg s on s.user_id = e.user_id
    join products p on p.id = e.product_id
    left join categories cat on cat.id = p.category_id
    where (f->>'event' is null or e.type::text = f->>'event')
      and (f->>'kind' is null or p.kind::text = f->>'kind')
      and (f->>'category_id' is null or p.category_id = (f->>'category_id')::int)
      and (f->>'brand' is null or p.brand ilike '%' || (f->>'brand') || '%')
      and (f->>'from' is null or e.created_at >= (f->>'from')::date)
      and (f->>'to' is null or e.created_at < (f->>'to')::date + 1)
  )
  select case g
           when 'city' then (select c.name from cities c where c.id = ev.city_id)
           when 'age_band' then ev.age_band || '-' || (ev.age_band + 9) || ' yaş'
           when 'gender' then ev.gender
           when 'kind' then ev.kind
           when 'category' then coalesce(ev.category, '—')
           when 'brand' then coalesce(ev.brand, '—')
           when 'product' then ev.product
           when 'month' then to_char(date_trunc('month', ev.created_at), 'YYYY-MM')
           when 'event' then ev.event
         end as lbl,
         count(distinct ev.user_id), count(*)
  from ev group by 1
  having count(distinct ev.user_id) >= 10
  order by 2 desc, 3 desc
  limit 200;
  get diagnostics v_rows = row_count;
end $$;

create or replace function report_profile(f jsonb) returns table(label text, users bigint)
language plpgsql security definer set search_path = public as $$
declare fld text := coalesce(f->>'field', 'shoe_size'); v_rows int;
begin
  perform _report_gate('profile', f);
  if fld not in ('shoe_size','top_size','bottom_size','height_band','income_band','housing','owns_car','occupation',
                 'education','marital_status','children_count','interests','city','age_band','gender') then
    raise exception 'Geçersiz alan'; end if;
  return query
  with seg as (select * from _report_segment(f)),
  vals as (
    select s.user_id,
      case fld
        when 'shoe_size' then p.shoe_size::text
        when 'top_size' then p.top_size
        when 'bottom_size' then p.bottom_size::text
        when 'height_band' then (floor(p.height_cm / 10) * 10)::int || '-' || ((floor(p.height_cm / 10) * 10)::int + 9) || ' cm'
        when 'income_band' then p.income_band
        when 'housing' then p.housing
        when 'owns_car' then case p.owns_car when true then 'Arabası var' when false then 'Arabası yok' end
        when 'occupation' then p.occupation
        when 'education' then p.education
        when 'marital_status' then p.marital_status
        when 'children_count' then p.children_count::text
        when 'city' then (select c.name from cities c where c.id = s.city_id)
        when 'age_band' then s.age_band || '-' || (s.age_band + 9) || ' yaş'
        when 'gender' then s.gender
      end as v
    from seg s join profiles p on p.id = s.user_id
    where fld <> 'interests'
    union all
    select s.user_id, unnest(p.interests) from seg s join profiles p on p.id = s.user_id where fld = 'interests'
  )
  select v, count(distinct user_id) from vals where v is not null and v <> ''
  group by v having count(distinct user_id) >= 10
  order by 2 desc limit 200;
  get diagnostics v_rows = row_count;
end $$;
