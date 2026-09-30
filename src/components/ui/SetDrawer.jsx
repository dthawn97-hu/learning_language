import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import Drawer from './Drawer'
import { useT } from '../../i18n'
import { useNotify } from './Notify'

export const SET_TYPES = {
  vocabulary: 'Từ vựng',
  kanji: 'Kanji',
  grammar: 'Ngữ pháp',
  kana: 'Kana',
  mixed: 'Tổng hợp',
}

const field =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900'
const label = 'text-sm font-medium text-slate-700'

// "từ | nghĩa | cách đọc" mỗi dòng một mục (dán từ Excel cũng được, ngăn bằng Tab).
function parseLines(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s*[|\t]\s*/))
}

/**
 * Hook dùng chung cho mọi trang danh sách:
 *   const crud = useSetCrud(paged.reload, { markReview })
 *   <SetDrawer {...crud.drawerProps} />
 *   crud.openCreate() / crud.openEdit(set) / crud.remove(set)
 */
export function useSetCrud(reload, { markReview = false } = {}) {
  const { toast, confirm } = useNotify()
  const t = useT()
  const [drawer, setDrawer] = useState({ open: false, set: null })

  const close = useCallback(
    () => setDrawer((d) => ({ ...d, open: false })),
    [],
  )

  async function remove(set) {
    if (!(await confirm(t('Xóa bộ "{title}" và toàn bộ nội dung?', { title: set.title })))) return

    // xóa nội dung trước để không vướng khóa ngoại
    const { error: itemsErr } = await supabase
      .from('learning_items')
      .delete()
      .eq('learning_set_id', set.id)
    const { error } = itemsErr
      ? { error: itemsErr }
      : await supabase.from('learning_sets').delete().eq('id', set.id)

    if (error) return toast(error.message, 'error')
    toast(t('Đã xóa bộ học.'))
    reload()
  }

  return {
    openCreate: () => setDrawer({ open: true, set: null }),
    openEdit: (set) => setDrawer({ open: true, set }),
    remove,
    drawerProps: {
      open: drawer.open,
      set: drawer.set,
      onClose: close,
      onSaved: reload,
      markReview,
    },
  }
}

export default function SetDrawer({ open, set, onClose, onSaved, markReview }) {
  const t = useT()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={set ? t('Sửa bộ học') : markReview ? t('Thêm vào ôn tập') : t('Tạo bộ học')}
    >
      {/* key: mỗi lần mở là một form mới, không giữ dữ liệu lần trước */}
      <SetForm
        key={set?.id ?? 'new'}
        set={set}
        onClose={onClose}
        onSaved={onSaved}
        markReview={markReview}
      />
    </Drawer>
  )
}

function SetForm({ set, onClose, onSaved, markReview }) {
  const { user } = useAuth()
  const { toast } = useNotify()
  const t = useT()

  const { active } = useLanguage()
  const [title, setTitle] = useState(set?.title ?? '')
  const [description, setDescription] = useState(set?.description ?? '')
  const [setType, setSetType] = useState(set?.set_type ?? 'vocabulary')
  const [lines, setLines] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()

    if (!title.trim()) return toast(t('Vui lòng nhập tên bộ học.'), 'error')

    const rows = parseLines(lines)
    const bad = rows.findIndex((r) => r.length < 2)
    if (bad >= 0) {
      return toast(t('Dòng {n} cần dạng: từ | nghĩa | cách đọc (tùy chọn).', { n: bad + 1 }), 'error')
    }

    setSaving(true)
    try {
      const fields = {
        title: title.trim(),
        description: description.trim() || null,
        set_type: setType,
      }

      let setId = set?.id
      let start = 0

      if (set) {
        const { error } = await supabase
          .from('learning_sets')
          .update(fields)
          .eq('id', set.id)
        if (error) throw error

        if (rows.length) {
          const { count, error: countErr } = await supabase
            .from('learning_items')
            .select('id', { count: 'exact', head: true })
            .eq('learning_set_id', set.id)
          if (countErr) throw countErr
          start = count ?? 0
        }
      } else {
        const { data, error } = await supabase
          .from('learning_sets')
          .insert({
            ...fields,
            language_id: active.id,
            owner_id: user.id,
            source_type: 'user',
            is_public: false,
          })
          .select('id')
          .single()
        if (error) throw error
        setId = data.id
      }

      if (rows.length) {
        const { data: items, error } = await supabase
          .from('learning_items')
          .insert(
            rows.map(([prompt, answer, reading], i) => ({
              learning_set_id: setId,
              item_type: setType === 'mixed' ? 'vocabulary' : setType,
              prompt,
              answer,
              reading: reading || null,
              meaning: answer,
              sort_order: start + i + 1,
            })),
          )
          .select('id')
        if (error) throw error

        // "Thêm vào ôn tập" = đánh dấu các mục mới là Chưa nhớ
        if (markReview) {
          const { error: progErr } = await supabase
            .from('user_item_progress')
            .insert(
              items.map((it) => ({
                user_id: user.id,
                content_type: 'learning_item',
                learning_item_id: it.id,
                mastery_status: 'not_remembered',
                correct_count: 0,
                wrong_count: 0,
                review_count: 0,
              })),
            )
          if (progErr) throw progErr
        }
      }

      toast(set ? t('Đã lưu thay đổi.') : t('Đã tạo bộ học.'))
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast(err.message, 'error')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">

        <div>
          <label className={label}>{t('Tên bộ học')}</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('Ví dụ: Minna no Nihongo - Bài 1')}
            className={field}
          />
        </div>

        <div>
          <div className="col-span-2">
            <label className={label}>{t('Loại nội dung')}</label>
            <select
              value={setType}
              onChange={(e) => setSetType(e.target.value)}
              className={field}
            >
              {Object.entries(SET_TYPES).map(([v, n]) => (
                <option key={v} value={v}>
                  {t(n)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>{t('Mô tả')}</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${field} resize-none`}
          />
        </div>

        <div>
          <label className={label}>
            {set ? t('Thêm nội dung mới') : t('Nội dung')}
          </label>
          <textarea
            rows={14}
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            placeholder={'食べる | ăn | たべる\n水 | nước | みず'}
            className={`${field} font-mono`}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('Mỗi dòng một mục: từ | nghĩa | cách đọc (tùy chọn).')}
            {set && (
              <>
                {' '}{t('Để sửa/xóa từng mục, vào')}{' '}
                <Link to={`/learn/${set.id}`} className="underline">
                  {t('trang chi tiết')}
                </Link>
                .
              </>
            )}
          </p>
        </div>

      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-4">
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
          {saving ? t('Đang lưu...') : t('Lưu')}
        </button>
      </div>
    </form>
  )
}
