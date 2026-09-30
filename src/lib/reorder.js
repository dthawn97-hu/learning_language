import { supabase } from './supabase'

// Đổi chỗ một dòng với dòng kề nó (dir = -1 lên, +1 xuống) bằng cách hoán đổi sort_order.
// rows: danh sách đang hiển thị theo đúng thứ tự. Trả về error (nếu có).
export async function moveRow(table, rows, row, dir) {
  const i = rows.findIndex((r) => r.id === row.id)
  const other = rows[i + dir]
  if (!other) return null

  const mine = row.sort_order ?? 0
  const theirs = other.sort_order ?? 0

  // hai dòng trùng thứ tự: chỉ cần dịch dòng này qua một bậc
  if (mine === theirs) {
    const { error } = await supabase.from(table).update({ sort_order: mine + dir }).eq('id', row.id)
    return error
  }

  const a = await supabase.from(table).update({ sort_order: theirs }).eq('id', row.id)
  if (a.error) return a.error
  const b = await supabase.from(table).update({ sort_order: mine }).eq('id', other.id)
  return b.error
}
