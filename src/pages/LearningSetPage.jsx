import { useNotify, useToastState } from '../components/ui/Notify'
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import {
  Link,
  useParams,
} from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

const EMPTY_ITEM = {
  prompt: '',
  reading: '',
  answer: '',
  example: '',
  example_reading: '',
  example_meaning: '',
}

export default function LearningSetPage() {
  const { id } = useParams()
  const t = useT()

  const [learningSet, setLearningSet] = useState(null)

  const [loading, setLoading] = useState(true)
  const { toast, confirm } = useNotify()
  const [error, setError] = useToastState('error')

  const [showAddModal, setShowAddModal] =
    useState(false)

  const [items, setItems] =
    useState([{ ...EMPTY_ITEM }])

  const [saving, setSaving] = useState(false)

  const [editingItem, setEditingItem] =
    useState(null)

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    if (id) {
      loadSet()
    }
  }, [id])

  async function loadSet() {
    setLoading(true)
    setError('')

    const { data, error: queryError } =
      await supabase
        .from('learning_sets')
        .select(`
          id,
          title,
          description,
          set_type,
          source_type,
          is_public,
          created_at,

          learning_items (
            id,
            item_type,
            prompt,
            answer,
            reading,
            meaning,
            example,
            example_reading,
            example_meaning,
            sort_order
          )
        `)
        .eq('id', id)
        .single()

    if (queryError) {
      console.error(queryError)
      setError(queryError.message)
      setLoading(false)
      return
    }

    data.learning_items =
      [...(data.learning_items ?? [])]
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0),
        )

    setLearningSet(data)
    setLoading(false)
  }

  // =========================================================
  // ADD FORM
  // =========================================================

  function openAddModal() {
    setItems([{ ...EMPTY_ITEM }])
    setShowAddModal(true)
  }

  function closeAddModal() {
    if (saving) return

    setShowAddModal(false)
    setItems([{ ...EMPTY_ITEM }])
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  function addAnotherItem() {
    setItems((current) => [
      ...current,
      { ...EMPTY_ITEM },
    ])
  }

  function removeItem(index) {
    setItems((current) => {
      if (current.length === 1) {
        return current
      }

      return current.filter(
        (_, itemIndex) => itemIndex !== index,
      )
    })
  }

  // =========================================================
  // SAVE MULTIPLE ITEMS
  // =========================================================

  async function saveItems() {
    if (!learningSet) return

    const validItems = items.filter(
      (item) =>
        item.prompt.trim() &&
        item.answer.trim(),
    )

    if (validItems.length === 0) {
      toast(t('Vui lòng nhập từ và nghĩa.'), 'error')
      return
    }

    setSaving(true)

    const currentCount =
      learningSet.learning_items?.length ?? 0

    const payload = validItems.map(
      (item, index) => ({
        learning_set_id: learningSet.id,

        item_type:
          learningSet.set_type === 'mixed'
            ? 'vocabulary'
            : learningSet.set_type,

        prompt: item.prompt.trim(),

        answer: item.answer.trim(),

        reading:
          item.reading.trim() || null,

        // Với vocabulary hiện tại,
        // meaning dùng cùng giá trị với answer.
        meaning: item.answer.trim(),

        example:
          item.example.trim() || null,

        example_reading:
          item.example_reading.trim() || null,

        example_meaning:
          item.example_meaning.trim() || null,

        sort_order:
          currentCount + index + 1,
      }),
    )

    const { error: insertError } =
      await supabase
        .from('learning_items')
        .insert(payload)

    if (insertError) {
      console.error(insertError)
      toast(insertError.message, 'error')
      setSaving(false)
      return
    }

    setSaving(false)
    setShowAddModal(false)
    setItems([{ ...EMPTY_ITEM }])

    await loadSet()
  }

  // =========================================================
  // DELETE
  // =========================================================

  async function deleteItem(item) {
    const confirmed = await confirm(
      t('Xóa "{name}" khỏi bộ học?', { name: item.prompt }),
    )

    if (!confirmed) return

    const { error: deleteError } =
      await supabase
        .from('learning_items')
        .delete()
        .eq('id', item.id)

    if (deleteError) {
      console.error(deleteError)
      toast(deleteError.message, 'error')
      return
    }

    await loadSet()
  }

  // =========================================================
  // EDIT
  // =========================================================

  function startEdit(item) {
    setEditingItem({
      ...item,
      reading: item.reading ?? '',
      example: item.example ?? '',
      example_reading:
        item.example_reading ?? '',
      example_meaning:
        item.example_meaning ?? '',
    })
  }

  function updateEditing(field, value) {
    setEditingItem((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function saveEdit() {
    if (!editingItem) return

    if (
      !editingItem.prompt.trim() ||
      !editingItem.answer.trim()
    ) {
      toast(t('Từ và nghĩa không được để trống.'), 'error')
      return
    }

    setSaving(true)

    const { error: updateError } =
      await supabase
        .from('learning_items')
        .update({
          prompt: editingItem.prompt.trim(),

          answer: editingItem.answer.trim(),

          meaning: editingItem.answer.trim(),

          reading:
            editingItem.reading.trim() || null,

          example:
            editingItem.example.trim() || null,

          example_reading:
            editingItem.example_reading.trim() ||
            null,

          example_meaning:
            editingItem.example_meaning.trim() ||
            null,
        })
        .eq('id', editingItem.id)

    if (updateError) {
      console.error(updateError)
      toast(updateError.message, 'error')
      setSaving(false)
      return
    }

    setEditingItem(null)
    setSaving(false)

    await loadSet()
  }

  // =========================================================
  // STATES
  // =========================================================

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang tải bộ học...')}
      </p>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-red-600">
        {error}
      </div>
    )
  }

  if (!learningSet) {
    return null
  }

  return (
    <>
      <div className="w-full">

        {/* BACK */}

        <Link
          to="/learn"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={17} />
          {t('Bộ học')}
        </Link>


        {/* HEADER */}

        <div className="mt-8 flex items-start justify-between gap-6">

          <div>

            <span className="text-sm font-semibold text-indigo-600">
              {t(getTypeLabel(
                learningSet.set_type,
              ))}
            </span>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {learningSet.title}
            </h1>

            {learningSet.description && (
              <p className="mt-2 text-slate-500">
                {learningSet.description}
              </p>
            )}

          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={17} />
            {t('Thêm nội dung')}
          </button>

        </div>


        {/* ITEMS */}

        <div className="mt-8">

          {learningSet.learning_items.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-10 text-center">

              <p className="font-semibold text-slate-700">
                {t('Bộ học đang trống')}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {t('Thêm từ vựng, Kanji, ngữ pháp hoặc nội dung bạn muốn học.')}
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
              >
                <Plus size={16} />
                {t('Thêm nội dung đầu tiên')}
              </button>

            </div>

          ) : (

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">

              <div className="grid min-w-[640px] grid-cols-[60px_1.3fr_1fr_1fr_90px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">

                <div>#</div>
                <div>{t('Từ')}</div>
                <div>{t('Cách đọc')}</div>
                <div>{t('Nghĩa')}</div>
                <div></div>

              </div>

              <div className="divide-y divide-slate-100">

                {learningSet.learning_items.map(
                  (item, index) => (

                    <div
                      key={item.id}
                      className="grid min-w-[640px] grid-cols-[60px_1.3fr_1fr_1fr_90px] items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                    >

                      <div className="text-sm text-slate-400">
                        {index + 1}
                      </div>

                      <div className="font-semibold text-slate-900">
                        {item.prompt}
                      </div>

                      <div className="text-sm text-slate-500">
                        {item.reading || '—'}
                      </div>

                      <div className="text-sm font-medium text-slate-700">
                        {item.answer}
                      </div>

                      <div className="flex justify-end gap-1">

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(item)
                          }
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title={t('Sửa')}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteItem(item)
                          }
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          title={t('Xóa')}
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </div>

                  ),
                )}

              </div>

            </div>

          )}

        </div>

      </div>


      {/* =====================================================
          ADD MODAL
      ====================================================== */}

      {showAddModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t('Thêm nội dung')}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t('Thêm một hoặc nhiều từ vào bộ học.')}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>


            {/* CONTENT */}

            <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">

              {items.map((item, index) => (

                <VocabularyForm
                  key={index}
                  item={item}
                  index={index}
                  total={items.length}
                  onChange={updateItem}
                  onRemove={removeItem}
                />

              ))}


              <button
                type="button"
                onClick={addAnotherItem}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Plus size={16} />
                {t('Thêm từ khác')}
              </button>

            </div>


            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">

              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t('Hủy')}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveItems}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? t('Đang lưu...')
                  : t('Lưu {n} từ', { n: items.length })}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          EDIT MODAL
      ====================================================== */}

      {editingItem && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5">

          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <h2 className="text-xl font-bold text-slate-900">
                {t('Sửa nội dung')}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setEditingItem(null)
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <div className="p-6">

              <EditVocabularyForm
                item={editingItem}
                onChange={updateEditing}
              />

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setEditingItem(null)
                }
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t('Hủy')}
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t('Lưu thay đổi')}
              </button>

            </div>

          </div>

        </div>

      )}
    </>
  )
}


