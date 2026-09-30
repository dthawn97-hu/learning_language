import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useT } from '../../i18n'

export const TitleCell = ({ to, title, description }) => (
  <div className="min-w-0">
    <Link to={to} className="font-medium text-slate-900 hover:underline">
      {title}
    </Link>
    {description && (
      <p className="mt-0.5 line-clamp-1 text-slate-500">{description}</p>
    )}
  </div>
)

const btn =
  'inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100'

export const ActionLink = ({ to, children }) => (
  <Link to={to} className={btn}>
    {children}
  </Link>
)

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100'

// Cột thao tác: [nút chính] [sửa] [xóa]; sửa/xóa chỉ hiện với bộ của chính user.
export function RowActions({ main, canEdit, onEdit, onDelete, deleteLabel, onUp, onDown }) {
  const t = useT()
  const del = deleteLabel ?? t('Xóa')
  const edit = t('Sửa')

  return (
  <div className="flex items-center justify-end gap-1">
    {main}
    {canEdit && (
      <>
        {onUp && (
          <button type="button" aria-label={t('Di chuyển lên')} title={t('Di chuyển lên')} onClick={onUp} className={iconBtn}>
            <ArrowUp size={16} />
          </button>
        )}
        {onDown && (
          <button type="button" aria-label={t('Di chuyển xuống')} title={t('Di chuyển xuống')} onClick={onDown} className={iconBtn}>
            <ArrowDown size={16} />
          </button>
        )}
        <button type="button" aria-label={edit} title={edit} onClick={onEdit} className={iconBtn}>
          <Pencil size={16} />
        </button>
        <button
          type="button"
          aria-label={del}
          title={del}
          onClick={onDelete}
          className={`${iconBtn} hover:text-red-600`}
        >
          <Trash2 size={16} />
        </button>
      </>
    )}
  </div>
  )
}

export const AddButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
  >
    <Plus size={16} />
    {children}
  </button>
)

export const PageTitle = ({ label, title, hint, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h1 className="mt-1 text-3xl text-slate-900">{title}</h1>
      <p className="mt-1 text-slate-500">{hint}</p>
    </div>
    {action}
  </div>
)

export const Empty = ({ title, hint, onAction, action }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <p className="font-semibold text-slate-800">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{hint}</p>
    {onAction && (
      <div className="mt-4 flex justify-center">
        <AddButton onClick={onAction}>{action}</AddButton>
      </div>
    )}
  </div>
)
