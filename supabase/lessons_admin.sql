-- =====================================================================
-- Cho admin thêm / sửa / xóa BÀI HỌC ngay trong trang Học.
-- Chạy sau lesson_admin.sql (cần hàm is_admin()).
-- =====================================================================

drop policy if exists "Admin can insert lessons" on lessons;
create policy "Admin can insert lessons"
  on lessons for insert to authenticated with check (is_admin());

drop policy if exists "Admin can update lessons" on lessons;
create policy "Admin can update lessons"
  on lessons for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin can delete lessons" on lessons;
create policy "Admin can delete lessons"
  on lessons for delete to authenticated using (is_admin());

-- Kiểm tra tên cột khóa ngoại của bảng lessons (app đang dùng unit_id):
-- select column_name from information_schema.columns
-- where table_name = 'lessons' order by ordinal_position;
