-- =====================================================================
-- Nội dung bài học theo mục: Từ vựng / Kanji / Ngữ pháp / Hội thoại /
-- Đọc hiểu / Bài tập / Ghi chú.  Chạy toàn bộ file trong SQL Editor.
-- =====================================================================

create table if not exists lesson_sections (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references lessons(id) on delete cascade,
  section_type text not null check (section_type in
                 ('vocabulary','kanji','grammar','dialogue','reading','exercise','note')),
  title        text not null,
  body         text,                          -- mô tả / ghi chú chung của mục
  content      jsonb not null default '[]',   -- dữ liệu theo từng loại (xem mẫu bên dưới)
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_lesson_sections_lesson
  on lesson_sections (lesson_id, sort_order);

-- Ai đã đăng nhập cũng được ĐỌC. Không có policy ghi: nội dung chỉ thêm/sửa
-- bằng SQL Editor / Table Editor (quyền admin), user thường không sửa được.
alter table lesson_sections enable row level security;

drop policy if exists "Authenticated can read lesson sections" on lesson_sections;
create policy "Authenticated can read lesson sections"
  on lesson_sections for select to authenticated using (true);

-- =====================================================================
-- CẤU TRÚC `content` THEO TỪNG LOẠI
--   vocabulary: [{word, reading, meaning, example, example_reading, example_meaning}]
--   kanji     : [{char, onyomi, kunyomi, meaning, strokes, examples:[{word, reading, meaning}]}]
--   grammar   : [{pattern, meaning, explanation, examples:[{text, reading, meaning}]}]
--   dialogue  : [{speaker, text, reading, meaning}]
--   reading   : {passage, reading, translation, questions:[{q, options:[..], answer:<vị trí từ 0>, explain}]}
--   exercise  : [{q, options:[..], answer:<vị trí từ 0>, explain}]
--   note      : chỉ dùng cột body, content để '[]'
-- =====================================================================

-- ---------------- DỮ LIỆU MẪU ----------------
-- Đổi 'ten-slug-bai-hoc' thành slug của một bài học có sẵn rồi chạy.
do $$
declare lid uuid;
begin
  select id into lid from lessons where slug = 'ten-slug-bai-hoc' limit 1;
  if lid is null then
    raise notice 'Không tìm thấy bài học, bỏ qua dữ liệu mẫu.';
    return;
  end if;

  insert into lesson_sections (lesson_id, section_type, title, body, content, sort_order) values
  (lid, 'vocabulary', 'Từ vựng', 'Các từ mới của bài.', '[
    {"word":"わたし","reading":"わたし","meaning":"tôi","example":"わたしは学生です。","example_reading":"わたしはがくせいです。","example_meaning":"Tôi là học sinh."},
    {"word":"先生","reading":"せんせい","meaning":"giáo viên","example":"田中さんは先生です。","example_reading":"たなかさんはせんせいです。","example_meaning":"Anh Tanaka là giáo viên."}
  ]', 1),
  (lid, 'kanji', 'Kanji', null, '[
    {"char":"学","onyomi":"ガク","kunyomi":"まな.ぶ","meaning":"học","strokes":8,
     "examples":[{"word":"学生","reading":"がくせい","meaning":"học sinh"}]}
  ]', 2),
  (lid, 'grammar', 'Ngữ pháp', null, '[
    {"pattern":"N1 は N2 です","meaning":"N1 là N2",
     "explanation":"Dùng để giới thiệu hoặc khẳng định danh tính.\nは đọc là わ khi làm trợ từ.",
     "examples":[{"text":"わたしは学生です。","reading":"わたしはがくせいです。","meaning":"Tôi là học sinh."}]}
  ]', 3),
  (lid, 'dialogue', 'Hội thoại', null, '[
    {"speaker":"A","text":"はじめまして。","reading":"はじめまして。","meaning":"Rất vui được gặp bạn."},
    {"speaker":"B","text":"はじめまして。田中です。","reading":"はじめまして。たなかです。","meaning":"Rất vui được gặp bạn. Tôi là Tanaka."}
  ]', 4),
  (lid, 'reading', 'Đọc hiểu', null, '{
    "passage":"わたしは田中です。学生です。",
    "reading":"わたしはたなかです。がくせいです。",
    "translation":"Tôi là Tanaka. Tôi là học sinh.",
    "questions":[{"q":"田中さんは何ですか。","options":["先生","学生"],"answer":1,"explain":"Đoạn văn nói 学生です。"}]
  }', 5),
  (lid, 'exercise', 'Bài tập', null, '[
    {"q":"「わたし」の意味は？","options":["tôi","bạn","giáo viên"],"answer":0,"explain":"わたし = tôi."}
  ]', 6),
  (lid, 'note', 'Ghi chú', 'Trong tiếng Nhật, chủ ngữ thường được lược bỏ khi đã rõ ngữ cảnh.', '[]', 7);
end $$;
