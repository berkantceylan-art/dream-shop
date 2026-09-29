-- 0005: Admin doğrudan (onaylı) mağaza açabilir ve tüm mağazaları yönetebilir
drop policy if exists "admin stores" on stores;
create policy "admin stores" on stores for all using (is_admin()) with check (is_admin());
