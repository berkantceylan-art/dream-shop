-- =====================================================================
-- 0013: Sosyal akış — gönderiler, beğeni, yorum, kaydetme, #etiket,
--        @bahsetme, hikâyeler (24 saat), keşfet ve gündem.
-- (Tekrar çalıştırılabilir)
-- =====================================================================

alter table profiles add column if not exists cover_color    text not null default 'crystal';
alter table profiles add column if not exists share_activity boolean not null default false;
alter table profiles add column if not exists pinned_post_id bigint;

create or replace view public_profiles as
  select id, username, display_name, city_id,
         bio, dm_policy, home_visibility, home_item_id, car_item_id, created_at, role,
         cover_color, pinned_post_id
  from profiles;
grant select on public_profiles to anon, authenticated;

-- ---------- Gönderiler ----------
create table if not exists posts (
  id            bigserial primary key,
  author_id     uuid not null references profiles(id) on delete cascade,
  body          text check (char_length(body) <= 2200),
  images        text[] not null default '{}',
  item_id       uuid references inventory_items(id) on delete set null,   -- iliştirilen eşya
  product_id    uuid references products(id) on delete set null,
  kind          text not null default 'post',        -- post | activity
  visibility    text not null default 'public',      -- public | followers
  like_count    int not null default 0,
  comment_count int not null default 0,
  city_id       smallint,
  created_at    timestamptz default now(),
  deleted_at    timestamptz,
  check (visibility in ('public','followers')),
  check (coalesce(char_length(body),0) > 0 or cardinality(images) > 0 or product_id is not null)
);
create index if not exists posts_author_idx on posts(author_id, created_at desc);
create index if not exists posts_recent_idx on posts(created_at desc) where deleted_at is null;
create index if not exists posts_city_idx on posts(city_id, created_at desc) where deleted_at is null;

create table if not exists post_likes (
  post_id bigint references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create table if not exists post_saves (
  post_id bigint references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create table if not exists post_comments (
  id         bigserial primary key,
  post_id    bigint not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists post_comments_post_idx on post_comments(post_id, created_at);
create table if not exists post_tags (
  post_id bigint references posts(id) on delete cascade,
  tag     text not null,
  created_at timestamptz default now(),
  primary key (post_id, tag)
);
create index if not exists post_tags_tag_idx on post_tags(tag, created_at desc);

-- Görebilir miyim? (silinmemiş + engel yok + görünürlük)
create or replace function can_see_post(p posts) returns boolean
language sql stable security definer set search_path = public as $$
  select p.deleted_at is null
    and (p.author_id = auth.uid() or is_admin() or (
      not is_blocked_between(p.author_id, auth.uid())
      and not exists (select 1 from profiles a where a.id = p.author_id and a.banned_at is not null)
      and (p.visibility = 'public' or exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = p.author_id))
    ));
$$;

alter table posts         enable row level security;
alter table post_likes    enable row level security;
alter table post_saves    enable row level security;
alter table post_comments enable row level security;
alter table post_tags     enable row level security;

drop policy if exists "posts read" on posts;
create policy "posts read" on posts for select using (can_see_post(posts));
drop policy if exists "posts insert" on posts;
create policy "posts insert" on posts for insert with check (
  author_id = auth.uid() and kind = 'post' and like_count = 0 and comment_count = 0
  and not exists (select 1 from profiles where id = auth.uid() and banned_at is not null)
  and (item_id is null or exists (select 1 from inventory_items i where i.id = item_id and i.owner_id = auth.uid())));
drop policy if exists "posts update" on posts;
create policy "posts update" on posts for update using (author_id = auth.uid() or is_admin()) with check (author_id = auth.uid() or is_admin());

drop policy if exists "likes read" on post_likes;
create policy "likes read" on post_likes for select using (true);
drop policy if exists "likes own" on post_likes;
create policy "likes own" on post_likes for insert with check (user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and can_see_post(p)));
drop policy if exists "likes delete" on post_likes;
create policy "likes delete" on post_likes for delete using (user_id = auth.uid());

drop policy if exists "saves own" on post_saves;
create policy "saves own" on post_saves for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "comments read" on post_comments;
create policy "comments read" on post_comments for select using (
  deleted_at is null and exists (select 1 from posts p where p.id = post_id and can_see_post(p))
  and not is_blocked_between(author_id, auth.uid()));
drop policy if exists "comments insert" on post_comments;
create policy "comments insert" on post_comments for insert with check (
  author_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and can_see_post(p) and not is_blocked_between(p.author_id, auth.uid()))
  and not exists (select 1 from profiles where id = auth.uid() and banned_at is not null));
