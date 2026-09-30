import { useState } from 'react'
import { Plus } from 'lucide-react'

import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import Drawer from '../ui/Drawer'
import { useNotify } from '../ui/Notify'
import { useT } from '../../i18n'


const field =
  'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900'

export default function LanguageSwitcher() {
  const { languages, active, setActiveId } = useLanguage()
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex shrink-0 items-center gap-1">
      {active && (
        <select
          aria-label={t('Ngôn ngữ đang học')}
          value={active.id}
          onChange={(e) => setActiveId(e.target.value)}
          className="h-9 max-w-[6rem] sm:max-w-[8rem] rounded-lg border border-white/20 bg-[#0b1020] px-2 text-sm text-white outline-none"
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        aria-label={t('Thêm ngôn ngữ')}
        title={t('Thêm ngôn ngữ')}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
      >
        <Plus size={18} />
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title={t('Thêm ngôn ngữ')}>
        <LanguageForm onClose={() => setOpen(false)} />
      </Drawer>
    </div>
  )
}

export function LanguageForm({ language, onClose, onSaved }) {
  const { reload, setActiveId } = useLanguage()
  const { toast } = useNotify()
  const t = useT()
  const [name, setName] = useState(language?.name ?? '')
  const [code, setCode] = useState(language?.code ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const c = code.trim().toLowerCase()

    if (!name.trim() || !c) return toast(t('Nhập tên và mã ngôn ngữ.'), 'error')
    if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(c)) {
      return toast(t('Mã ngôn ngữ dạng ISO, ví dụ: ko, en, zh, fr.'), 'error')
    }

    setSaving(true)
    const values = { name: name.trim(), code: c }
    const q = supabase.from('languages')
    const { data, error } = language
      ? await q.update(values).eq('id', language.id).select('id').single()
      : await q.insert(values).select('id').single()

    if (error) {
      setSaving(false)
      return toast(
        error.code === '23505' ? t('Ngôn ngữ này đã có.') : error.message,
        'error',
      )
    }

    await reload()
    if (!language) setActiveId(data.id)
    toast(language ? t('Đã lưu thay đổi.') : t('Đã thêm ngôn ngữ.'))
    onSaved?.()
    onClose()
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 p-5">
        <div>
          <label className="text-sm font-medium text-slate-700">{t('Tên ngôn ngữ')}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Tiếng Hàn')}
            className={field}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{t('Mã ngôn ngữ')}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ko"
            className={field}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('Mã ISO 639, ví dụ: ja, ko, en, zh, fr.')}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t('Hủy')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? t('Đang lưu...') : language ? t('Lưu') : t('Thêm')}
        </button>
      </div>
    </form>
  )
}
