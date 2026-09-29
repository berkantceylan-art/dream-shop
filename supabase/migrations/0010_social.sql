-- =====================================================================
-- 0010: Sosyal — takip, mesajlaşma, bildirimler, engelleme, şikâyet,
--        ev ziyareti ve beğeni, gizlilik ayarları. (Tekrar çalıştırılabilir)
-- =====================================================================

alter table profiles add column if not exists bio             text;
alter table profiles add column if not exists dm_policy       text not null default 'everyone';   -- everyone | followers | none
alter table profiles add column if not exists home_visibility text not null default 'everyone';   -- everyone | followers | none
do $$ begin
  alter table profiles add constraint profiles_dm_policy_chk check (dm_policy in ('everyone','followers','none'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_home_vis_chk check (home_visibility in ('everyone','followers','none'));
exception when duplicate_object then null; end $$;

-- Herkese açık profil alanları (hassas alanlar YOK: telefon, doğum yılı, gelir vb.)
create or replace view public_profiles as
  select id, username, display_name, city_id,
         bio, dm_policy, home_visibility, home_item_id, car_item_id, created_at, role
  from profiles;
grant select on public_profiles to anon, authenticated;

-- ---------- Takip ----------
create table if not exists follows (
  follower_id  uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on follows(following_id);

-- ---------- Engelleme ----------
create table if not exists blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

alter table follows enable row level security;
alter table blocks  enable row level security;
drop policy if exists "follows read" on follows;
create policy "follows read" on follows for select using (true);
drop policy if exists "follows insert" on follows;
create policy "follows insert" on follows for insert
  with check (follower_id = auth.uid() and not is_blocked_between(follower_id, following_id));
drop policy if exists "follows delete" on follows;
create policy "follows delete" on follows for delete using (follower_id = auth.uid() or following_id = auth.uid());
drop policy if exists "blocks own" on blocks;
create policy "blocks own" on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Engellenince takipler karşılıklı kalkar
create or replace function on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from follows where (follower_id = new.blocker_id and following_id = new.blocked_id)
                         or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end $$;
drop trigger if exists blocks_after_insert on blocks;
create trigger blocks_after_insert after insert on blocks for each row execute function on_block();

-- ---------- Mesajlar ----------
create table if not exists messages (
  id           bigserial primary key,
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz default now(),
  read_at      timestamptz
);
create index if not exists messages_pair_idx on messages(least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index if not exists messages_recipient_unread_idx on messages(recipient_id) where read_at is null;
alter table messages enable row level security;
drop policy if exists "messages own" on messages;
create policy "messages own" on messages for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create or replace function send_message(p_to uuid, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_policy text; v_id bigint; v_recent int;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if p_to = auth.uid() then raise exception 'Kendine mesaj gönderemezsin'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Boş mesaj'; end if;
  if is_blocked_between(auth.uid(), p_to) then raise exception 'Bu kullanıcıya mesaj gönderemezsin'; end if;
  select dm_policy into v_policy from profiles where id = p_to;
  if v_policy is null then raise exception 'Kullanıcı bulunamadı'; end if;
  -- Daha önce yazışılmışsa (karşı taraf başlattıysa) politika engellemez
  if not exists (select 1 from messages where sender_id = p_to and recipient_id = auth.uid()) then
    if v_policy = 'none' then raise exception 'Bu kullanıcı mesaj kabul etmiyor'; end if;
    if v_policy = 'followers' and not exists (select 1 from follows where follower_id = p_to and following_id = auth.uid()) then
      raise exception 'Bu kullanıcı yalnızca takip ettiklerinden mesaj kabul ediyor';
    end if;
  end if;
  select count(*) into v_recent from messages where sender_id = auth.uid() and created_at > now() - interval '1 minute';
  if v_recent >= 20 then raise exception 'Çok hızlı mesaj gönderiyorsun, biraz bekle'; end if;
  insert into messages(sender_id, recipient_id, body) values (auth.uid(), p_to, left(trim(p_body), 2000)) returning id into v_id;
  return v_id;
end $$;

create or replace function mark_conversation_read(p_other uuid) returns void
language sql security definer set search_path = public as $$
  update messages set read_at = now() where recipient_id = auth.uid() and sender_id = p_other and read_at is null;
$$;

-- Sohbet listesi: her karşı taraf için son mesaj + okunmamış sayısı
create or replace function my_conversations() returns table(
  other_id uuid, username text, display_name text, last_body text, last_at timestamptz, last_from_me boolean, unread bigint)
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when sender_id = auth.uid() then recipient_id else sender_id end as other, *
    from messages where sender_id = auth.uid() or recipient_id = auth.uid()
  ), last as (
    select distinct on (other) other, body, created_at, sender_id = auth.uid() as from_me from mine order by other, created_at desc
  )
  select l.other, p.username, p.display_name, l.body, l.created_at, l.from_me,
         (select count(*) from mine m where m.other = l.other and m.recipient_id = auth.uid() and m.read_at is null)
  from last l join profiles p on p.id = l.other
  order by l.created_at desc;
$$;

-- ---------- Ev beğenileri ----------
create table if not exists home_likes (
  owner_id   uuid references profiles(id) on delete cascade,
  liker_id   uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (owner_id, liker_id),
  check (owner_id <> liker_id)
);
alter table home_likes enable row level security;
drop policy if exists "home likes read" on home_likes;
create policy "home likes read" on home_likes for select using (true);
drop policy if exists "home likes own" on home_likes;
create policy "home likes own" on home_likes for insert with check (liker_id = auth.uid() and not is_blocked_between(liker_id, owner_id));
drop policy if exists "home likes delete" on home_likes;
create policy "home likes delete" on home_likes for delete using (liker_id = auth.uid());

-- ---------- Şikâyetler ----------
create table if not exists user_reports (
  id          bigserial primary key,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason      text not null,
  details     text,
  status      text not null default 'open',   -- open | reviewed
  created_at  timestamptz default now()
);
alter table user_reports enable row level security;
drop policy if exists "reports insert" on user_reports;
create policy "reports insert" on user_reports for insert with check (reporter_id = auth.uid() and status = 'open');
drop policy if exists "reports admin" on user_reports;
create policy "reports admin" on user_reports for select using (is_admin() or reporter_id = auth.uid());
drop policy if exists "reports admin update" on user_reports;
create policy "reports admin update" on user_reports for update using (is_admin()) with check (is_admin());

-- ---------- Bildirimler ----------
create table if not exists notifications (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,          -- follow | message | home_like | gift | ticket
  actor_id   uuid references profiles(id) on delete cascade,
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
alter table notifications enable row level security;
drop policy if exists "notifications own" on notifications;
create policy "notifications own" on notifications for select using (user_id = auth.uid());
drop policy if exists "notifications own update" on notifications;
create policy "notifications own update" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'follows' then
    insert into notifications(user_id, type, actor_id) values (new.following_id, 'follow', new.follower_id);
  elsif tg_table_name = 'home_likes' then
    insert into notifications(user_id, type, actor_id) values (new.owner_id, 'home_like', new.liker_id);
  elsif tg_table_name = 'messages' then
    -- aynı kişiden okunmamış mesaj bildirimi varsa yenisini ekleme
    if not exists (select 1 from notifications where user_id = new.recipient_id and actor_id = new.sender_id
                   and type = 'message' and read_at is null) then
      insert into notifications(user_id, type, actor_id, data) values (new.recipient_id, 'message', new.sender_id,
        jsonb_build_object('preview', left(new.body, 80)));
    end if;
  elsif tg_table_name = 'credit_transactions' then
    if new.type = 'gift' and new.to_user is not null then
      insert into notifications(user_id, type, actor_id, data) values (new.to_user, 'gift', new.from_user,
        jsonb_build_object('amount', new.amount, 'note', new.note));
    end if;
  elsif tg_table_name = 'support_tickets' then
    if new.admin_reply is distinct from old.admin_reply and new.admin_reply is not null then
      insert into notifications(user_id, type, data) values (new.user_id, 'ticket', jsonb_build_object('subject', new.subject));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists follows_notify on follows;
create trigger follows_notify after insert on follows for each row execute function notify();
drop trigger if exists home_likes_notify on home_likes;
create trigger home_likes_notify after insert on home_likes for each row execute function notify();
drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages for each row execute function notify();
drop trigger if exists gifts_notify on credit_transactions;
create trigger gifts_notify after insert on credit_transactions for each row execute function notify();
drop trigger if exists tickets_notify on support_tickets;
create trigger tickets_notify after update on support_tickets for each row execute function notify();

-- ---------- Anlık güncellemeler (Supabase Realtime) ----------
do $$ begin
  alter publication supabase_realtime add table messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when others then null; end $$;
