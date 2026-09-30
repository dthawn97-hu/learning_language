import { useState } from 'react'
import { Plus } from 'lucide-react'

import { makeSlug } from '../../lib/slug'
import { supabase } from '../../lib/supabase'
import { useT } from '../../i18n'
import Drawer from '../ui/Drawer'
import { useNotify } from '../ui/Notify'
import SectionEditor, { buildSection, field, initSection, label } from './SectionEditor'

// Bài học nằm trong "chương" (units) trong DB, nhưng giao diện chỉ có Cấp độ -> Bài học.
// Mỗi cấp độ dùng một chương mặc định, tự tạo khi thêm bài đầu tiên.
async function ensureUnit(levelId, levelName) {
  const { data } = await supabase
    .from('units')
    .select('id')
    .eq('level_id', levelId)
    .order('sort_order')
    .limit(1)
  if (data?.[0]) return data[0].id

  const { data: created, error } = await supabase
    .from('units')
    .insert({ level_id: levelId, title: levelName, slug: makeSlug(levelName), sort_order: 1 })
    .select('id')
    .single()
  if (error) throw error
  return created.id
}

/**
 * Tạo / sửa một bài học của cấp độ.
 * lesson != null -> chỉ sửa thông tin bài (mục nội dung sửa riêng trong trang bài học).
 */
export default function LessonDrawer({ open, onClose, lesson, level, onSaved }) {
  const t = useT()

  return (
    <Drawer open={open} onClose={onClose} title={lesson ? t('Sửa bài học') : t('Tạo bài học')}>
      <Form key={lesson?.id ?? 'new'} lesson={lesson} level={level} onClose={onClose} onSaved={onSaved} />
    </Drawer>
  )
}

function Form({ lesson, level, onClose, onSaved }) {
  const t = useT()
  const { toast } = useNotify()

  const [title, setTitle] = useState(lesson?.title ?? '')
  const [description, setDescription] = useState(lesson?.description ?? '')
  const [minutes, setMinutes] = useState(lesson?.estimated_minutes ?? '')
  const [sections, setSections] = useState(() => (lesson ? [] : [initSection(null)]))
  const [saving, setSaving] = useState(false)

  const setSection = (i, v) => setSections((list) => list.map((s, j) => (j === i ? v : s)))

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return toast(t('Vui lòng nhập tên bài học.'), 'error')

    setSaving(true)
    try {
      // kiểm tra nội dung các mục trước khi ghi bất cứ thứ gì
      const built = sections.map((s) => buildSection(s, t))

      const values = {
        title: title.trim(),
        description: description.trim() || null,
        estimated_minutes: Number(minutes) || null,
      }

      if (lesson) {
        const { error } = await supabase
          .from('lessons')
          .update(values)
          .eq('id', lesson.id)
        if (error) throw error
      } else {
        // luôn xếp cuối cấp độ; đổi vị trí bằng mũi tên trong bảng
        const { data: last } = await supabase
          .from('lessons')
          .select('sort_order, units!inner(level_id)')
          .eq('units.level_id', level.id)
          .order('sort_order', { ascending: false })
          .limit(1)
        const sortOrder = (last?.[0]?.sort_order ?? 0) + 1

        const unitId = await ensureUnit(level.id, level.name)

        const { data: created, error } = await supabase
          .from('lessons')
          .insert({ ...values, unit_id: unitId, sort_order: sortOrder, slug: makeSlug(values.title) })
          .select('id')
          .single()
        if (error) throw error

        if (built.length) {
          const { error: secErr } = await supabase
            .from('lesson_sections')
            .insert(built.map((b, i) => ({ ...b, lesson_id: created.id, sort_order: i + 1 })))
          if (secErr) throw secErr
        }
      }

      toast(lesson ? t('Đã lưu thay đổi.') : t('Đã thêm bài học.'))
      onSaved()
      onClose()
    } catch (err) {
      toast(err.message, 'error')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <label className={label}>{t('Tên bài học')}</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>{t('Mô tả')}</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} resize-none`} />
        </div>
        <div>
          <label className={label}>{t('Thời lượng (phút)')}</label>
          <input type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={field} />
        </div>

        {!lesson && (
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-800">{t('Nội dung bài học')}</p>

            {sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <SectionEditor
                  value={s}
                  onChange={(v) => setSection(i, v)}
                  onRemove={sections.length > 1 ? () => setSections((l) => l.filter((_, j) => j !== i)) : undefined}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSections((l) => [...l, initSection(null)])}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus size={15} />
              {t('Thêm mục')}
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          {t('Hủy')}
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? t('Đang lưu...') : t('Lưu')}
        </button>
      </div>
    </form>
  )
}
