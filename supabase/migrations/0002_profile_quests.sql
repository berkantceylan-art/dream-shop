-- =====================================================================
-- 0002: Genişletilmiş profil + görev (quest) ödülleri + profil gizliliği
-- =====================================================================

-- ---------- Yeni profil alanları ----------
alter table profiles
  add column if not exists phone          text,
  add column if not exists district       text,
  add column if not exists height_cm      smallint check (height_cm between 100 and 250),
  add column if not exists shoe_size      numeric(3,1) check (shoe_size between 30 and 50),
  add column if not exists top_size       text,      -- XS..3XL
  add column if not exists bottom_size    smallint,  -- bel (inç) 24..48
  add column if not exists occupation     text,
  add column if not exists education      text,
  add column if not exists marital_status text,
  add column if not exists children_count smallint check (children_count between 0 and 15),
  add column if not exists owns_car       boolean,
  add column if not exists housing        text,      -- owner / tenant / family
  add column if not exists income_band    text,      -- isteğe bağlı
  add column if not exists interests      text[] default '{}';

-- ---------- GİZLİLİK: profiller artık herkese açık değil ----------
-- Önceki "profiles read using(true)" politikası telefon, doğum yılı vb. herkese açıyordu.
drop policy if exists "profiles read" on profiles;
create policy "profiles own read" on profiles for select using (id = auth.uid() or is_admin());

-- Herkese açık yalnızca bu alanlar:
create or replace view public_profiles as
  select id, username, display_name, city_id from profiles;
grant select on public_profiles to anon, authenticated;

-- ---------- Görevler ----------
alter type credit_tx_type add value if not exists 'quest_reward';

create table if not exists quests (
  id          text primary key,
  title       text not null,
  description text,
  reward      bigint not null check (reward > 0),
  sort        smallint default 0,
  active      boolean default true
);

create table if not exists quest_claims (
  user_id    uuid references profiles(id) on delete cascade,
  quest_id   text references quests(id),
  claimed_at timestamptz default now(),
  primary key (user_id, quest_id)
);

alter table quests       enable row level security;
alter table quest_claims enable row level security;
create policy "quests read"  on quests       for select using (active);
create policy "claims own"   on quest_claims for select using (user_id = auth.uid() or is_admin());

insert into quests(id, title, description, reward, sort) values
  ('beden',     'Beden bilgilerin',   'Boy, ayakkabı numarası ve beden ölçülerini gir.',           50, 1),
  ('telefon',   'Telefon numaran',    'Hesap güvenliğin için telefon numaranı ekle.',               50, 2),
  ('demografi', 'Seni tanıyalım',     'Meslek, eğitim, medeni durum ve çocuk bilgisi.',             50, 3),
  ('yasam',     'Yaşam tarzın',       'Araban, evin ve ilgi alanların.',                            50, 4)
on conflict (id) do nothing;

-- Görevi tamamla: alanlar doluysa bir kez ödül verir
create or replace function claim_quest(p_quest text) returns bigint
language plpgsql security definer set search_path = public as $$
declare p profiles%rowtype; q quests%rowtype; ok boolean;
begin
  select * into q from quests where id = p_quest and active;
  if not found then raise exception 'Görev bulunamadı'; end if;
  select * into p from profiles where id = auth.uid();
  if not found then raise exception 'Giriş gerekli'; end if;

  ok := case p_quest
    when 'beden'     then p.height_cm is not null and p.shoe_size is not null and p.top_size is not null and p.bottom_size is not null
    when 'telefon'   then p.phone ~ '^\+90 ?5[0-9]{9}$'
    when 'demografi' then p.occupation is not null and p.education is not null and p.marital_status is not null and p.children_count is not null
    when 'yasam'     then p.owns_car is not null and p.housing is not null and coalesce(array_length(p.interests,1),0) > 0
    else false end;
  if not ok then raise exception 'Görevin tüm alanlarını doldurmalısın'; end if;

  insert into quest_claims(user_id, quest_id) values (auth.uid(), p_quest)
    on conflict do nothing;
  if not found then raise exception 'Bu görevin ödülünü zaten aldın'; end if;

  update wallets set balance = balance + q.reward where user_id = auth.uid();
  insert into credit_transactions(to_user, amount, type, note)
    values (auth.uid(), q.reward, 'quest_reward', q.title);
  return q.reward;
end $$;
