-- =====================================================================
-- 0015: Rapor paneli 2. aşama — il ısı haritası, birlikte alınanlar,
--        "neden almadın?" soruları, sponsorlu anketler, kayıtlı raporlar.
-- (Tekrar çalıştırılabilir)
-- =====================================================================

alter type credit_tx_type add value if not exists 'survey_reward';

-- Paketlere yeni raporlar
update report_plans set reports = (select array_agg(distinct x) from unnest(reports || '{geo,basket,reasons}'::text[]) x) where id in ('pro','kurumsal');
update report_plans set reports = (select array_agg(distinct x) from unnest(reports || '{survey}'::text[]) x) where id = 'kurumsal';

-- =========================================================
-- 1) İL ISI HARİTASI
-- =========================================================
create or replace function report_geo(f jsonb) returns table(city_id smallint, city text, users bigint, events bigint, segment bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform _report_gate('geo', f);
  return query
  with seg as (select * from _report_segment(f - 'city_id')),
  ev as (
    select e.user_id, s.city_id from product_events e join seg s on s.user_id = e.user_id
    where e.product_id in (select _report_products(f)) and e.created_at >= _from(f) and e.created_at < _to(f)
      and (f->>'event' is null or e.type::text = f->>'event')
  ), base as (select s.city_id, count(*) n from seg s group by 1)
  select c.id, c.name, count(distinct ev.user_id), count(*), max(b.n)
  from ev join cities c on c.id = ev.city_id join base b on b.city_id = ev.city_id
  group by c.id, c.name having count(distinct ev.user_id) >= 10
  order by 3 desc;
end $$;

-- =========================================================
-- 2) BİRLİKTE ALINANLAR / İLGİ DUYULANLAR (sepet analizi)
-- =========================================================
create or replace function report_basket(f jsonb) returns table(product_a text, product_b text, pair_users bigint, users_a bigint, confidence numeric, lift numeric)
language plpgsql security definer set search_path = public as $$
declare ev text[] := case when f->>'event' is null then '{purchase}' else array[f->>'event'] end; total bigint;
begin
  perform _report_gate('basket', f);
  create temp table if not exists _ui(user_id uuid, product_id uuid) on commit drop;
  truncate _ui;
  insert into _ui select distinct e.user_id, e.product_id from product_events e
  where e.user_id in (select user_id from _report_segment(f)) and e.type::text = any(ev)
    and e.created_at >= _from(f) and e.created_at < _to(f);
  select count(distinct user_id) into total from _ui;
  return query
  with pu as (select product_id, count(*) n from _ui group by 1),
  pairs as (
    select a.product_id pa, b.product_id pb, count(*) n from _ui a join _ui b on a.user_id = b.user_id and a.product_id <> b.product_id
    where a.product_id in (select _report_products(f)) group by 1, 2 having count(*) >= 10
  )
  select p1.name, p2.name, pairs.n, ua.n, round(pairs.n::numeric / ua.n * 100, 1),
         round((pairs.n::numeric / ua.n) / (ub.n::numeric / greatest(total, 1)), 2)
  from pairs join pu ua on ua.product_id = pairs.pa join pu ub on ub.product_id = pairs.pb
  join products p1 on p1.id = pairs.pa join products p2 on p2.id = pairs.pb
  where ua.n >= 10
  order by 6 desc, 3 desc limit 40;
end $$;

-- =========================================================
-- 3) "NEDEN ALMADIN?" SORULARI
-- =========================================================
create table if not exists purchase_feedback (
  user_id    uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  reason     text not null check (reason in ('pahali','renk','beden','model','baska_marka','ihtiyac_yok','sonra','diger')),
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);
alter table purchase_feedback enable row level security;
drop policy if exists "feedback own" on purchase_feedback;
create policy "feedback own" on purchase_feedback for select using (user_id = auth.uid());

