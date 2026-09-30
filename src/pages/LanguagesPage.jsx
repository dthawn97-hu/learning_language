import { useState } from 'react'

import Drawer from '../components/ui/Drawer'
import DataTable, { usePaged } from '../components/ui/DataTable'
import { useNotify } from '../components/ui/Notify'
import {
  AddButton,
  Empty,
  PageTitle,
  RowActions,
} from '../components/ui/tableBits'
import { LanguageForm } from '../components/layout/LanguageSwitcher'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

export default function LanguagesPage() {
  const { reload: reloadContext } = useLanguage()
  const { toast, confirm } = useNotify()
  const t = useT()
  const [drawer, setDrawer] = useState({ open: false, language: null })

  const paged = usePaged('page', (from, to) =>
    supabase
      .from('languages')
      .select('id, code, name, learning_sets(count)', { count: 'exact' })
      .order('name')
      .range(from, to),
  )

  const setCount = (l) => l.learning_sets?.[0]?.count ?? 0
  const open = (language = null) => setDrawer({ open: true, language })
  const close = () => setDrawer((d) => ({ ...d, open: false }))

  async function remove(l) {
    if (setCount(l) > 0) {
      return toast(
        t('"{name}" đang có {n} bộ học. Hãy xóa các bộ học trước.', { name: l.name, n: setCount(l) }),
        'error',
      )
    }
    if (!(await confirm(t('Xóa ngôn ngữ "{name}"?', { name: l.name })))) return

    const { error } = await supabase.from('languages').delete().eq('id', l.id)
    if (error) return toast(error.message, 'error')

    toast(t('Đã xóa ngôn ngữ.'))
    await reloadContext()
    paged.reload()
  }

  const columns = [
    {
      header: t('Ngôn ngữ'),
      cell: (l) => <span className="font-medium text-slate-900">{l.name}</span>,
    },
    { header: t('Mã'), cell: (l) => l.code, className: 'w-28' },
    { header: t('Bộ học'), cell: setCount, className: 'w-28' },
    {
      header: t('Thao tác'),
      className: 'w-32 text-right',
      cell: (l) => (
        <RowActions
          canEdit
          onEdit={() => open(l)}
          onDelete={() => remove(l)}
        />
      ),
    },
  ]

  return (
    <div className="w-full">
      <PageTitle
        label={t('Cài đặt')}
        title={t('Ngôn ngữ')}
        hint={t('Quản lý các ngôn ngữ bạn học trên Kotoba.')}
        action={<AddButton onClick={() => open()}>{t('Thêm ngôn ngữ')}</AddButton>}
      />

      <DataTable
        columns={columns}
        paged={paged}
        empty={
          <Empty
            title={t('Chưa có ngôn ngữ')}
            hint={t('Thêm ngôn ngữ đầu tiên để bắt đầu học.')}
            onAction={() => open()}
            action={t('Thêm ngôn ngữ')}
          />
        }
      />

      <Drawer
        open={drawer.open}
        onClose={close}
        title={drawer.language ? t('Sửa ngôn ngữ') : t('Thêm ngôn ngữ')}
      >
        <LanguageForm
          key={drawer.language?.id ?? 'new'}
          language={drawer.language}
          onClose={close}
          onSaved={paged.reload}
        />
      </Drawer>
    </div>
  )
}
