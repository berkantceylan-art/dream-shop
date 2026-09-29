-- =====================================================================
-- 0007: Profil — kredi gönderme, hediye çekleri, kredi paketleri, destek talepleri
-- (Tekrar çalıştırılabilir)
-- =====================================================================

alter type credit_tx_type add value if not exists 'gift_card_create';
alter type credit_tx_type add value if not exists 'gift_card_redeem';

-- ---------- Kredi paketleri (gerçek ödeme entegrasyonu sonraki adımda) ----------
insert into credit_packages(id, name, credits, price_try, active) values
  (1, 'Başlangıç', 500,   49.99, true),
  (2, 'Popüler',   1200,  99.99, true),
  (3, 'Avantajlı', 3000,  219.99, true),
  (4, 'Mega',      7000,  449.99, true),
  (5, 'Efsane',    16000, 899.99, true)
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('credit_packages','id'), greatest(5, (select max(id) from credit_packages)));

-- ---------- Kullanıcı adıyla kredi gönder / hediye et ----------
create or replace function send_credits(p_username text, p_amount bigint, p_note text default null, p_gift boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_to uuid;
begin
  select id into v_to from profiles where username = lower(trim(p_username));
  if v_to is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if v_to = auth.uid() then raise exception 'Kendine kredi gönderemezsin'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Geçersiz miktar'; end if;
  if p_amount > 100000 then raise exception 'Tek seferde en fazla 100.000 kredi gönderilebilir'; end if;

  update wallets set balance = balance - p_amount where user_id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'Yetersiz kredi'; end if;
  update wallets set balance = balance + p_amount where user_id = v_to;
  insert into credit_transactions(from_user, to_user, amount, type, note)
  values (auth.uid(), v_to, p_amount, case when p_gift then 'gift' else 'transfer' end::credit_tx_type, left(p_note, 140));
end $$;

-- ---------- Hediye çekleri ----------
create table if not exists gift_cards (
  code        text primary key,
  amount      bigint not null check (amount > 0),
  message     text,
  created_by  uuid references profiles(id),
  is_promo    boolean not null default false,   -- admin kampanya kodu (kredi düşmez)
  max_uses    int not null default 1,
  uses        int not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);
create table if not exists gift_card_redemptions (
  code        text references gift_cards(code) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  redeemed_at timestamptz default now(),
  primary key (code, user_id)
);
alter table gift_cards enable row level security;
alter table gift_card_redemptions enable row level security;
drop policy if exists "gift cards own" on gift_cards;
create policy "gift cards own" on gift_cards for select using (created_by = auth.uid() or is_admin());
drop policy if exists "gift redemptions own" on gift_card_redemptions;
create policy "gift redemptions own" on gift_card_redemptions for select using (user_id = auth.uid() or is_admin());

create or replace function create_gift_card(p_amount bigint, p_message text default null,
  p_max_uses int default 1, p_days int default 365) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_admin boolean := is_admin();
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Geçersiz miktar'; end if;
  if not v_admin and p_max_uses <> 1 then raise exception 'Çok kullanımlık kodu yalnızca admin oluşturabilir'; end if;
  if not v_admin then
    update wallets set balance = balance - p_amount where user_id = auth.uid() and balance >= p_amount;
    if not found then raise exception 'Yetersiz kredi'; end if;
  end if;
  loop
    v_code := 'DREAM-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;
  insert into gift_cards(code, amount, message, created_by, is_promo, max_uses, expires_at)
  values (v_code, p_amount, left(p_message, 140), auth.uid(), v_admin, greatest(p_max_uses, 1), now() + make_interval(days => p_days));
  if not v_admin then
    insert into credit_transactions(from_user, amount, type, note) values (auth.uid(), p_amount, 'gift_card_create', v_code);
  end if;
  return v_code;
end $$;

create or replace function redeem_gift_card(p_code text) returns bigint
language plpgsql security definer set search_path = public as $$
declare g gift_cards%rowtype;
begin
  select * into g from gift_cards where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Kod bulunamadı'; end if;
  if g.expires_at is not null and g.expires_at < now() then raise exception 'Bu kodun süresi dolmuş'; end if;
  if g.uses >= g.max_uses then raise exception 'Bu kod daha önce kullanılmış'; end if;
  if not g.is_promo and g.created_by = auth.uid() then raise exception 'Kendi hediye çekini kullanamazsın, bir arkadaşına gönder'; end if;
  insert into gift_card_redemptions(code, user_id) values (g.code, auth.uid()) on conflict do nothing;
  if not found then raise exception 'Bu kodu zaten kullandın'; end if;
  update gift_cards set uses = uses + 1 where code = g.code;
  update wallets set balance = balance + g.amount where user_id = auth.uid();
  insert into credit_transactions(to_user, amount, type, note) values (auth.uid(), g.amount, 'gift_card_redeem', g.code);
  return g.amount;
end $$;

-- ---------- Destek talepleri (hata bildirimi, öneri, hesap silme…) ----------
do $$ begin
  create type ticket_status as enum ('open','answered','closed');
exception when duplicate_object then null; end $$;

create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  category    text not null,        -- hata, oneri, odeme, hesap, hesap_silme, diger
  subject     text not null,
  message     text not null,
  page_url    text,
  status      ticket_status not null default 'open',
  admin_reply text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists support_tickets_user_idx on support_tickets(user_id, created_at desc);
alter table support_tickets enable row level security;
drop policy if exists "tickets own read" on support_tickets;
create policy "tickets own read" on support_tickets for select using (user_id = auth.uid() or is_admin());
drop policy if exists "tickets own insert" on support_tickets;
create policy "tickets own insert" on support_tickets for insert
  with check (user_id = auth.uid() and status = 'open' and admin_reply is null);
drop policy if exists "tickets admin update" on support_tickets;
create policy "tickets admin update" on support_tickets for update using (is_admin()) with check (is_admin());

-- ---------- Kullanıcı adı ↔ id (herkese açık görünümden) ----------
-- public_profiles zaten var (0002). Profil ayarlarında ilçe de düzenlenebilir.
