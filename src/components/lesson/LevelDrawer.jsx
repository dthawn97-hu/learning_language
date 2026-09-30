import { useState } from 'react'

import { makeSlug } from '../../lib/slug'
import { supabase } from '../../lib/supabase'
import { useT } from '../../i18n'
import Drawer from '../ui/Drawer'
import { useNotify } from '../ui/Notify'
import { field, label } from './SectionEditor'

// Tạo / sửa Cấp độ (N5, N4, ...) của khóa học có sẵn.
export default function LevelDrawer({ open, onClose, level, courseSlug, onSaved }) {
  const t = useT()

  return (
    <Drawer open={open} onClose={onClose} title={level ? t('Sửa cấp độ') : t('Tạo cấp độ')}>
      <Form key={level?.id ?? 'new'} level={level} courseSlug={courseSlug} onClose={onClose} onSaved={onSaved} />
    </Drawer>
  )
}

function Form({ level, courseSlug, onClose, onSaved }) {
  const t = useT()
  const { toast } = useNotify()
  const [name, setName] = useState(level?.name ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return toast(t('Vui lòng nhập tên cấp độ.'), 'error')

    setSaving(true)
    try {
      if (level) {
        const { error } = await supabase
          .from('levels')
          .update({ name: name.trim() })
          .eq('id', level.id)
        if (error) throw error
      } else {
        const { data: course, error: cErr } = await supabase
          .from('courses')
          .select('id')
          .eq('slug', courseSlug)
          .single()
        if (cErr) throw cErr

        // luôn xếp cuối; đổi vị trí bằng mũi tên trong bảng
        const { data: last } = await supabase
          .from('levels')
          .select('sort_order')
          .eq('course_id', course.id)
          .order('sort_order', { ascending: false })
          .limit(1)
        const sortOrder = (last?.[0]?.sort_order ?? 0) + 1

        const { error } = await supabase.from('levels').insert({
          course_id: course.id,
          name: name.trim(),
          slug: makeSlug(name),
          sort_order: sortOrder,
        })
        if (error) throw error
      }

      toast(level ? t('Đã lưu thay đổi.') : t('Đã tạo cấp độ.'))
      onSaved()
      onClose()
    } catch (err) {
      toast(err.message, 'error')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 p-5">
        <div>
          <label className={label}>{t('Tên cấp độ')}</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="N5" className={field} />
        </div>
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
