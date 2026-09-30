import { Plus, Trash2 } from 'lucide-react'

import { useT } from '../../i18n'
import MediaEditor from './MediaEditor'
import { SECTION_TYPES } from './Sections'

export const field =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900'
export const label = 'text-sm font-medium text-slate-700'

/* ------------------------------------------------------------------
 * Trình soạn một mục bài học bằng form thường (không nhập JSON).
 *  - vocabulary / dialogue / exercise: mỗi dòng một mục, ngăn cột bằng "|"
 *  - kanji / grammar: danh sách thẻ, mỗi thẻ có các ô riêng
 *  - reading: đoạn văn + bản dịch + câu hỏi (mỗi dòng một câu)
 * Dữ liệu ra/vào khớp cột jsonb `content` của lesson_sections.
 * ------------------------------------------------------------------ */

const cell = (x) => (x ?? '').toString()
const split = (line) => line.split(/\s*\|\s*/)
const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const trimEnd = (parts) => {
  const p = [...parts]
  while (p.length && !p[p.length - 1]) p.pop()
  return p.join(' | ')
}

const LINE_TYPES = {
  vocabulary: {
    hint: 'từ | cách đọc | nghĩa | câu ví dụ | cách đọc ví dụ | nghĩa ví dụ',
    example: '水 | みず | nước | 水をください。 | みずをください。 | Cho tôi nước.',
    toText: (c) =>
      c.map((w) => trimEnd([w.word, w.reading, w.meaning, w.example, w.example_reading, w.example_meaning].map(cell))).join('\n'),
    parse: (text) =>
      lines(text).map((l) => {
        const [word, reading, meaning, example, example_reading, example_meaning] = split(l)
        return { word, reading, meaning, example, example_reading, example_meaning }
      }),
    valid: (r) => r.word && r.meaning,
  },
  dialogue: {
    hint: 'người nói | câu thoại | cách đọc | nghĩa',
    example: 'A | はじめまして。 | はじめまして。 | Rất vui được gặp bạn.',
    toText: (c) => c.map((d) => trimEnd([d.speaker, d.text, d.reading, d.meaning].map(cell))).join('\n'),
    parse: (text) =>
      lines(text).map((l) => {
        const [speaker, text, reading, meaning] = split(l)
        return { speaker, text, reading, meaning }
      }),
    valid: (r) => r.speaker && r.text,
  },
  exercise: {
    hint: 'câu hỏi | đáp án 1 ; đáp án 2 ; đáp án 3 | số thứ tự đáp án đúng (1,2,3...) | giải thích',
    example: '「わたし」の意味は？ | tôi ; bạn ; giáo viên | 1 | わたし = tôi.',
    toText: (c) =>
      c.map((q) => trimEnd([q.q, (q.options ?? []).join(' ; '), String((q.answer ?? 0) + 1), q.explain].map(cell))).join('\n'),
    parse: (text) =>
      lines(text).map((l) => {
        const [q, opts, ans, explain] = split(l)
        return { q, options: (opts ?? '').split(/\s*;\s*/).filter(Boolean), answer: Number(ans) - 1, explain }
      }),
    valid: (r) => r.q && r.options.length >= 2 && r.answer >= 0 && r.answer < r.options.length,
  },
}

// Ví dụ lồng trong thẻ: mỗi dòng "a | b | c" -> {keys[0], keys[1], keys[2]}
const linesField = (k, l, hint, keys) => ({ k, l, hint, keys, lines: true })

const CARD_TYPES = {
  kanji: {
    add: 'Thêm chữ Kanji',
    required: 'char',
    fields: [
      { k: 'char', l: 'Chữ Kanji' },
      { k: 'meaning', l: 'Nghĩa' },
      { k: 'onyomi', l: 'Âm On' },
      { k: 'kunyomi', l: 'Âm Kun' },
      { k: 'strokes', l: 'Số nét', num: true },
      linesField('examples', 'Từ ví dụ', 'từ | cách đọc | nghĩa', ['word', 'reading', 'meaning']),
    ],
  },
  grammar: {
    add: 'Thêm mẫu ngữ pháp',
    required: 'pattern',
    fields: [
      { k: 'pattern', l: 'Cấu trúc' },
      { k: 'meaning', l: 'Ý nghĩa' },
      { k: 'explanation', l: 'Giải thích', area: true },
      linesField('examples', 'Câu ví dụ', 'câu | cách đọc | nghĩa', ['text', 'reading', 'meaning']),
    ],
  },
}

