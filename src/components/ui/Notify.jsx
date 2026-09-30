import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'

import { useT } from '../../i18n'

const NotifyContext = createContext(null)

const STYLE = {
  error: ['bg-red-600', CircleAlert],
  success: ['bg-emerald-600', CheckCircle2],
}

export function NotifyProvider({ children }) {
  const t = useT()
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const nextId = useRef(0)

  const dismiss = useCallback(
    (id) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  )

  const toast = useCallback(
    (message, type = 'success') => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-3), { id, message, type }])
      setTimeout(() => dismiss(id), type === 'error' ? 5000 : 2500)
    },
    [dismiss],
  )

  // ponytail: một dialog tại một thời điểm; mở cái thứ hai sẽ huỷ cái đầu.
  const confirm = useCallback(
    (message) =>
      new Promise((resolve) => setDialog({ message, resolve })),
    [],
  )

  const closeDialog = (result) => {
    dialog.resolve(result)
    setDialog(null)
  }

  return (
    <NotifyContext.Provider value={{ toast, confirm }}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map(({ id, message, type }) => {
          const [color, Icon] = STYLE[type] ?? STYLE.success
          return (
            <div
              key={id}
              role={type === 'error' ? 'alert' : 'status'}
              className={`toast-in pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${color}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{message}</span>
              <button
                type="button"
                aria-label={t('Đóng')}
                onClick={() => dismiss(id)}
                className="shrink-0 opacity-80 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => closeDialog(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="toast-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-slate-900">
              {dialog.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeDialog(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t('Hủy')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => closeDialog(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t('Xác nhận')}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  )
}

export const useNotify = () => useContext(NotifyContext)

// Thay cho useState(''): đặt giá trị khác rỗng sẽ tự bật popup.
export function useToastState(type = 'error') {
  const { toast } = useNotify()
  const [value, setValue] = useState('')

  const set = useCallback(
    (message) => {
      setValue(message)
      if (message) toast(message, type)
    },
    [toast, type],
  )

  return [value, set]
}
