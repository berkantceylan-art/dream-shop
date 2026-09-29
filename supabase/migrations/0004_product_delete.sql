-- 0004: Ürün silme yetkisi (admin veya ürünün mağaza sahibi)
drop policy if exists "product delete" on products;
create policy "product delete" on products for delete using (
  is_admin() or exists (select 1 from stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Ürünle ilgili ilgi kayıtları ürün silinince silinsin (satılmış ürünler silinemez, arşivlenir)
alter table product_events drop constraint if exists product_events_product_id_fkey;
alter table product_events add constraint product_events_product_id_fkey
  foreign key (product_id) references products(id) on delete cascade;