drop policy if exists "comments update" on post_comments;
create policy "comments update" on post_comments for update using (
  author_id = auth.uid() or is_admin() or exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

drop policy if exists "tags read" on post_tags;
create policy "tags read" on post_tags for select using (true);

-- ---------- Tetikleyiciler: sayaçlar, etiketler, bahsetmeler, bildirimler ----------
create or replace function posts_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text; u uuid;
begin
  update posts set city_id = (select city_id from profiles where id = new.author_id) where id = new.id;
  for t in select distinct lower(m[1]) from regexp_matches(coalesce(new.body,''), '#([[:alnum:]_çğıöşüÇĞİÖŞÜ]{2,40})', 'g') as m loop
    insert into post_tags(post_id, tag) values (new.id, t) on conflict do nothing;
  end loop;
  for u in select p.id from profiles p
           where p.username in (select distinct lower(m[1]) from regexp_matches(coalesce(new.body,''), '@([a-z0-9_]{3,20})', 'gi') as m)
             and p.id <> new.author_id loop
    insert into notifications(user_id, type, actor_id, data) values (u, 'mention', new.author_id, jsonb_build_object('post_id', new.id));
  end loop;
  return new;
end $$;
drop trigger if exists posts_ai on posts;
create trigger posts_ai after insert on posts for each row execute function posts_after_insert();

create or replace function post_likes_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id returning author_id into v_author;
    if v_author <> new.user_id and not exists (select 1 from notifications where user_id = v_author and actor_id = new.user_id
        and type = 'post_like' and data->>'post_id' = new.post_id::text) then
      insert into notifications(user_id, type, actor_id, data) values (v_author, 'post_like', new.user_id, jsonb_build_object('post_id', new.post_id));
    end if;
  else
    update posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists post_likes_cnt on post_likes;
create trigger post_likes_cnt after insert or delete on post_likes for each row execute function post_likes_count();

create or replace function post_comments_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id returning author_id into v_author;
    if v_author <> new.author_id then
      insert into notifications(user_id, type, actor_id, data) values (v_author, 'comment', new.author_id,
        jsonb_build_object('post_id', new.post_id, 'preview', left(new.body, 80)));
    end if;
  elsif new.deleted_at is not null and old.deleted_at is null then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
  end if;
  return null;
end $$;
drop trigger if exists post_comments_cnt on post_comments;
create trigger post_comments_cnt after insert or update of deleted_at on post_comments for each row execute function post_comments_count();

-- Otomatik "yeni ev/araba aldım" paylaşımı (kullanıcı açarsa)
create or replace function activity_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_kind product_kind; v_name text; v_share boolean;
begin
  select p.kind, p.name into v_kind, v_name from products p where p.id = new.product_id;
  select share_activity into v_share from profiles where id = new.owner_id;
  if v_share and v_kind in ('house','car') then
    insert into posts(author_id, body, product_id, item_id, kind)
    values (new.owner_id, case when v_kind = 'house' then '🏡 Yeni evime taşındım: ' else '🚗 Yeni arabamı aldım: ' end || v_name,
            new.product_id, new.id, 'activity');
  end if;
  return new;
end $$;
drop trigger if exists inventory_activity on inventory_items;
create trigger inventory_activity after insert on inventory_items for each row execute function activity_post();

-- ---------- Hikâyeler (24 saat) ----------
create table if not exists stories (
  id         bigserial primary key,
  author_id  uuid not null references profiles(id) on delete cascade,
  image_url  text,
  text       text check (char_length(text) <= 200),
  bg         text not null default 'crystal',
  created_at timestamptz default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (image_url is not null or coalesce(char_length(text),0) > 0)
);
create index if not exists stories_live_idx on stories(expires_at desc);
create table if not exists story_views (
  story_id  bigint references stories(id) on delete cascade,
  viewer_id uuid references profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  primary key (story_id, viewer_id)
);
alter table stories enable row level security;
alter table story_views enable row level security;
drop policy if exists "stories read" on stories;
create policy "stories read" on stories for select using (
  expires_at > now() and (author_id = auth.uid() or (not is_blocked_between(author_id, auth.uid())
    and exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = author_id))));
drop policy if exists "stories own" on stories;
create policy "stories own" on stories for insert with check (author_id = auth.uid());
drop policy if exists "stories delete" on stories;
create policy "stories delete" on stories for delete using (author_id = auth.uid() or is_admin());
drop policy if exists "story views insert" on story_views;
create policy "story views insert" on story_views for insert with check (viewer_id = auth.uid());
drop policy if exists "story views read" on story_views;
create policy "story views read" on story_views for select using (
  viewer_id = auth.uid() or exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid()));

-- ---------- Keşfet (TikTok "Senin için" benzeri): etkileşim / yaş ----------
create or replace function explore_posts(p_limit int default 30, p_offset int default 0) returns setof posts
language sql stable set search_path = public as $$
  select * from posts
  where deleted_at is null and visibility = 'public' and created_at > now() - interval '14 days'
  order by (like_count * 2 + comment_count * 3 + 1) / power(extract(epoch from now() - created_at) / 3600 + 2, 1.3) desc
  limit p_limit offset p_offset;
$$;

-- ---------- Gündem (X "Trends" benzeri) ----------
create or replace function trending_tags(p_hours int default 48) returns table(tag text, posts bigint)
language sql stable security definer set search_path = public as $$
  select t.tag, count(*) from post_tags t join posts p on p.id = t.post_id
  where t.created_at > now() - make_interval(hours => p_hours) and p.deleted_at is null and p.visibility = 'public'
  group by t.tag order by 2 desc, max(t.created_at) desc limit 10;
$$;

-- ---------- Gönderi görselleri ----------
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true) on conflict (id) do nothing;
drop policy if exists "post images read" on storage.objects;
create policy "post images read" on storage.objects for select using (bucket_id = 'post-images');
drop policy if exists "post images upload" on storage.objects;
create policy "post images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Anlık güncellemeler
do $$ begin alter publication supabase_realtime add table posts; exception when others then null; end $$;
