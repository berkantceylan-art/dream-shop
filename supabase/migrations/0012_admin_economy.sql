-- =====================================================================
-- 0012: Ekonomi güncellemesi (başlangıç kredisi 50.000) + genişletilmiş
--        admin yetkileri. (Tekrar çalıştırılabilir)
-- =====================================================================

-- ---------- Uygulama ayarları ----------
create table if not exists app_settings (
  id              boolean primary key default true check (id),
  signup_bonus    bigint not null default 50000,
  updated_at      timestamptz default now()
);
insert into app_settings(id) values (true) on conflict do nothing;
alter table app_settings enable row level security;
drop policy if exists "app settings read" on app_settings;
create policy "app settings read" on app_settings for select using (true);
drop policy if exists "app settings admin" on app_settings;
create policy "app settings admin" on app_settings for update using (is_admin()) with check (is_admin());

-- Yeni üye kredisi artık ayarlardan
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare bonus bigint;
begin
  select signup_bonus into bonus from app_settings;
  bonus := coalesce(bonus, 50000);
  insert into profiles(id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text,1,8)));
  insert into wallets(user_id, balance) values (new.id, bonus);
  insert into credit_transactions(to_user, amount, type, note) values (new.id, bonus, 'signup_bonus', 'Hoş geldin kredisi');
  return new;
end $$;

-- Mevcut kullanıcılara bir kereliğine fark (1.000 → 50.000) — tek sorguda, tekrar çalıştırmada ikinci kez eklenmez
with eligible as (
  select w.user_id from wallets w
  where exists (select 1 from credit_transactions t where t.to_user = w.user_id and t.type = 'signup_bonus' and t.amount = 1000)
    and not exists (select 1 from credit_transactions t where t.to_user = w.user_id and t.note = 'Başlangıç kredisi güncellemesi')
), tx as (
  insert into credit_transactions(to_user, amount, type, note)
  select user_id, 49000, 'admin_adjust', 'Başlangıç kredisi güncellemesi' from eligible
  returning to_user
)
update wallets set balance = balance + 49000 where user_id in (select to_user from tx);

-- Kredi paketleri ve görev ödülleri yeni ekonomiye göre
update credit_packages set credits = v.c from (values (1,10000),(2,25000),(3,60000),(4,150000),(5,350000)) v(i,c)
where credit_packages.id = v.i and credit_packages.credits in (500, 1200, 3000, 7000, 16000);
update quests set reward = 1000 where reward = 50;

-- ---------- Hesap askıya alma ----------
alter table profiles add column if not exists banned_at  timestamptz;
alter table profiles add column if not exists ban_reason text;

