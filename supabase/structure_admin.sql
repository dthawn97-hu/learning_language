-- =====================================================================
-- Cho admin thêm / sửa / xóa CẤP ĐỘ (levels) và CHƯƠNG (units).
-- Chạy sau lesson_admin.sql (cần hàm is_admin()).
-- Nếu gặp "deadlock detected": đóng app / các tab đang mở rồi chạy lại,
-- hoặc chạy riêng từng phần (A rồi B).
-- App giả định các cột:
--   levels: id, course_id, name, slug, sort_order
--   units : id, level_id, title, slug, description, sort_order
-- Kiểm tra:  select table_name, column_name from information_schema.columns
--            where table_name in ('levels','units') order by 1, ordinal_position;
-- =====================================================================

-- ---------- A. levels ----------
drop policy if exists "Admin can insert levels" on levels;
create policy "Admin can insert levels"
  on levels for insert to authenticated with check (is_admin());

drop policy if exists "Admin can update levels" on levels;
create policy "Admin can update levels"
  on levels for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin can delete levels" on levels;
create policy "Admin can delete levels"
  on levels for delete to authenticated using (is_admin());

-- ---------- B. units ----------
drop policy if exists "Admin can insert units" on units;
create policy "Admin can insert units"
  on units for insert to authenticated with check (is_admin());

drop policy if exists "Admin can update units" on units;
create policy "Admin can update units"
  on units for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin can delete units" on units;
create policy "Admin can delete units"
  on units for delete to authenticated using (is_admin());