// =========================================================
// ADD VOCABULARY FORM
// =========================================================

function VocabularyForm({
  item,
  index,
  total,
  onChange,
  onRemove,
}) {
  const t = useT()

  return (
    <div className="rounded-2xl border border-slate-200 p-5">

      <div className="mb-5 flex items-center justify-between">

        <p className="font-semibold text-slate-800">
          {t('Từ {n}', { n: index + 1 })}
        </p>

        {total > 1 && (
          <button
            type="button"
            onClick={() =>
              onRemove(index)
            }
            className="text-sm font-medium text-red-500"
          >
            {t('Xóa')}
          </button>
        )}

      </div>

      <div className="grid gap-4 md:grid-cols-2">

        <Field
          label={t('Từ / nội dung')}
          required
          value={item.prompt}
          placeholder="例: 私"
          onChange={(value) =>
            onChange(index, 'prompt', value)
          }
        />

        <Field
          label={t('Cách đọc')}
          value={item.reading}
          placeholder="わたし"
          onChange={(value) =>
            onChange(index, 'reading', value)
          }
        />

        <Field
          label={t('Nghĩa / đáp án')}
          required
          value={item.answer}
          placeholder={t('Tôi')}
          onChange={(value) =>
            onChange(index, 'answer', value)
          }
        />

      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">

        <p className="mb-4 text-sm font-semibold text-slate-600">
          {t('Ví dụ')}
          <span className="ml-1 font-normal text-slate-400">
            {t('(không bắt buộc)')}
          </span>
        </p>

        <div className="grid gap-4">

          <Field
            label={t('Câu ví dụ')}
            value={item.example}
            placeholder="私は学生です。"
            onChange={(value) =>
              onChange(index, 'example', value)
            }
          />

          <div className="grid gap-4 md:grid-cols-2">

            <Field
              label={t('Cách đọc câu ví dụ')}
              value={item.example_reading}
              placeholder="わたしはがくせいです。"
              onChange={(value) =>
                onChange(
                  index,
                  'example_reading',
                  value,
                )
              }
            />

            <Field
              label={t('Nghĩa câu ví dụ')}
              value={item.example_meaning}
              placeholder={t('Tôi là học sinh.')}
              onChange={(value) =>
                onChange(
                  index,
                  'example_meaning',
                  value,
                )
              }
            />

          </div>

        </div>

      </div>

    </div>
  )
}