-- ---------- Admin fonksiyonları ----------
create or replace function admin_adjust_credits(p_user uuid, p_amount bigint, p_note text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  if p_amount = 0 then raise exception 'Miktar 0 olamaz'; end if;
  update wallets set balance = balance + p_amount where user_id = p_user and balance + p_amount >= 0 returning balance into v;
  if v is null then raise exception 'Bakiye eksiye düşemez'; end if;
  if p_amount > 0 then
    insert into credit_transactions(to_user, amount, type, note) values (p_user, p_amount, 'admin_adjust', left(p_note, 140));
  else
    insert into credit_transactions(from_user, amount, type, note) values (p_user, -p_amount, 'admin_adjust', left(p_note, 140));
  end if;
  insert into notifications(user_id, type, data) values (p_user, 'admin_credit', jsonb_build_object('amount', p_amount, 'note', p_note));
  return v;
end $$;

create or replace function admin_update_profile(p_user uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  update profiles set
    display_name = case when p ? 'display_name' then nullif(p->>'display_name','') else display_name end,
    username     = case when p ? 'username' and length(p->>'username') >= 3 then lower(p->>'username') else username end,
    bio          = case when p ? 'bio' then nullif(p->>'bio','') else bio end,
    city_id      = case when p ? 'city_id' then nullif(p->>'city_id','')::smallint else city_id end,
    district     = case when p ? 'district' then nullif(p->>'district','') else district end,
    phone        = case when p ? 'phone' then nullif(p->>'phone','') else phone end
  where id = p_user;
end $$;

create or replace function admin_ban_user(p_user uuid, p_ban boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  if p_user = auth.uid() then raise exception 'Kendini askıya alamazsın'; end if;
  update profiles set banned_at = case when p_ban then now() end, ban_reason = case when p_ban then p_reason end where id = p_user;
  if p_ban then
    update resale_listings set status = 'cancelled', closed_at = now() where seller_id = p_user and status = 'active';
    update inventory_items set status = 'owned' where owner_id = p_user and status = 'listed';
  end if;
end $$;

create or replace function admin_remove_item(p_item uuid, p_refund boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_paid bigint;
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  update resale_listings set status = 'cancelled', closed_at = now() where inventory_item_id = p_item and status = 'active';
  update inventory_items set status = 'sold', equipped = false where id = p_item and status in ('owned','listed')
    returning owner_id, paid_credits into v_owner, v_paid;
  if v_owner is null then raise exception 'Eşya bulunamadı'; end if;
  if p_refund and v_paid > 0 then
    update wallets set balance = balance + v_paid where user_id = v_owner;
    insert into credit_transactions(to_user, amount, type, ref_id, note) values (v_owner, v_paid, 'refund', p_item, 'Admin iadesi');
  end if;
end $$;

-- Admin için kullanıcı e-postası ve son giriş (auth şemasından)
create or replace function admin_user_auth(p_user uuid) returns table(email text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  return query execute 'select email::text, created_at, last_sign_in_at from auth.users where id = $1' using p_user;
exception when undefined_column then
  return query execute 'select email::text, null::timestamptz, null::timestamptz from auth.users where id = $1' using p_user;
end $$;

-- E-postaya göre kullanıcı ara
create or replace function admin_find_by_email(p_q text) returns setof uuid
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  return query select id from auth.users where email ilike '%' || p_q || '%' limit 50;
end $$;

-- Duyuru: tüm kullanıcılara veya bir şehre bildirim
create or replace function admin_broadcast(p_title text, p_body text, p_city smallint default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  insert into notifications(user_id, type, actor_id, data)
  select id, 'announcement', auth.uid(), jsonb_build_object('title', left(p_title, 120), 'body', left(p_body, 1000))
  from profiles where banned_at is null and (p_city is null or city_id = p_city);
  get diagnostics n = row_count;
  return n;
end $$;

-- Admin mesajları kullanıcının mesaj ayarına takılmaz
create or replace function send_message(p_to uuid, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_policy text; v_id bigint; v_recent int; v_admin boolean := is_admin();
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if exists (select 1 from profiles where id = auth.uid() and banned_at is not null) then raise exception 'Hesabın askıya alınmış'; end if;
  if p_to = auth.uid() then raise exception 'Kendine mesaj gönderemezsin'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Boş mesaj'; end if;
  select dm_policy into v_policy from profiles where id = p_to;
  if v_policy is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if not v_admin then
    if is_blocked_between(auth.uid(), p_to) then raise exception 'Bu kullanıcıya mesaj gönderemezsin'; end if;
    if not exists (select 1 from messages where sender_id = p_to and recipient_id = auth.uid()) then
      if v_policy = 'none' then raise exception 'Bu kullanıcı mesaj kabul etmiyor'; end if;
      if v_policy = 'followers' and not exists (select 1 from follows where follower_id = p_to and following_id = auth.uid()) then
        raise exception 'Bu kullanıcı yalnızca takip ettiklerinden mesaj kabul ediyor';
      end if;
    end if;
    select count(*) into v_recent from messages where sender_id = auth.uid() and created_at > now() - interval '1 minute';
    if v_recent >= 20 then raise exception 'Çok hızlı mesaj gönderiyorsun, biraz bekle'; end if;
  end if;
  insert into messages(sender_id, recipient_id, body) values (auth.uid(), p_to, left(trim(p_body), 2000)) returning id into v_id;
  return v_id;
end $$;

-- Admin: görevler ve işletme türleri yönetimi
drop policy if exists "admin quests" on quests;
create policy "admin quests" on quests for all using (is_admin()) with check (is_admin());
drop policy if exists "admin credit tx read" on credit_transactions;
create policy "admin credit tx read" on credit_transactions for select using (is_admin());
drop policy if exists "admin inventory read" on inventory_items;
drop policy if exists "admin messages read" on messages;
drop policy if exists "admin notifications" on notifications;
create policy "admin notifications" on notifications for select using (is_admin());

-- Genişletilmiş istatistikler
create or replace function admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'users',            (select count(*) from profiles),
    'users_today',      (select count(*) from profiles where created_at > now() - interval '1 day'),
    'users_week',       (select count(*) from profiles where created_at > now() - interval '7 days'),
    'banned',           (select count(*) from profiles where banned_at is not null),
    'stores',           (select count(*) from stores where status = 'approved' and chain_id is null),
    'stores_pending',   (select count(*) from stores where status = 'pending'),
    'products',         (select count(*) from products where status = 'active'),
    'purchases',        (select count(*) from credit_transactions where type = 'product_purchase'),
    'purchases_today',  (select count(*) from credit_transactions where type = 'product_purchase' and created_at > now() - interval '1 day'),
    'credits_spent',    (select coalesce(sum(amount),0) from credit_transactions where type = 'product_purchase'),
    'credits_in_wallets', (select coalesce(sum(balance),0) from wallets),
    'listings',         (select count(*) from resale_listings where status = 'active'),
    'tickets_open',     (select count(*) from support_tickets where status = 'open'),
    'reports_open',     (select count(*) from user_reports where status = 'open'),
    'buyers_pending',   (select count(*) from data_buyers where not approved),
    'messages_today',   (select count(*) from messages where created_at > now() - interval '1 day'),
    'analytics_consent', (select count(distinct user_id) from consents where type = 'aggregate_analytics' and granted)
  );
end $$;
