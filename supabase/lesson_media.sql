-- =====================================================================
-- Đính kèm ảnh / PDF / video vào bài học.
-- Chạy sau lesson_admin.sql (cần hàm is_admin()).
-- =====================================================================

-- 1) Cho phép loại mục mới "media" (Tài liệu)
alter table lesson_sections drop constraint if exists lesson_sections_section_type_check;
alter table lesson_sections add constraint lesson_sections_section_type_check
  check (section_type in
    ('vocabulary','kanji','grammar','dialogue','reading','exercise','note','media'));

-- 2) Kho lưu file. public = ai cũng xem được file qua đường dẫn (ảnh/PDF/video hiển thị trong bài học).
--    Giới hạn 50 MB / file (trần của gói Supabase miễn phí). Video nặng hơn hãy dán link YouTube.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-media', 'lesson-media', true, 52428800)
on conflict (id) do update
  set public = true, file_size_limit = 52428800;

-- 3) Chỉ admin được tải lên / thay / xóa file
drop policy if exists "Admin can upload lesson media" on storage.objects;
create policy "Admin can upload lesson media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-media' and is_admin());

drop policy if exists "Admin can update lesson media" on storage.objects;
create policy "Admin can update lesson media"
  on storage.objects for update to authenticated
  using (bucket_id = 'lesson-media' and is_admin());

drop policy if exists "Admin can delete lesson media" on storage.objects;
create policy "Admin can delete lesson media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-media' and is_admin());
