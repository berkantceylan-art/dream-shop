-- =====================================================================
-- 0011: 3. kişiler rapor paneli — veri alıcısı başvurusu ve
--        ANONİM + TOPLU rapor fonksiyonları.
--  * Yalnızca güncel 'aggregate_analytics' rızası olan kullanıcılar dahil edilir.
--  * 10'dan az farklı kullanıcı içeren gruplar ASLA döndürülmez (k-anonimlik).
--  * Kişi bazlı hiçbir alan (id, kullanıcı adı, telefon…) döndürülmez.
-- (Tekrar çalıştırılabilir)
-- =====================================================================

alter table data_buyers add column if not exists created_by    uuid references profiles(id) default auth.uid();
alter table data_buyers add column if not exists contact_email text;
alter table data_buyers add column if not exists sector        text;
alter table data_buyers add column if not exists purpose       text;

drop policy if exists "buyer apply" on data_buyers;
create policy "buyer apply" on data_buyers for insert with check (created_by = auth.uid() and approved = false);
drop policy if exists "buyer read" on data_buyers;
create policy "buyer read" on data_buyers for select using (
  is_admin() or created_by = auth.uid()
  or exists (select 1 from data_buyer_members m where m.buyer_id = data_buyers.id and m.user_id = auth.uid()));
drop policy if exists "buyer admin" on data_buyers;
create policy "buyer admin" on data_buyers for update using (is_admin()) with check (is_admin());
drop policy if exists "buyer member join" on data_buyer_members;
create policy "buyer member join" on data_buyer_members for insert with check (
  user_id = auth.uid() and exists (select 1 from data_buyers b where b.id = buyer_id and b.created_by = auth.uid()));

-- Admin onayı: şirketi onayla + kurucuyu data_buyer rolüne al
create or replace function admin_approve_buyer(p_buyer uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  update data_buyers set approved = p_ok where id = p_buyer;
  update profiles set role = (case when p_ok then 'data_buyer' else 'user' end)::user_role
   where id in (select user_id from data_buyer_members where buyer_id = p_buyer) and role in ('user','data_buyer');
end $$;

-- Rapor çekme yetkisi
create or replace function can_read_reports() returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from data_buyer_members m join data_buyers b on b.id = m.buyer_id
    where m.user_id = auth.uid() and b.approved);
$$;

-- Rapor sorgu kaydı (denetim izi)
create table if not exists report_queries (
  id         bigserial primary key,
  user_id    uuid references profiles(id),
  kind       text not null,
  filters    jsonb not null,
  rows       int,
  created_at timestamptz default now()
);
alter table report_queries enable row level security;
drop policy if exists "report queries read" on report_queries;
create policy "report queries read" on report_queries for select using (is_admin() or user_id = auth.uid());

-- Rızalı kullanıcı kümesi + segment filtresi (şehir, yaş, cinsiyet)
create or replace function _report_segment(f jsonb) returns table(user_id uuid, city_id smallint, age_band int, gender text)
language sql stable security definer set search_path = public as $$
  with latest as (
    select distinct on (c.user_id) c.user_id, c.granted from consents c
    where c.type = 'aggregate_analytics' order by c.user_id, c.created_at desc
  )
  select p.id, p.city_id,
         (floor((extract(year from now()) - p.birth_year) / 10) * 10)::int,
         coalesce(p.gender, 'belirtilmemiş')
  from profiles p join latest l on l.user_id = p.id and l.granted
  where (f->>'city_id' is null or p.city_id = (f->>'city_id')::smallint)
    and (f->>'age_min' is null or extract(year from now()) - p.birth_year >= (f->>'age_min')::int)
    and (f->>'age_max' is null or extract(year from now()) - p.birth_year <= (f->>'age_max')::int)
    and (f->>'gender'  is null or p.gender = f->>'gender');
$$;
revoke all on function _report_segment(jsonb) from public, anon, authenticated;

-- İLGİ RAPORU: görüntüleme / istek listesi / satın alma / 2. el olayları
-- group_by: city | age_band | gender | kind | category | brand | product | month | event
create or replace function report_interest(f jsonb) returns table(label text, users bigint, events bigint)
language plpgsql security definer set search_path = public as $$
declare g text := coalesce(f->>'group_by', 'kind'); v_rows int;
begin
  if not can_read_reports() then raise exception 'Rapor yetkin yok'; end if;
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
  insert into report_queries(user_id, kind, filters, rows) values (auth.uid(), 'interest', f, v_rows);
end $$;

-- PROFİL DAĞILIMI: segmentteki kullanıcıların beden / ayakkabı / gelir … dağılımı
create or replace function report_profile(f jsonb) returns table(label text, users bigint)
language plpgsql security definer set search_path = public as $$
declare fld text := coalesce(f->>'field', 'shoe_size'); v_rows int;
begin
  if not can_read_reports() then raise exception 'Rapor yetkin yok'; end if;
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
  insert into report_queries(user_id, kind, filters, rows) values (auth.uid(), 'profile', f, v_rows);
end $$;

-- Segment büyüklüğü (10'un altıysa null döner)
create or replace function report_segment_size(f jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if not can_read_reports() then raise exception 'Rapor yetkin yok'; end if;
  select count(*) into n from _report_segment(f);
  return case when n >= 10 then n else null end;
end $$;