const linesToObjs = (text, keys) =>
  lines(text).map((l) => Object.fromEntries(split(l).map((v, i) => [keys[i], v]).filter(([k]) => k)))

const objsToLines = (arr, keys) =>
  (arr ?? []).map((e) => trimEnd(keys.map((k) => cell(e[k])))).join('\n')

const cardToState = (cfg, obj = {}) =>
  Object.fromEntries(
    cfg.fields.map((f) => [f.k, f.lines ? objsToLines(obj[f.k], f.keys) : cell(obj[f.k])]),
  )

const stateToCard = (cfg, st) => {
  const out = {}
  for (const f of cfg.fields) {
    if (f.lines) out[f.k] = linesToObjs(st[f.k] ?? '', f.keys)
    else if (f.num) out[f.k] = Number(st[f.k]) || undefined
    else out[f.k] = (st[f.k] ?? '').trim()
  }
  return out
}

/* ---------- state <-> section ---------- */

export function initSection(section, order = '') {
  const type = section?.section_type ?? 'vocabulary'
  const content = section?.content
  const state = {
    id: section?.id,
    type,
    title: section?.title ?? '',
    body: section?.body ?? '',
    order: section?.sort_order ?? order,
    text: '',
    cards: [],
    reading: { passage: '', reading: '', translation: '', questions: '' },
    media: [{ title: '', url: '' }],
  }

  if (type === 'media' && Array.isArray(content) && content.length) {
    state.media = content.map((m) => ({ title: cell(m.title), url: cell(m.url) }))
  }

  if (LINE_TYPES[type]) state.text = LINE_TYPES[type].toText(Array.isArray(content) ? content : [])
  else if (CARD_TYPES[type]) {
    const cfg = CARD_TYPES[type]
    state.cards = (Array.isArray(content) ? content : []).map((c) => cardToState(cfg, c))
  } else if (type === 'reading' && content && !Array.isArray(content)) {
    state.reading = {
      passage: cell(content.passage),
      reading: cell(content.reading),
      translation: cell(content.translation),
      questions: LINE_TYPES.exercise.toText(content.questions ?? []),
    }
  }
  if (CARD_TYPES[type] && state.cards.length === 0) state.cards = [cardToState(CARD_TYPES[type])]
  return state
}

function parseLineRows(type, text, t) {
  const cfg = LINE_TYPES[type]
  const rows = cfg.parse(text)
  const bad = rows.findIndex((r) => !cfg.valid(r))
  if (bad >= 0) throw new Error(t('Dòng {n} chưa đúng định dạng. Cần: {hint}', { n: bad + 1, hint: t(cfg.hint) }))
  return rows
}

/** Trả về {section_type, title, body, content}; ném Error có thông báo nếu dữ liệu sai. */
export function buildSection(state, t) {
  if (!state.title.trim()) throw new Error(t('Vui lòng nhập tiêu đề mục.'))

  let content = []
  if (LINE_TYPES[state.type]) content = parseLineRows(state.type, state.text, t)
  else if (CARD_TYPES[state.type]) {
    const cfg = CARD_TYPES[state.type]
    content = state.cards
      .map((c) => stateToCard(cfg, c))
      .filter((c) => c[cfg.required])
  } else if (state.type === 'media') {
    content = state.media
      .map((m) => ({ title: m.title.trim(), url: m.url.trim() }))
      .filter((m) => m.url)
    if (!content.length) throw new Error(t('Hãy thêm ít nhất một tài liệu.'))
  } else if (state.type === 'reading') {
    const r = state.reading
    content = {
      passage: r.passage.trim(),
      reading: r.reading.trim() || undefined,
      translation: r.translation.trim() || undefined,
      questions: r.questions.trim() ? parseLineRows('exercise', r.questions, t) : [],
    }
  }

  return {
    section_type: state.type,
    title: state.title.trim(),
    body: state.body.trim() || null,
    content,
  }
}

/* ---------- UI ---------- */

