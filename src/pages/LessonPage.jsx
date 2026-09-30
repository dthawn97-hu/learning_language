import { useToastState, useNotify } from '../components/ui/Notify'
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import SectionDrawer from '../components/lesson/SectionDrawer'
import { SAVEABLE, SECTION_TYPES, SectionView } from '../components/lesson/Sections'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

const outlineBtn =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50'

export default function LessonPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { active } = useLanguage()
  const { toast, confirm } = useNotify()
  const isAdmin = useIsAdmin()
  const t = useT()
  const [sp, setSp] = useSearchParams()

  const [lesson, setLesson] = useState(null)
  const [sections, setSections] = useState([])
  const [done, setDone] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drawer, setDrawer] = useState({ open: false, section: null })
  const [error, setError] = useToastState('error')

  const load = useCallback(async () => {
    const [lessonRes, sectionRes] = await Promise.all([
      supabase
        .from('lessons')
        .select('id, title, slug, description, estimated_minutes, sort_order, units(level_id)')
        .eq('id', id)
        .single(),
      supabase
        .from('lesson_sections')
        .select('id, section_type, title, body, content, sort_order')
        .eq('lesson_id', id)
        .order('sort_order'),
    ])

    if (lessonRes.error) {
      console.error(lessonRes.error)
      setError(lessonRes.error.message)
      setLoading(false)
      return
    }

    // Bảng lesson_sections chưa tạo hoặc lỗi -> vẫn xem được bài học, chỉ chưa có mục.
    if (sectionRes.error) console.error(sectionRes.error)
    const list = sectionRes.data ?? []

    // Mục nào user đã đánh dấu học xong (bảng có thể chưa tạo -> bỏ qua lỗi).
    let doneIds = []
    if (list.length) {
      const { data } = await supabase
        .from('lesson_section_progress')
        .select('section_id')
        .eq('user_id', user.id)
        .in('section_id', list.map((s) => s.id))
      doneIds = (data ?? []).map((r) => r.section_id)
    }

    setLesson(lessonRes.data)
    setSections(list)
    setDone(new Set(doneIds))
    setLoading(false)
  }, [id, user.id, setError])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  const current =
    sections.find((s) => s.id === sp.get('s')) ?? sections[0] ?? null
  const isDone = current && done.has(current.id)

  async function toggleDone() {
    const q = supabase.from('lesson_section_progress')
    const { error: err } = isDone
      ? await q.delete().eq('user_id', user.id).eq('section_id', current.id)
      : await q.insert({ user_id: user.id, section_id: current.id })
    if (err) return toast(err.message, 'error')

    setDone((prev) => {
      const next = new Set(prev)
      isDone ? next.delete(current.id) : next.add(current.id)
      return next
    })
  }

  async function removeSection() {
    if (!(await confirm(t('Xóa mục "{title}"?', { title: current.title })))) return
    const { error: err } = await supabase.from('lesson_sections').delete().eq('id', current.id)
    if (err) return toast(err.message, 'error')
    toast(t('Đã xóa mục bài học.'))
    load()
  }

  // Chuyển mục Từ vựng / Kanji thành bộ học của user để dùng Flashcards, Kiểm tra, Ôn tập.
  async function saveToMySets(section) {
    const list = Array.isArray(section.content) ? section.content : []
    if (!list.length) return

    setSaving(true)
    try {
      const { data: set, error: setErr } = await supabase
        .from('learning_sets')
        .insert({
          language_id: active.id,
          owner_id: user.id,
          title: `${lesson.title} · ${section.title}`,
          description: lesson.description || null,
          set_type: section.section_type,
          source_type: 'user',
          is_public: false,
        })
        .select('id')
        .single()
      if (setErr) throw setErr

      const rows = list.map((it, i) => ({
        ...(section.section_type === 'kanji'
          ? {
              prompt: it.char,
              answer: it.meaning,
              meaning: it.meaning,
              reading: [it.onyomi, it.kunyomi].filter(Boolean).join(' / ') || null,
            }
          : {
              prompt: it.word,
              answer: it.meaning,
              meaning: it.meaning,
              reading: it.reading || null,
              example: it.example || null,
              example_reading: it.example_reading || null,
              example_meaning: it.example_meaning || null,
            }),
        learning_set_id: set.id,
        item_type: section.section_type,
        sort_order: i + 1,
      }))

      const { error: itemsErr } = await supabase.from('learning_items').insert(rows)
      if (itemsErr) throw itemsErr

      toast(t('Đã thêm {n} mục vào bộ học của tôi.', { n: rows.length }))
    } catch (err) {
      console.error(err)
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">{t('Đang tải bài học...')}</p>
      </div>
    )
  }

  const back = (
    <Link
      to={lesson?.units?.level_id ? `/learn/level/${lesson.units.level_id}` : "/learn?tab=course"}
      className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
    >
      <ArrowLeft size={17} />
      {t('Quay lại lộ trình')}
    </Link>
  )

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-6">{back}</div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">{error}</div>
      </div>
    )
  }

  const addButton = isAdmin && (
    <button type="button" onClick={() => setDrawer({ open: true, section: null })} className={outlineBtn}>
      <Plus size={15} />
      {t('Thêm mục')}
    </button>
  )

  return (
    <div className="w-full">
      {back}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{t('Bài học')}</p>
          <h1 className="mt-1 text-3xl text-slate-900">{lesson.title}</h1>
          {lesson.description && <p className="mt-2 text-slate-600">{lesson.description}</p>}
          <p className="mt-2 text-sm text-slate-400">
            {lesson.estimated_minutes && <>{t('Khoảng {n} phút', { n: lesson.estimated_minutes })}</>}
            {lesson.estimated_minutes && sections.length > 0 && ' · '}
            {sections.length > 0 && t('Đã học {done}/{total} mục', { done: done.size, total: sections.length })}
          </p>
        </div>
        {sections.length === 0 && addButton}
      </div>

      {sections.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">{t('Bài học này chưa có nội dung.')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('Nội dung đang được cập nhật.')}</p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
            <div className="flex flex-wrap gap-1">
              {sections.map((s) => {
                const Icon = SECTION_TYPES[s.section_type]?.icon
                const on = s.id === current.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSp((p) => {
                        const n = new URLSearchParams(p)
                        n.set('s', s.id)
                        return n
                      }, { replace: true })
                    }
                    className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${
                      on
                        ? 'border-slate-900 font-medium text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {Icon && <Icon size={16} />}
                    {s.title}
                    {done.has(s.id) && <Check size={14} className="text-emerald-600" />}
                  </button>
                )
              })}
            </div>
            <div className="pb-1">{addButton}</div>
          </div>

          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                {t(SECTION_TYPES[current.section_type]?.label ?? 'Ghi chú')}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {SAVEABLE.includes(current.section_type) && (
                  <button type="button" disabled={saving} onClick={() => saveToMySets(current)} className={outlineBtn}>
                    <Plus size={15} />
                    {t('Thêm vào bộ học của tôi')}
                  </button>
                )}

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      aria-label={t('Sửa')}
                      title={t('Sửa')}
                      onClick={() => setDrawer({ open: true, section: current })}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={t('Xóa')}
                      title={t('Xóa')}
                      onClick={removeSection}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <SectionView key={current.id} section={current} />

            <div className="mt-8 flex justify-end border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={toggleDone}
                className={
                  isDone
                    ? 'inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100'
                    : 'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700'
                }
              >
                <Check size={16} />
                {isDone ? t('Đã học xong') : t('Đánh dấu đã học')}
              </button>
            </div>
          </div>
        </>
      )}

      <SectionDrawer
        open={drawer.open}
        section={drawer.section}
        lessonId={lesson.id}
        nextOrder={(sections.at(-1)?.sort_order ?? 0) + 1}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </div>
  )
}
