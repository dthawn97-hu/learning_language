-- =====================================================================
-- Sắp xếp lại thứ tự cấp độ: Bảng chữ cái, N5, N4, N3, N2, N1.
-- Chạy MỘT LẦN để sửa dữ liệu hiện có. Các cấp độ tạo sau trong app
-- tự xếp cuối, muốn đổi vị trí thì dùng mũi tên lên/xuống trong bảng.
-- =====================================================================

update levels
set sort_order = case name
  when 'Bảng chữ cái' then 1
  when 'N5' then 2
  when 'N4' then 3
  when 'N3' then 4
  when 'N2' then 5
  when 'N1' then 6
  else sort_order
end
where course_id = (select id from courses where slug = 'japanese-basics');

-- Xem kết quả
select name, sort_order from levels
where course_id = (select id from courses where slug = 'japanese-basics')
order by sort_order;
