import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import DataTable, { usePaged } from '../components/ui/DataTable'
import SetDrawer, { useSetCrud } from '../components/ui/SetDrawer'
import {
  ActionLink,
  AddButton,
  Empty,
  PageTitle,
  RowActions,
  TitleCell,
} from '../components/ui/tableBits'

export default function QuizPage() {
  const { user } = useAuth()
  const { active } = useLanguage()
  const t = useT()

  const paged = usePaged(
    'page',
    (from, to) =>
      supabase
        .from('learning_sets')
        // !inner: chỉ lấy bộ có ít nhất 1 nội dung, và count đếm đúng số bộ đó.
        .select(
          'id, title, description, set_type, owner_id, created_at, learning_items!inner(id)',
          { count: 'exact' },
        )
        .eq('language_id', active.id)
        .order('created_at', { ascending: false })
        .range(from, to),
    [user?.id],
  )

  const crud = useSetCrud(() => paged.reload())

  const columns = [
    {
      header: t('Bộ học'),
      cell: (s) => (
        <TitleCell
          to={`/quiz/${s.id}`}
          title={s.title}
          description={s.description}
        />
      ),
    },
    {
      header: t('Nội dung'),
      cell: (s) => s.learning_items?.length ?? 0,
      className: 'w-28',
    },
    {
      header: t('Thao tác'),
      className: 'w-56 text-right',
      cell: (s) => (
        <RowActions
          main={<ActionLink to={`/quiz/${s.id}`}>{t('Làm bài')}</ActionLink>}
          canEdit={s.owner_id === user.id}
          onEdit={() => crud.openEdit(s)}
          onDelete={() => crud.remove(s)}
        />
      ),
    },
  ]

  return (
    <div className="w-full">
      <PageTitle
        label={t('Kiểm tra')}
        title={t('Chọn bộ học')}
        hint={t('Kiểm tra kiến thức từ những nội dung bạn đã học.')}
        action={<AddButton onClick={crud.openCreate}>{t('Tạo bộ kiểm tra')}</AddButton>}
      />

      <DataTable
        columns={columns}
        paged={paged}
        empty={
          <Empty
            title={t('Chưa có nội dung để kiểm tra')}
            hint={t('Tạo một bộ kiểm tra và nhập nội dung để bắt đầu.')}
            onAction={crud.openCreate}
            action={t('Tạo bộ kiểm tra')}
          />
        }
      />

      <SetDrawer {...crud.drawerProps} />
    </div>
  )
}
