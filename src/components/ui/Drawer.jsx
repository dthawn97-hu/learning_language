import { useEffect } from 'react'
import { X } from 'lucide-react'

import { useT } from '../../i18n'

export default function Drawer({ open, onClose, title, children }) {
  const t = useT()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <h2 className="text-lg text-slate-900">{title}</h2>
          <button
            type="button"
            aria-label={t('Đóng')}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </aside>
    </div>
  )
}
