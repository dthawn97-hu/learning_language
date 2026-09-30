import { useState } from 'react'

import { supabase } from '../../lib/supabase'
import { useT } from '../../i18n'
import Drawer from '../ui/Drawer'
import { useNotify } from '../ui/Notify'
import SectionEditor, { buildSection, initSection } from './SectionEditor'

// Thêm / sửa MỘT mục của bài học đã có.
export default function SectionDrawer({ open, onClose, section, lessonId, nextOrder, onSaved }) {
  const t = useT()

  return (
    <Drawer open={open} onClose={onClose} title={section ? t('Sửa mục bài học') : t('Thêm mục bài học')}>
      <Form
        key={section?.id ?? lessonId ?? 'new'}
        section={section}
        lessonId={lessonId}
        nextOrder={nextOrder}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Drawer>
  )
}

function Form({ section, lessonId, nextOrder, onClose, onSaved }) {
  const t = useT()
  const { toast } = useNotify()
  const [state, setState] = useState(() => initSection(section, nextOrder ?? ''))
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const built = buildSection(state, t)

      // sửa: giữ nguyên vị trí; thêm mới: xếp cuối bài học
      let sortOrder = section?.sort_order
      if (sortOrder == null) {
        const { data: last } = await supabase
          .from('lesson_sections')
          .select('sort_order')
          .eq('lesson_id', lessonId)
          .order('sort_order', { ascending: false })
          .limit(1)
        sortOrder = (last?.[0]?.sort_order ?? 0) + 1
      }

      const values = { ...built, lesson_id: lessonId, sort_order: sortOrder }
      const q = supabase.from('lesson_sections')
      const { error } = section ? await q.update(values).eq('id', section.id) : await q.insert(values)
      if (error) throw error

      toast(section ? t('Đã lưu thay đổi.') : t('Đã thêm mục bài học.'))
      onSaved()
      onClose()
    } catch (err) {
      toast(err.message, 'error')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <SectionEditor value={state} onChange={setState} />
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
