import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useT, localeOf } from '../i18n'
import { supabase } from '../lib/supabase'
import { moveRow } from '../lib/reorder'
import { useIsAdmin } from '../hooks/useIsAdmin'
import LevelDrawer from '../components/lesson/LevelDrawer'
import DataTable, { usePaged } from '../components/ui/DataTable'
import { useNotify } from '../components/ui/Notify'
import SetDrawer, { SET_TYPES, useSetCrud } from '../components/ui/SetDrawer'
import {
  ActionLink,
  AddButton,
  Empty,
  PageTitle,
  RowActions,
  TitleCell,
} from '../components/ui/tableBits'

const COURSE_SLUG = 'japanese-basics'

export default function LearnPage() {
  const { active } = useLanguage()
  const t = useT()
  const [sp, setSp] = useSearchParams()

  // ponytail: khóa học có sẵn hiện chỉ có cho tiếng Nhật; ngôn ngữ khác thêm khi có dữ liệu
  const hasCourse = active.code === 'ja'
  const tab = hasCourse && sp.get('tab') === 'course' ? 'course' : 'my'

  const tabs = [
    ['my', t('Bộ học của tôi')],
    ...(hasCourse ? [['course', t('Khóa học có sẵn')]] : []),
  ]

  function selectTab(id) {
    setSp({ tab: id }, { replace: true }) // đổi tab -> về trang 1
  }

  return (
    <div className="w-full">
      <PageTitle
        label={active.code === 'ja' ? '日本語' : active.code.toUpperCase()}
        title={t('Học {name}', { name: active.name })}
        hint={hasCourse ? t('Học theo lộ trình có sẵn hoặc tạo bộ học của riêng bạn.') : t('Tạo bộ học của riêng bạn.')}
      />

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              tab === id
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* chỉ tab đang mở mới được dựng -> chỉ chạy truy vấn của tab đó */}
      {tab === 'my' ? <MySets /> : <Course />}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function MySets() {
  const { user } = useAuth()
  const { active, uiLang } = useLanguage()
  const t = useT()

  const paged = usePaged(
    'page',
    (from, to) =>
      supabase
        .from('learning_sets')
        .select('id, title, description, set_type, owner_id, created_at', { count: 'exact' })
        .eq('owner_id', user.id)
        .eq('language_id', active.id)
        .eq('source_type', 'user')
        .order('created_at', { ascending: false })
        .range(from, to),
    [user?.id],
  )

  const crud = useSetCrud(() => paged.reload())

  const columns = [
    {
      header: t('Bộ học'),
      cell: (s) => <TitleCell to={`/learn/${s.id}`} title={s.title} description={s.description} />,
    },
    {
      header: t('Loại'),
      cell: (s) => (SET_TYPES[s.set_type] ? t(SET_TYPES[s.set_type]) : s.set_type),
      className: 'w-32',
    },
    {
      header: t('Ngày tạo'),
      cell: (s) => new Date(s.created_at).toLocaleDateString(localeOf(uiLang)),
      className: 'w-32',
    },
    {
      header: t('Thao tác'),
      className: 'w-52 text-right',
      cell: (s) => (
        <RowActions
          main={<ActionLink to={`/learn/${s.id}`}>{t('Mở')}</ActionLink>}
          canEdit
          onEdit={() => crud.openEdit(s)}
          onDelete={() => crud.remove(s)}
        />
      ),
    },
  ]

  return (
    <section>
      <div className="mb-3 flex justify-end">
        <AddButton onClick={crud.openCreate}>{t('Tạo bộ học')}</AddButton>
      </div>

      <DataTable
        columns={columns}
        paged={paged}
        empty={
          <Empty
            title={t('Chưa có bộ học nào')}
            hint={t('Tạo bộ học đầu tiên và thêm nội dung bạn muốn ghi nhớ.')}
            onAction={crud.openCreate}
            action={t('Tạo bộ học đầu tiên')}
          />
        }
      />

      <SetDrawer {...crud.drawerProps} />
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Course() {
  const t = useT()
  const isAdmin = useIsAdmin()
  const { toast, confirm } = useNotify()
  const [levelDrawer, setLevelDrawer] = useState({ open: false, level: null })

  // danh sách cấp độ (N5, N4, ...) kèm số bài học
  const levels = usePaged(
    'page',
    (from, to) =>
      supabase
        .from('levels')
        .select('id, name, sort_order, courses!inner(slug), units(lessons(count))', { count: 'exact' })
        .eq('courses.slug', COURSE_SLUG)
        .order('sort_order')
        .order('name')
        .range(from, to),
    [],
  )

  const lessonCount = (l) =>
    (l.units ?? []).reduce((sum, u) => sum + (u.lessons?.[0]?.count ?? 0), 0)

  async function removeLevel(l) {
    const n = lessonCount(l)
    if (n) return toast(t('Cấp độ còn {n} bài học. Hãy xóa các bài học trước.', { n }), 'error')
    if (!(await confirm(t('Xóa cấp độ "{name}"?', { name: l.name })))) return

    // cấp độ trống: xóa chương mặc định (nếu có) rồi xóa cấp độ
    const { error: uErr } = await supabase.from('units').delete().eq('level_id', l.id)
    const { error } = uErr ? { error: uErr } : await supabase.from('levels').delete().eq('id', l.id)
    if (error) return toast(error.message, 'error')

    toast(t('Đã xóa cấp độ.'))
    levels.reload()
  }

  async function moveLevel(l, dir) {
    const error = await moveRow('levels', levels.rows, l, dir)
    if (error) return toast(error.message, 'error')
    levels.reload()
  }

  const openCreate = () => setLevelDrawer({ open: true, level: null })

  const columns = [
    {
      header: t('Cấp độ'),
      cell: (l) => <TitleCell to={`/learn/level/${l.id}`} title={l.name} />,
    },
    {
      header: t('Số bài học'),
      cell: (l) => t('{n} bài học', { n: lessonCount(l) }),
      className: 'w-40',
    },
    {
      header: t('Thao tác'),
      className: 'w-64 text-right',
      cell: (l) => (
        <RowActions
          main={<ActionLink to={`/learn/level/${l.id}`}>{t('Mở')}</ActionLink>}
          canEdit={isAdmin}
          onUp={levels.rows[0]?.id !== l.id ? () => moveLevel(l, -1) : undefined}
          onDown={levels.rows.at(-1)?.id !== l.id ? () => moveLevel(l, 1) : undefined}
          onEdit={() => setLevelDrawer({ open: true, level: l })}
          onDelete={() => removeLevel(l)}
        />
      ),
    },
  ]

  return (
    <section>
      {isAdmin && (
        <div className="mb-3 flex justify-end">
          <AddButton onClick={openCreate}>{t('Tạo cấp độ')}</AddButton>
        </div>
      )}

      <DataTable
        columns={columns}
        paged={levels}
        empty={
          <Empty
            title={t('Chưa có khóa học.')}
            hint={isAdmin ? t('Hãy tạo cấp độ đầu tiên.') : t('Nội dung đang được cập nhật.')}
            onAction={isAdmin ? openCreate : undefined}
            action={t('Tạo cấp độ')}
          />
        }
      />

      <LevelDrawer
        open={levelDrawer.open}
        level={levelDrawer.level}
        courseSlug={COURSE_SLUG}
        onClose={() => setLevelDrawer((d) => ({ ...d, open: false }))}
        onSaved={levels.reload}
      />
    </section>
  )
}
