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

export default function FlashcardsPage() {
  const { user } = useAuth()
  const { active } = useLanguage()
  const t = useT()

  const paged = usePaged(
    'page',
    (from, to) =>
      supabase
        .from('learning_sets')
        .select(
          'id, title, description, set_type, owner_id, created_at, learning_items(count)',
          { count: 'exact' },
        )
        .eq('owner_id', user.id)
        .eq('language_id', active.id)
        .eq('source_type', 'user')
        .order('created_at', { ascending: false })
        .range(from, to),
    [user?.id],
  )

  const crud = useSetCrud(() => paged.reload())

  const count = (set) => set.learning_items?.[0]?.count ?? 0

  const columns = [
    {
      header: t('Bộ học'),
      cell: (s) => (
        <TitleCell
          to={count(s) > 0 ? `/flashcards/${s.id}` : `/learn/${s.id}`}
          title={s.title}
          description={s.description}
        />
      ),
    },
    { header: t('Nội dung'), cell: count, className: 'w-28' },
    {
      header: t('Thao tác'),
      className: 'w-56 text-right',
      cell: (s) => (
        <RowActions
          main={
            count(s) > 0 ? (
              <ActionLink to={`/flashcards/${s.id}`}>{t('Học ngay')}</ActionLink>
            ) : (
              <ActionLink to={`/learn/${s.id}`}>{t('Thêm nội dung')}</ActionLink>
            )
          }
          canEdit
          onEdit={() => crud.openEdit(s)}
          onDelete={() => crud.remove(s)}
        />
      ),
    },
  ]

  return (
    <div className="w-full">
      <PageTitle
        label="Flashcards"
        title={t('Chọn bộ học')}
        hint={t('Chọn một bộ nội dung để bắt đầu ôn bằng flashcard.')}
        action={<AddButton onClick={crud.openCreate}>{t('Tạo flashcard')}</AddButton>}
      />

      <DataTable
        columns={columns}
        paged={paged}
        empty={
          <Empty
            title={t('Chưa có bộ học')}
            hint={t('Tạo bộ học và thêm nội dung trước khi sử dụng Flashcards.')}
            onAction={crud.openCreate}
            action={t('Tạo flashcard')}
          />
        }
      />

      <SetDrawer {...crud.drawerProps} />
    </div>
  )
}
