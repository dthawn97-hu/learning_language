import { useState } from 'react'
import {
  BookA,
  BookOpen,
  FileText,
  Paperclip,
  Languages,
  ListChecks,
  MessageSquare,
  PenLine,
} from 'lucide-react'

import { useT } from '../../i18n'
import MediaView from './Media'
import Speak from './Speak'

/**
 * Mỗi loại mục của bài học = một renderer. Dữ liệu nằm ở cột jsonb `content`
 * của bảng lesson_sections (cấu trúc từng loại xem file SQL).
 * Thêm loại mới: thêm vào SECTION_TYPES + một renderer trong RENDERERS + cho phép trong CHECK của SQL.
 */
export const SECTION_TYPES = {
  vocabulary: { label: 'Từ vựng', icon: BookA },
  kanji: { label: 'Kanji', icon: PenLine },
  grammar: { label: 'Ngữ pháp', icon: Languages },
  dialogue: { label: 'Hội thoại', icon: MessageSquare },
  reading: { label: 'Đọc hiểu', icon: BookOpen },
  exercise: { label: 'Bài tập', icon: ListChecks },
  media: { label: 'Tài liệu', icon: Paperclip },
  note: { label: 'Ghi chú', icon: FileText },
}

// Các loại có thể chuyển thành bộ học (flashcard/kiểm tra) của user.
export const SAVEABLE = ['vocabulary', 'kanji']

const card = 'rounded-xl border border-slate-200 bg-white'
const muted = 'text-slate-500'

const arr = (v) => (Array.isArray(v) ? v : [])

function Examples({ items }) {
  const t = useT()
  if (!items?.length) return null
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('Ví dụ')}</p>
      {items.map((e, i) => (
        <div key={i}>
          <p className="flex items-center gap-1 text-slate-900">{e.text ?? e.word}<Speak text={e.text ?? e.word} /></p>
          {e.reading && <p className={muted}>{e.reading}</p>}
          {e.meaning && <p className={muted}>{e.meaning}</p>}
        </div>
      ))}
    </div>
  )
}

