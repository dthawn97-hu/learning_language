import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useT } from '../../i18n'
import { useNotify } from './Notify'

/**
 * Phân trang phía Supabase: `run(from, to)` trả về query đã gắn
 * `.range(from, to)` và `{ count: 'exact' }`. Trang hiện tại nằm trên URL
 * (?<param>=2) nên bấm Back/F5 vẫn giữ đúng trang.
 */
export function usePaged(param, run, deps = [], pageSize = 10) {
  const [sp, setSp] = useSearchParams()
  const { toast } = useNotify()
  const runRef = useRef(run)
  runRef.current = run

  const page = Math.max(1, Number(sp.get(param)) || 1)
  const [state, setState] = useState({ rows: [], total: 0, loading: true })
  const [tick, setTick] = useState(0)

  const setPage = (p) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(param, p)
        return next
      },
      { replace: true },
    )

  useEffect(() => {
    let stale = false
    const from = (page - 1) * pageSize

    setState((s) => ({ ...s, loading: true }))

    Promise.resolve(runRef.current(from, from + pageSize - 1)).then(
      ({ data, count, error }) => {
        if (stale) return

        if (error) {
          console.error(error)
          toast(error.message, 'error')
          setState((s) => ({ ...s, loading: false }))
          return
        }

        // trang vượt quá dữ liệu (vd. vừa xóa hết trang cuối) -> lùi về trang cuối
        if (!data?.length && count > 0 && page > 1) {
          setPage(Math.ceil(count / pageSize))
          return
        }

        setState({ rows: data ?? [], total: count ?? 0, loading: false })
      },
    )

    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, toast, tick, ...deps])

  return {
    ...state,
    page,
    pageSize,
    setPage,
    reload: () => setTick((t) => t + 1),
  }
}

/**
 * columns: [{ header, cell: (row) => node, className? }]
 * paged: kết quả của usePaged
 */
export default function DataTable({
  columns,
  paged,
  rowKey = (r) => r.id,
  empty,
}) {
  const { rows, total, loading, page, pageSize, setPage } = paged
  const t = useT()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (!loading && total === 0) return empty

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.header}
                  className={`px-4 py-3 font-medium ${c.className ?? ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-slate-100 ${
              loading ? 'opacity-50' : ''
            }`}
          >
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td
                    key={c.header}
                    className={`px-4 py-3 align-top ${c.className ?? ''}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}

            {loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  {t('Đang tải...')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
        <span>
          {from}–{to} / {total}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('Trang trước')}
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="min-w-[4.5rem] text-center">
            {page} / {pages}
          </span>

          <button
            type="button"
            aria-label={t('Trang sau')}
            disabled={page >= pages || loading}
            onClick={() => setPage(page + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  )
}