export default function SectionEditor({ value, onChange, showOrder = false, onRemove }) {
  const t = useT()
  const set = (patch) => onChange({ ...value, ...patch })
  const { type } = value

  function changeType(next) {
    const fresh = initSection({ section_type: next }, value.order)
    // đổi loại -> giữ tiêu đề/mô tả/thứ tự, làm mới phần nội dung theo loại
    onChange({ ...fresh, id: value.id, title: value.title, body: value.body, order: value.order })
  }

  const cfg = CARD_TYPES[type]

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${showOrder ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <div className="col-span-2 sm:col-span-2">
          <label className={label}>{t('Loại mục')}</label>
          <select value={type} onChange={(e) => changeType(e.target.value)} className={field}>
            {Object.entries(SECTION_TYPES).map(([v, m]) => (
              <option key={v} value={v}>{t(m.label)}</option>
            ))}
          </select>
        </div>
        {showOrder && (
          <div>
            <label className={label}>{t('Thứ tự')}</label>
            <input type="number" value={value.order} onChange={(e) => set({ order: e.target.value })} className={field} />
          </div>
        )}
      </div>

      <div>
        <label className={label}>{t('Tiêu đề mục')}</label>
        <input value={value.title} onChange={(e) => set({ title: e.target.value })} className={field} />
      </div>

      <div>
        <label className={label}>{t('Mô tả / ghi chú chung')}</label>
        <textarea rows={type === 'note' ? 8 : 2} value={value.body} onChange={(e) => set({ body: e.target.value })} className={`${field} resize-none`} />
      </div>

      {LINE_TYPES[type] && (
        <div>
          <label className={label}>{t('Nội dung')}</label>
          <textarea rows={10} value={value.text} onChange={(e) => set({ text: e.target.value })} className={`${field} font-mono`} spellCheck={false} placeholder={LINE_TYPES[type].example} />
          <p className="mt-1 text-xs text-slate-500">
            {t('Mỗi dòng một mục: {hint}', { hint: t(LINE_TYPES[type].hint) })}
          </p>
        </div>
      )}

      {cfg && (
        <div className="space-y-3">
          {value.cards.map((card, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-3">
                {cfg.fields.map((f) => (
                  <div key={f.k} className={f.area || f.lines ? 'col-span-2' : ''}>
                    <label className={label}>{t(f.l)}</label>
                    {f.area || f.lines ? (
                      <textarea
                        rows={f.lines ? 3 : 3}
                        value={card[f.k]}
                        onChange={(e) => set({ cards: value.cards.map((c, j) => (j === i ? { ...c, [f.k]: e.target.value } : c)) })}
                        className={`${field} ${f.lines ? 'font-mono' : ''}`}
                      />
                    ) : (
                      <input
                        type={f.num ? 'number' : 'text'}
                        value={card[f.k]}
                        onChange={(e) => set({ cards: value.cards.map((c, j) => (j === i ? { ...c, [f.k]: e.target.value } : c)) })}
                        className={field}
                      />
                    )}
                    {f.lines && <p className="mt-1 text-xs text-slate-500">{t('Mỗi dòng một mục: {hint}', { hint: t(f.hint) })}</p>}
                  </div>
                ))}
              </div>
              {value.cards.length > 1 && (
                <button
                  type="button"
                  onClick={() => set({ cards: value.cards.filter((_, j) => j !== i) })}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
                >
                  <Trash2 size={14} />
                  {t('Xóa')}
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ cards: [...value.cards, cardToState(cfg)] })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Plus size={15} />
            {t(cfg.add)}
          </button>
        </div>
      )}

      {type === 'media' && (
        <MediaEditor value={value.media} onChange={(media) => set({ media })} />
      )}

      {type === 'reading' && (
        <div className="space-y-4">
          {[
            ['passage', 'Đoạn văn', 5],
            ['reading', 'Cách đọc', 3],
            ['translation', 'Bản dịch', 3],
          ].map(([k, l, rows]) => (
            <div key={k}>
              <label className={label}>{t(l)}</label>
              <textarea
                rows={rows}
                value={value.reading[k]}
                onChange={(e) => set({ reading: { ...value.reading, [k]: e.target.value } })}
                className={field}
              />
            </div>
          ))}
          <div>
            <label className={label}>{t('Câu hỏi')}</label>
            <textarea
              rows={5}
              value={value.reading.questions}
              onChange={(e) => set({ reading: { ...value.reading, questions: e.target.value } })}
              className={`${field} font-mono`}
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('Mỗi dòng một mục: {hint}', { hint: t(LINE_TYPES.exercise.hint) })}
            </p>
          </div>
        </div>
      )}

      {onRemove && (
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
          <Trash2 size={14} />
          {t('Xóa mục')}
        </button>
      )}
    </div>
  )
}
