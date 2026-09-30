import { useNotify } from '../components/ui/Notify'
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

export default function ReviewPage() {
  const { user } = useAuth()
  const { active } = useLanguage()
  const t = useT()

  const paged = usePaged(
    'page',
    async (from, to) => {
      // Bước 1: id các nội dung user đánh dấu "Chưa nhớ".
      const { data: progress, error } = await supabase
        .from('user_item_progress')
        .select('learning_item_id')
        .eq('user_id', user.id)
        .eq('content_type', 'learning_item')
        .eq('mastery_status', 'not_remembered')

      if (error) return { error }

      const ids = [
        ...new Set(progress.map((r) => r.learning_item_id).filter(Boolean)),
      ]
      if (ids.length === 0) return { data: [], count: 0 }

      // Bước 2: phân trang các bộ học chứa những nội dung đó.
      // ponytail: id đưa vào URL nên tối đa vài trăm mục "Chưa nhớ"; nhiều hơn thì làm view/RPC ở Supabase.
      return supabase
        .from('learning_sets')
        .select('id, title, description, set_type, owner_id, learning_items!inner(id)', {
          count: 'exact',
        })
        .in('learning_items.id', ids)
        .eq('language_id', active.id)
        .order('title')
        .range(from, to)
    },
    [user?.id],
  )

  const { toast, confirm } = useNotify()
  // markReview: bộ tạo ở trang này tự vào danh sách ôn tập
  const crud = useSetCrud(() => paged.reload(), { markReview: true })

  // "Xóa" ở đây = bỏ khỏi ôn tập (xóa đánh dấu Chưa nhớ), không xóa bộ học.
  async function removeFromReview(s) {
    if (!(await confirm(t('Bỏ "{title}" khỏi danh sách ôn tập?', { title: s.title })))) return

    const { error } = await supabase
      .from('user_item_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('content_type', 'learning_item')
      .eq('mastery_status', 'not_remembered')
      .in('learning_item_id', s.learning_items.map((i) => i.id))

    if (error) return toast(error.message, 'error')
    toast(t('Đã bỏ khỏi ôn tập.'))
    paged.reload()
  }

  const columns = [
    {
      header: t('Bộ học'),
      cell: (s) => (
        <TitleCell
          to={`/review/${s.id}`}
          title={s.title}
          description={s.description}
        />
      ),
    },
    {
      header: t('Chưa nhớ'),
      cell: (s) => s.learning_items?.length ?? 0,
      className: 'w-28',
    },
    {
      header: t('Thao tác'),
      className: 'w-56 text-right',
      cell: (s) => (
        <RowActions
          main={<ActionLink to={`/review/${s.id}`}>{t('Ôn tập')}</ActionLink>}
          canEdit
          onEdit={() => crud.openEdit(s)}
          onDelete={() => removeFromReview(s)}
          deleteLabel={t('Bỏ khỏi ôn tập')}
        />
      ),
    },
  ]

  return (
    <div className="w-full">
      <PageTitle
        label={t('Ôn tập')}
        title={t('Nội dung cần ôn')}
        hint={t('Ôn lại những nội dung bạn đã đánh dấu Chưa nhớ.')}
        action={<AddButton onClick={crud.openCreate}>{t('Thêm nội dung ôn')}</AddButton>}
      />

      <DataTable
        columns={columns}
        paged={paged}
        empty={
          <Empty
            title={t('Không có nội dung cần ôn')}
            hint={t('Những flashcard bạn chọn Chưa nhớ sẽ xuất hiện tại đây, hoặc tự thêm nội dung cần ôn.')}
            onAction={crud.openCreate}
            action={t('Thêm nội dung ôn')}
          />
        }
      />

      <SetDrawer {...crud.drawerProps} />
    </div>
  )
}