// =========================================================
// EDIT FORM
// =========================================================

function EditVocabularyForm({
  item,
  onChange,
}) {
  const t = useT()

  return (
    <div className="space-y-4">

      <div className="grid gap-4 md:grid-cols-2">

        <Field
          label={t('Từ / nội dung')}
          required
          value={item.prompt}
          onChange={(value) =>
            onChange('prompt', value)
          }
        />

        <Field
          label={t('Cách đọc')}
          value={item.reading}
          onChange={(value) =>
            onChange('reading', value)
          }
        />

        <Field
          label={t('Nghĩa / đáp án')}
          required
          value={item.answer}
          onChange={(value) =>
            onChange('answer', value)
          }
        />

      </div>

      <div className="border-t border-slate-100 pt-5">

        <div className="space-y-4">

          <Field
            label={t('Câu ví dụ')}
            value={item.example}
            onChange={(value) =>
              onChange('example', value)
            }
          />

          <div className="grid gap-4 md:grid-cols-2">

            <Field
              label={t('Cách đọc câu ví dụ')}
              value={item.example_reading}
              onChange={(value) =>
                onChange(
                  'example_reading',
                  value,
                )
              }
            />

            <Field
              label={t('Nghĩa câu ví dụ')}
              value={item.example_meaning}
              onChange={(value) =>
                onChange(
                  'example_meaning',
                  value,
                )
              }
            />

          </div>

        </div>

      </div>

    </div>
  )
}


// =========================================================
// FIELD
// =========================================================

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <label className="block">

      <span className="text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
      />

    </label>
  )
}


// =========================================================
// LABEL
// =========================================================

function getTypeLabel(type) {
  const labels = {
    vocabulary: 'Từ vựng',
    kanji: 'Kanji',
    grammar: 'Ngữ pháp',
    kana: 'Kana',
    mixed: 'Tổng hợp',
  }

  return labels[type] ?? type
}