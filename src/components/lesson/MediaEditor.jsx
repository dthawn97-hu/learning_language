import { useRef, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useT } from '../../i18n'
import { useNotify } from '../ui/Notify'
import { field, label } from './SectionEditor'

const BUCKET = 'lesson-media'
const MAX_MB = 50 // trần của gói Supabase miễn phí

/** Soạn danh sách tài liệu: mỗi dòng gồm tiêu đề + (tải file lên HOẶC dán liên kết). */
export default function MediaEditor({ value, onChange }) {
  const t = useT()
  const { toast } = useNotify()
  const [busy, setBusy] = useState(-1)
  const fileRef = useRef(null)
  const target = useRef(0)

  const setItem = (i, patch) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)))

  async function upload(file) {
    const i = target.current
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      return toast(t('File quá lớn (tối đa {mb} MB). Hãy dán liên kết video.', { mb: MAX_MB }), 'error')
    }

    setBusy(i)
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_')
    const path = `${crypto.randomUUID()}-${safe}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    setBusy(-1)
    if (error) return toast(error.message, 'error')

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    setItem(i, { url: data.publicUrl, title: value[i].title || file.name.replace(/\.[^.]+$/, '') })
    toast(t('Đã tải lên.'))
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        hidden
        accept="image/*,application/pdf,video/*"
        onChange={(e) => {
          upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {value.map((m, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-3">
          <label className={label}>{t('Tiêu đề')}</label>
          <input value={m.title ?? ''} onChange={(e) => setItem(i, { title: e.target.value })} className={field} />

          <label className={`${label} mt-3 block`}>{t('Liên kết (ảnh, PDF, video, YouTube...)')}</label>
          <div className="flex gap-2">
            <input
              value={m.url ?? ''}
              onChange={(e) => setItem(i, { url: e.target.value })}
              placeholder="https://"
              className={`${field} mt-1.5`}
            />
            <button
              type="button"
              disabled={busy === i}
              onClick={() => {
                target.current = i
                fileRef.current?.click()
              }}
              className="mt-1.5 inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <Upload size={15} />
              {busy === i ? t('Đang tải lên...') : t('Tải file lên')}
            </button>
          </div>

          {value.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="mt-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
            >
              <Trash2 size={14} />
              {t('Xóa')}
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, { title: '', url: '' }])}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <Plus size={15} />
        {t('Thêm tài liệu')}
      </button>

      <p className="text-xs text-slate-500">
        {t('Ảnh, PDF hoặc video (tối đa {mb} MB); video nặng hơn hãy dán liên kết YouTube.', { mb: MAX_MB })}
      </p>
    </div>
  )
}