-- Kullanıcıya sorulacak ürünler: 3+ gün önce istek listesine eklenen / teklif verilen, alınmamış, cevaplanmamış
create or replace function my_feedback_questions() returns table(product_id uuid, name text, brand text, credit_price bigint, kind text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.brand, p.credit_price, p.kind::text from products p
  where p.status = 'active' and p.id in (
      select product_id from wishlist where user_id = auth.uid() and created_at < now() - interval '3 days'
      union select product_id from price_wishes where user_id = auth.uid() and created_at < now() - interval '3 days')
    and not exists (select 1 from inventory_items i where i.owner_id = auth.uid() and i.product_id = p.id)
    and not exists (select 1 from purchase_feedback fb where fb.user_id = auth.uid() and fb.product_id = p.id)
  limit 3;
$$;

create or replace function answer_feedback(p_product uuid, p_reason text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_reward bigint := 100; v_today int;
begin
  if not exists (select 1 from my_feedback_questions() q where q.product_id = p_product) then raise exception 'Bu soru artık geçerli değil'; end if;
  insert into purchase_feedback(user_id, product_id, reason) values (auth.uid(), p_product, p_reason);
  select count(*) into v_today from purchase_feedback where user_id = auth.uid() and created_at > now() - interval '1 day';
  if v_today > 5 then return 0; end if;   -- günlük ödül sınırı
  update wallets set balance = balance + v_reward where user_id = auth.uid();
  insert into credit_transactions(to_user, amount, type, note) values (auth.uid(), v_reward, 'survey_reward', 'Soru cevabı');
  return v_reward;
end $$;

create or replace function report_reasons(f jsonb) returns table(label text, reason text, users bigint)
language plpgsql security definer set search_path = public as $$
declare g text := coalesce(f->>'group_by', 'total');
begin
  perform _report_gate('reasons', f);
  return query
  select case g when 'product' then p.name when 'brand' then coalesce(p.brand, '—') else 'Toplam' end, fb.reason, count(*)
  from purchase_feedback fb join products p on p.id = fb.product_id
  where fb.user_id in (select user_id from _report_segment(f)) and fb.product_id in (select _report_products(f))
    and fb.created_at >= _from(f) and fb.created_at < _to(f)
  group by 1, 2 having count(*) >= 10 order by 1, 3 desc;
end $$;

-- =========================================================
-- 4) SPONSORLU ANKETLER
-- =========================================================
create table if not exists surveys (
  id            bigserial primary key,
  buyer_id      uuid references data_buyers(id) on delete cascade,
  created_by    uuid references profiles(id),
  question      text not null check (char_length(question) between 5 and 200),
  options       text[] not null check (cardinality(options) between 2 and 6),
  target        jsonb not null default '{}',    -- city_id, age_min, age_max, gender
  reward        bigint not null default 200 check (reward between 10 and 5000),
  max_responses int not null default 500 check (max_responses between 10 and 100000),
  responses     int not null default 0,
  status        text not null default 'pending' check (status in ('pending','active','closed','rejected')),
  created_at    timestamptz default now(),
  ends_at       timestamptz default now() + interval '14 days'
);
create table if not exists survey_responses (
  survey_id  bigint references surveys(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  option_idx smallint not null,
  created_at timestamptz default now(),
  primary key (survey_id, user_id)
);
alter table surveys enable row level security;
alter table survey_responses enable row level security;
drop policy if exists "surveys owner" on surveys;
create policy "surveys owner" on surveys for select using (
  is_admin() or exists (select 1 from data_buyer_members m where m.buyer_id = surveys.buyer_id and m.user_id = auth.uid()));
drop policy if exists "surveys admin" on surveys;
create policy "surveys admin" on surveys for update using (is_admin()) with check (is_admin());
drop policy if exists "responses own" on survey_responses;
create policy "responses own" on survey_responses for select using (user_id = auth.uid());

create or replace function create_survey(p_question text, p_options text[], p_target jsonb, p_reward bigint, p_max int) returns bigint
language plpgsql security definer set search_path = public as $$
declare b uuid; v bigint;
begin
  if is_admin() then b := null;
  else
    select d.id into b from data_buyers d join data_buyer_members m on m.buyer_id = d.id
    join report_plans pl on pl.id = d.plan_id
    where m.user_id = auth.uid() and d.approved and 'survey' = any(pl.reports) and (d.plan_until is null or d.plan_until >= current_date) limit 1;
    if b is null then raise exception 'Sponsorlu anket Kurumsal pakette açıktır'; end if;
  end if;
  insert into surveys(buyer_id, created_by, question, options, target, reward, max_responses, status)
  values (b, auth.uid(), trim(p_question), (select array_agg(trim(o)) from unnest(p_options) o where trim(o) <> ''), coalesce(p_target, '{}'),
          p_reward, p_max, case when is_admin() then 'active' else 'pending' end)
  returning id into v;
  return v;
end $$;

-- Kullanıcıya açık anketler (hedef kitlesine uyan, doluluğu dolmamış, cevaplamadığı)
create or replace function my_open_surveys() returns table(id bigint, question text, options text[], reward bigint)
language sql stable security definer set search_path = public as $$
  select s.id, s.question, s.options, s.reward from surveys s, profiles p
  where p.id = auth.uid() and s.status = 'active' and s.ends_at > now() and s.responses < s.max_responses
    and not exists (select 1 from survey_responses r where r.survey_id = s.id and r.user_id = auth.uid())
    and (s.target->>'city_id' is null or p.city_id = (s.target->>'city_id')::smallint)
    and (s.target->>'gender' is null or p.gender = s.target->>'gender')
    and (s.target->>'age_min' is null or extract(year from now()) - p.birth_year >= (s.target->>'age_min')::int)
    and (s.target->>'age_max' is null or extract(year from now()) - p.birth_year <= (s.target->>'age_max')::int)
  order by s.reward desc limit 5;
$$;

create or replace function answer_survey(p_survey bigint, p_option int) returns bigint
language plpgsql security definer set search_path = public as $$
declare s surveys%rowtype;
begin
  if not exists (select 1 from my_open_surveys() o where o.id = p_survey) then raise exception 'Bu anket artık açık değil'; end if;
  select * into s from surveys where id = p_survey for update;
  if p_option < 0 or p_option >= cardinality(s.options) then raise exception 'Geçersiz seçenek'; end if;
  insert into survey_responses(survey_id, user_id, option_idx) values (p_survey, auth.uid(), p_option);
  update surveys set responses = responses + 1, status = case when responses + 1 >= max_responses then 'closed' else status end where id = p_survey;
  update wallets set balance = balance + s.reward where user_id = auth.uid();
  insert into credit_transactions(to_user, amount, type, note) values (auth.uid(), s.reward, 'survey_reward', 'Anket: ' || left(s.question, 60));
  return s.reward;
end $$;

-- Anket sonuçları: toplam (≥10 yanıt) + rızalı kullanıcılarda yaş/cinsiyet/şehir kırılımı (hücre ≥10)
create or replace function survey_results(p_survey bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s surveys%rowtype; r jsonb;
begin
  select * into s from surveys where id = p_survey;
  if not found then raise exception 'Anket bulunamadı'; end if;
  if not (is_admin() or exists (select 1 from data_buyer_members m where m.buyer_id = s.buyer_id and m.user_id = auth.uid())) then
    raise exception 'Yetkisiz'; end if;
  with resp as (select r.*, p.birth_year, p.gender, p.city_id from survey_responses r join profiles p on p.id = r.user_id where r.survey_id = p_survey),
  cons as (select user_id from _report_segment('{}')),
  tot as (select option_idx, count(*) n from resp group by 1),
  br as (
    select 'age' d, (floor((extract(year from now()) - birth_year) / 10) * 10)::int || '-' || ((floor((extract(year from now()) - birth_year) / 10) * 10)::int + 9) v, option_idx, count(*) n
      from resp where user_id in (select user_id from cons) group by 1, 2, 3
    union all select 'gender', coalesce(gender, 'belirtilmemiş'), option_idx, count(*) from resp where user_id in (select user_id from cons) group by 1, 2, 3
    union all select 'city', (select name from cities c where c.id = resp.city_id), option_idx, count(*) from resp where user_id in (select user_id from cons) group by 1, 2, 3
  )
  select jsonb_build_object('question', s.question, 'options', s.options, 'responses', s.responses, 'status', s.status,
    'totals', case when s.responses >= 10 then (select jsonb_agg(jsonb_build_object('option', option_idx, 'n', n) order by option_idx) from tot) end,
    'breakdown', (select coalesce(jsonb_agg(jsonb_build_object('dim', d, 'value', v, 'option', option_idx, 'n', n)), '[]') from br where n >= 10))
  into r;
  return r;
end $$;

-- =========================================================
-- 5) KAYITLI RAPORLAR
-- =========================================================
create table if not exists saved_reports (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  kind       text not null,
  filters    jsonb not null,
  created_at timestamptz default now()
);
alter table saved_reports enable row level security;
drop policy if exists "saved reports own" on saved_reports;
create policy "saved reports own" on saved_reports for all using (user_id = auth.uid()) with check (user_id = auth.uid());
