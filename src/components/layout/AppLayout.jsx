import { Outlet } from 'react-router-dom'

import { useLanguage } from '../../contexts/LanguageContext'
import { LanguageForm } from './LanguageSwitcher'
import { useT } from '../../i18n'
import Header from './Header'

export default function AppLayout() {
  const { active, ready } = useLanguage()
  const t = useT()

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />

      <main className="px-5 py-6 lg:px-8">
        {!ready ? null : active ? (
          // key: đổi ngôn ngữ thì làm mới toàn bộ trang đang mở
          <Outlet key={active.id} />
        ) : (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white">
            <p className="border-b border-slate-200 p-5 text-slate-700">
              {t('Chưa có ngôn ngữ nào. Hãy thêm ngôn ngữ đầu tiên để bắt đầu học.')}
            </p>
            <LanguageForm onClose={() => {}} />
          </div>
        )}
      </main>
    </div>
  )
}
