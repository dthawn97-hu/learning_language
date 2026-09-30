-- =====================================================================
-- Quản trị nội dung bài học + tiến độ học từng mục.
-- Chạy SAU file lesson_sections.sql.
-- =====================================================================

-- 1) Hàm kiểm tra admin (profiles.role = 'admin')
create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 2) Chặn user tự nâng quyền: chỉ admin (hoặc SQL Editor) mới đổi được cột role.
create or replace function protect_profile_role()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on profiles;
create trigger trg_protect_profile_role
  before update on profiles
  for each row execute function protect_profile_role();

-- 3) Admin được thêm / sửa / xóa các mục bài học
drop policy if exists "Admin can insert lesson sections" on lesson_sections;
create policy "Admin can insert lesson sections"
  on lesson_sections for insert to authenticated with check (is_admin());

drop policy if exists "Admin can update lesson sections" on lesson_sections;
create policy "Admin can update lesson sections"
  on lesson_sections for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin can delete lesson sections" on lesson_sections;
create policy "Admin can delete lesson sections"
  on lesson_sections for delete to authenticated using (is_admin());

-- 4) Tiến độ học từng mục (mỗi user một dòng cho mỗi mục đã học xong)
create table if not exists lesson_section_progress (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section_id   uuid not null references lesson_sections(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, section_id)
);

alter table lesson_section_progress enable row level security;

drop policy if exists "Users read own section progress" on lesson_section_progress;
create policy "Users read own section progress"
  on lesson_section_progress for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users create own section progress" on lesson_section_progress;
create policy "Users create own section progress"
  on lesson_section_progress for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users delete own section progress" on lesson_section_progress;
create policy "Users delete own section progress"
  on lesson_section_progress for delete to authenticated using (user_id = auth.uid());

-- 5) Đặt tài khoản của bạn làm admin (thay email rồi chạy)
-- update profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'ban@example.com');