function Vocabulary({ content }) {
  const t = useT()
  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t('Từ')}</th>
            <th className="px-4 py-3 font-medium">{t('Cách đọc')}</th>
            <th className="px-4 py-3 font-medium">{t('Nghĩa')}</th>
            <th className="px-4 py-3 font-medium">{t('Ví dụ')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {arr(content).map((w, i) => (
            <tr key={i} className="align-top">
              <td className="px-4 py-3 text-base font-medium text-slate-900"><span className="inline-flex items-center gap-1">{w.word}<Speak text={w.reading || w.word} /></span></td>
              <td className="px-4 py-3 text-slate-600">{w.reading}</td>
              <td className="px-4 py-3 text-slate-900">{w.meaning}</td>
              <td className="px-4 py-3">
                {w.example && <p className="flex items-center gap-1 text-slate-900">{w.example}<Speak text={w.example} /></p>}
                {w.example_reading && <p className={muted}>{w.example_reading}</p>}
                {w.example_meaning && <p className={muted}>{w.example_meaning}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Kanji({ content }) {
  const t = useT()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {arr(content).map((k, i) => (
        <div key={i} className={`${card} p-5`}>
          <div className="flex items-start gap-4">
            <span className="flex flex-col items-center gap-1"><span className="text-5xl leading-none text-slate-900">{k.char}</span><Speak text={k.kunyomi?.split(/[ /、,]/)[0] || k.char} /></span>
            <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className={muted}>{t('Nghĩa')}</dt>
              <dd className="font-medium text-slate-900">{k.meaning}</dd>
              {k.onyomi && (<><dt className={muted}>{t('Âm On')}</dt><dd>{k.onyomi}</dd></>)}
              {k.kunyomi && (<><dt className={muted}>{t('Âm Kun')}</dt><dd>{k.kunyomi}</dd></>)}
              {k.strokes && (<><dt className={muted}>{t('Số nét')}</dt><dd>{k.strokes}</dd></>)}
            </dl>
          </div>
          <Examples items={arr(k.examples)} />
        </div>
      ))}
    </div>
  )
}

function Grammar({ content }) {
  const t = useT()
  return (
    <div className="space-y-4">
      {arr(content).map((g, i) => (
        <div key={i} className={`${card} p-5`}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('Cấu trúc')}</p>
          <p className="mt-1 flex items-center gap-1 text-lg font-medium text-slate-900">{g.pattern}<Speak text={g.pattern} /></p>
          {g.meaning && <p className="mt-1 text-slate-700">{g.meaning}</p>}
          {g.explanation && (
            <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{g.explanation}</p>
          )}
          <Examples items={arr(g.examples)} />
        </div>
      ))}
    </div>
  )
}

function Dialogue({ content }) {
  const [showMeaning, setShowMeaning] = useState(true)
  const t = useT()
  return (
    <div>
      <label className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={showMeaning} onChange={(e) => setShowMeaning(e.target.checked)} />
        {t('Hiện bản dịch')}
      </label>
      <div className={`${card} divide-y divide-slate-100`}>
        {arr(content).map((l, i) => (
          <div key={i} className="flex gap-4 p-4">
            <span className="w-20 shrink-0 text-sm font-medium text-slate-500">{l.speaker}</span>
            <div className="text-sm">
              <p className="flex items-center gap-1 text-base text-slate-900">{l.text}<Speak text={l.text} /></p>
              {l.reading && <p className={muted}>{l.reading}</p>}
              {showMeaning && l.meaning && <p className="mt-1 text-slate-600">{l.meaning}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Trắc nghiệm dùng chung cho Đọc hiểu và Bài tập
function Questions({ questions }) {
  const t = useT()
  const list = arr(questions)
  const [picked, setPicked] = useState({})
  const [checked, setChecked] = useState({})

  const correct = list.filter((q, i) => checked[i] && picked[i] === q.answer).length
  const allChecked = list.length > 0 && list.every((_, i) => checked[i])

  return (
    <div className="space-y-4">
      {list.map((q, i) => (
        <div key={i} className={`${card} p-5`}>
          <p className="font-medium text-slate-900">{t('Câu {n}', { n: i + 1 })}. {q.q}</p>

          <div className="mt-3 space-y-2">
            {arr(q.options).map((o, j) => {
              const isAnswer = checked[i] && j === q.answer
              const isWrong = checked[i] && picked[i] === j && j !== q.answer
              return (
                <label
                  key={j}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    isAnswer
                      ? 'border-emerald-300 bg-emerald-50'
                      : isWrong
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    disabled={checked[i]}
                    checked={picked[i] === j}
                    onChange={() => setPicked((p) => ({ ...p, [i]: j }))}
                  />
                  {o}
                </label>
              )
            })}
          </div>

          {checked[i] ? (
            <p className={`mt-3 text-sm ${picked[i] === q.answer ? 'text-emerald-700' : 'text-red-600'}`}>
              {picked[i] === q.answer ? t('Chính xác!') : t('Chưa chính xác.')}
              {q.explain && <span className="text-slate-600"> {q.explain}</span>}
            </p>
          ) : (
            <button
              type="button"
              disabled={picked[i] === undefined}
              onClick={() => setChecked((c) => ({ ...c, [i]: true }))}
              className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              {t('Kiểm tra đáp án')}
            </button>
          )}
        </div>
      ))}

      {allChecked && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-5 py-4 text-white">
          <span>{t('Kết quả: {correct}/{total}', { correct, total: list.length })}</span>
          <button
            type="button"
            onClick={() => { setPicked({}); setChecked({}) }}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
          >
            {t('Làm lại')}
          </button>
        </div>
      )}
    </div>
  )
}

function Reading({ content }) {
  const t = useT()
  const c = content && !Array.isArray(content) ? content : {}
  const [showReading, setShowReading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  return (
    <div className="space-y-5">
      <div className={`${card} p-5`}>
        <div className="flex items-start gap-2"><p className="flex-1 whitespace-pre-line text-lg leading-loose text-slate-900">{c.passage}</p><Speak text={c.passage} /></div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          {c.reading && (
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showReading} onChange={(e) => setShowReading(e.target.checked)} />
              {t('Hiện cách đọc')}
            </label>
          )}
          {c.translation && (
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showTranslation} onChange={(e) => setShowTranslation(e.target.checked)} />
              {t('Hiện bản dịch')}
            </label>
          )}
        </div>

        {showReading && c.reading && <p className="mt-3 whitespace-pre-line text-slate-600">{c.reading}</p>}
        {showTranslation && c.translation && <p className="mt-3 whitespace-pre-line text-slate-600">{c.translation}</p>}
      </div>

      <Questions questions={c.questions} />
    </div>
  )
}

const RENDERERS = {
  vocabulary: Vocabulary,
  kanji: Kanji,
  grammar: Grammar,
  dialogue: Dialogue,
  reading: Reading,
  exercise: ({ content }) => <Questions questions={content} />,
  media: ({ content }) => <MediaView content={content} />,
  note: () => null, // chỉ hiển thị phần body
}

export function SectionView({ section }) {
  const Renderer = RENDERERS[section.section_type]

  return (
    <div className="space-y-4">
      {section.body && (
        <p className="whitespace-pre-line text-slate-700">{section.body}</p>
      )}
      {Renderer && <Renderer content={section.content} />}
    </div>
  )
}
