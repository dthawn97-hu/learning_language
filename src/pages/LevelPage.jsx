import { useEffect, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import DataTable, { usePaged } from '../components/ui/DataTable'
import { useNotify } from '../components/ui/Notify'
import { ActionLink, AddButton, Empty, PageTitle, RowActions } from '../components/ui/tableBits'
import LessonDrawer from '../components/lesson/LessonDrawer'
import SectionDrawer from '../components/lesson/SectionDrawer'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { moveRow } from '../lib/reorder'

// Một cấp độ (N5, N4, ...): danh sách bài học có phân trang; admin tạo từng bài tại đây.
export default function LevelPage() {
  const { levelId } = useParams()
  const t = useT()
  const isAdmin = useIsAdmin()
  const { toast, confirm } = useNotify()

  const [level, setLevel] = useState(null)
  const [lessonDrawer, setLessonDrawer] = useState({ open: false, lesson: null })
  const [sectionDrawer, setSectionDrawer] = useState({ open: false, lessonId: null })

  useEffect(() => {
    supabase
      .from('levels')
      .select('id, name')
      .eq('id', levelId)
      .single()
      .then(({ data, error }) => (error ? toast(error.message, 'error') : setLevel(data)))
  }, [levelId, toast])

  const paged = usePaged(
    'page',
    (from, to) =>
      supabase
        .from('lessons')
        .select('id, title, description, estimated_minutes, sort_order, units!inner(level_id)', { count: 'exact' })
        .eq('units.level_id', levelId)
        .order('sort_order')
        .order('title')
        .range(from, to),
    [levelId],
    20,
  )

  async function remove(l) {
    if (!(await confirm(t('Xóa bài học "{title}" và toàn bộ nội dung?', { title: l.title })))) return
    const { error } = await supabase.from('lessons').delete().eq('id', l.id)
    if (error) return toast(error.message, 'error')
    toast(t('Đã xóa bài học.'))
    paged.reload()
  }

  async function move(l, dir) {
    const error = await moveRow('lessons', paged.rows, l, dir)
    if (error) return toast(error.message, 'error')
    paged.reload()
  }

  const openCreate = () => setLessonDrawer({ open: true, lesson: null })

  const columns = [
    { header: '#', cell: (l) => paged.rows.findIndex((x) => x.id === l.id) + 1 + (paged.page - 1) * paged.pageSize, className: 'w-16' },
    {
      header: t('Bài học'),
      cell: (l) => (
        <div className="min-w-0">
          <Link to={`/lesson/${l.id}`} className="font-medium text-slate-900 hover:underline">
            {l.title}
          </Link>
          {l.description && <p className="mt-0.5 line-clamp-1 text-slate-500">{l.description}</p>}
        </div>
      ),
    },
    {
      header: t('Thời lượng'),
      cell: (l) => (l.estimated_minutes ? t('Khoảng {n} phút', { n: l.estimated_minutes }) : '—'),
      className: 'w-40',
    },
    {
      header: t('Thao tác'),
      className: 'w-80 text-right',
      cell: (l) => (
        <RowActions
          main={
            <>
              <ActionLink to={`/lesson/${l.id}`}>{t('Mở')}</ActionLink>
              {isAdmin && (
                <button
                  type="button"
                  title={t('Thêm mục')}
                  aria-label={t('Thêm mục')}
                  onClick={() => setSectionDrawer({ open: true, lessonId: l.id })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <Plus size={16} />
                </button>
              )}
            </>
          }
          canEdit={isAdmin}
          onUp={paged.rows[0]?.id !== l.id ? () => move(l, -1) : undefined}
          onDown={paged.rows.at(-1)?.id !== l.id ? () => move(l, 1) : undefined}
          onEdit={() => setLessonDrawer({ open: true, lesson: l })}
          onDelete={() => remove(l)}
        />
      ),
    },
  ]

  return (
    <div className="w-full">
      <Link to="/learn?tab=course" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft size={17} />
        {t('Quay lại khóa học')}
      </Link>

      <PageTitle
        label={t('Cấp độ')}
        title={level?.name ?? '…'}
        hint={paged.loading ? '' : t('{n} bài học', { n: paged.total })}
        action={isAdmin && <AddButton onClick={openCreate}>{t('Tạo bài học')}</AddButton>}
      />

      <DataTable
        columns={columns}
        paged={paged}
        empty={
          <Empty
            title={t('Chưa có bài học trong cấp độ này.')}
            hint={isAdmin ? t('Hãy tạo bài học đầu tiên.') : t('Nội dung đang được cập nhật.')}
            onAction={isAdmin ? openCreate : undefined}
            action={t('Tạo bài học')}
          />
        }
      />

      {level && (
        <LessonDrawer
          open={lessonDrawer.open}
          lesson={lessonDrawer.lesson}
          level={level}
          onClose={() => setLessonDrawer((d) => ({ ...d, open: false }))}
          onSaved={paged.reload}
        />
      )}

      <SectionDrawer
        open={sectionDrawer.open}
        lessonId={sectionDrawer.lessonId}
        onClose={() => setSectionDrawer((d) => ({ ...d, open: false }))}
        onSaved={() => toast(t('Đã thêm mục bài học.'))}
      />
    </div>
  )
}
