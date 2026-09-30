import { useToastState } from '../components/ui/Notify'
import {
  ArrowLeft,
  Check,
  RotateCcw,
  X,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import {
  Link,
  useParams,
} from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useT } from '../i18n'
import { useAuth } from '../contexts/AuthContext'

export default function FlashcardStudyPage() {
  const { learningSetId } = useParams()
  const { user } = useAuth()
  const t = useT()

  const [learningSet, setLearningSet] = useState(null)
  const [cards, setCards] = useState([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const [results, setResults] = useState({})
  const [finished, setFinished] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useToastState('error')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (learningSetId) {
      loadCards()
    }
  }, [learningSetId])

  async function loadCards() {
    setLoading(true)
    setError('')

    const { data, error: queryError } =
      await supabase
        .from('learning_sets')
        .select(`
          id,
          title,
          description,

          learning_items (
            id,
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
        .eq('id', learningSetId)
        .single()

    if (queryError) {
      console.error(queryError)
      setError(queryError.message)
      setLoading(false)
      return
    }

    const sortedCards =
      [...(data.learning_items ?? [])]
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0),
        )

    setLearningSet(data)
    setCards(sortedCards)

    setLoading(false)
  }

  function flipCard() {
    setFlipped((current) => !current)
  }

  async function answerCard(remembered) {
    if (!user || saving) return

    const currentCard = cards[currentIndex]

    if (!currentCard) return

    setSaving(true)
    setError('')

    const masteryStatus = remembered
      ? 'remembered'
      : 'not_remembered'

    try {
      /*
       * Tìm progress hiện tại của user đối với
       * learning_item này.
       */
      const {
        data: existingProgress,
        error: findError,
      } = await supabase
        .from('user_item_progress')
        .select(`
          id,
          correct_count,
          wrong_count,
          review_count
        `)
        .eq('user_id', user.id)
        .eq('content_type', 'learning_item')
        .eq('learning_item_id', currentCard.id)
        .maybeSingle()

      if (findError) {
        throw findError
      }

      /*
       * Nếu đã có progress -> UPDATE.
       */
      if (existingProgress) {
        const { error: updateError } =
          await supabase
            .from('user_item_progress')
            .update({
              mastery_status: masteryStatus,

              correct_count:
                (existingProgress.correct_count ?? 0) +
                (remembered ? 1 : 0),

              wrong_count:
                (existingProgress.wrong_count ?? 0) +
                (remembered ? 0 : 1),

              review_count:
                (existingProgress.review_count ?? 0) + 1,

              last_reviewed_at:
                new Date().toISOString(),
            })
            .eq('id', existingProgress.id)
            .eq('user_id', user.id)

        if (updateError) {
          throw updateError
        }
      } else {
        /*
         * Nếu chưa có progress -> INSERT.
         */
        const { error: insertError } =
          await supabase
            .from('user_item_progress')
            .insert({
              user_id: user.id,

              content_type: 'learning_item',
              learning_item_id: currentCard.id,

              mastery_status: masteryStatus,

              correct_count:
                remembered ? 1 : 0,

              wrong_count:
                remembered ? 0 : 1,

              review_count: 1,

              last_reviewed_at:
                new Date().toISOString(),
            })

        if (insertError) {
          throw insertError
        }
      }

      /*
       * Lưu kết quả của phiên học hiện tại
       * vào React state.
       */
      const nextResults = {
        ...results,
        [currentCard.id]: remembered,
      }

      setResults(nextResults)

      /*
       * Card cuối cùng -> kết thúc.
       */
      if (currentIndex >= cards.length - 1) {
        setFinished(true)
        return
      }

      /*
       * Sang card tiếp theo.
       */
      setCurrentIndex(
        (current) => current + 1,
      )

      setFlipped(false)
    } catch (saveError) {
      console.error(saveError)

      setError(
        saveError?.message ||
          t('Không thể lưu tiến độ học.'),
      )
    } finally {
      setSaving(false)
    }
  }

  function restartAll() {
    setCurrentIndex(0)
    setFlipped(false)
    setResults({})
    setFinished(false)
  }

  function reviewForgotten() {
    const forgottenCards =
      cards.filter(
        (card) =>
          results[card.id] === false,
      )

    setCards(forgottenCards)
    setCurrentIndex(0)
    setFlipped(false)
    setResults({})
    setFinished(false)
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang tải flashcards...')}
      </p>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-2xl bg-red-50 p-5 text-red-600">
          {error}
        </div>

        <button
          type="button"
          onClick={() => {
            setError('')
          }}
          className="mt-4 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          {t('Đóng thông báo')}
        </button>
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="max-w-3xl">

        <Link
          to="/flashcards"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={17} />
          Flashcards
        </Link>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-10 text-center">
          {t('Bộ học này chưa có nội dung.')}
        </div>

      </div>
    )
  }

  if (finished) {
    const values =
      Object.values(results)

    const remembered =
      values.filter(
        (value) => value === true,
      ).length

    const forgotten =
      values.filter(
        (value) => value === false,
      ).length

    const total = values.length

    const percentage =
      total > 0
        ? Math.round(
            (remembered / total) * 100,
          )
        : 0

    return (
      <div className="max-w-2xl">

        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={26} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            {t('Hoàn thành!')}
          </h1>

          <p className="mt-2 text-slate-500">
            {t('Bạn đã hoàn thành phiên Flashcard.')}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <ResultBox
              label={t('Tổng')}
              value={total}
            />

            <ResultBox
              label={t('Nhớ')}
              value={remembered}
            />

            <ResultBox
              label={t('Chưa nhớ')}
              value={forgotten}
            />

          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">

            <p className="text-sm text-slate-500">
              {t('Tỷ lệ nhớ')}
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {percentage}%
            </p>

          </div>

          <div className="mt-7 space-y-3">

            {forgotten > 0 && (
              <button
                type="button"
                onClick={reviewForgotten}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
              >
                <RotateCcw size={17} />
                {t('Ôn lại {forgotten} từ chưa nhớ', { forgotten })}
              </button>
            )}

            <button
              type="button"
              onClick={restartAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
            >
              <RotateCcw size={17} />
              {t('Học lại')}
            </button>

            <Link
              to="/flashcards"
              className="block py-2 text-sm font-semibold text-slate-500"
            >
              {t('Quay về Flashcards')}
            </Link>

          </div>

        </div>

      </div>
    )
  }

  const currentCard =
    cards[currentIndex]

  const progress =
    ((currentIndex + 1) /
      cards.length) *
    100

  return (
    <div className="max-w-3xl">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <Link
          to="/flashcards"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={17} />
          Flashcards
        </Link>

        <p className="text-sm font-semibold text-slate-500">
          {currentIndex + 1} / {cards.length}
        </p>

      </div>

      {/* PROGRESS */}

      <div className="mt-7">

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">

          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>

      {/* SET TITLE */}

      <div className="mt-8 text-center">

        <p className="text-sm font-semibold text-indigo-600">
          {learningSet?.title}
        </p>

      </div>

      {/* CARD */}

      <button
        type="button"
        onClick={flipCard}
        disabled={saving}
        className="mt-5 flex min-h-[390px] w-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 text-center shadow-sm transition hover:shadow-md disabled:cursor-default"
      >

        {!flipped ? (

          <>
            <p className="text-4xl font-bold sm:text-5xl text-slate-900">
              {currentCard.prompt}
            </p>

            <p className="mt-8 text-sm text-slate-400">
              {t('Nhấn để xem đáp án')}
            </p>
          </>

        ) : (

          <>
            <p className="text-3xl font-bold text-slate-900">
              {currentCard.prompt}
            </p>

            {currentCard.reading && (
              <p className="mt-3 text-xl text-slate-500">
                {currentCard.reading}
              </p>
            )}

            <div className="my-6 h-px w-20 bg-slate-200" />

            <p className="text-2xl font-bold text-indigo-600">
              {currentCard.answer}
            </p>

            {currentCard.meaning && (
              <p className="mt-2 text-slate-500">
                {currentCard.meaning}
              </p>
            )}

            {currentCard.example && (
              <div className="mt-8 rounded-2xl bg-slate-50 px-6 py-4">

                <p className="font-medium text-slate-800">
                  {currentCard.example}
                </p>

                {currentCard.example_reading && (
                  <p className="mt-1 text-sm text-slate-400">
                    {currentCard.example_reading}
                  </p>
                )}

                {currentCard.example_meaning && (
                  <p className="mt-2 text-sm text-slate-500">
                    {currentCard.example_meaning}
                  </p>
                )}

              </div>
            )}
          </>

        )}

      </button>

      {/* ACTION */}

      {flipped ? (

        <div className="mt-6 grid grid-cols-2 gap-4">

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              answerCard(false)
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3.5 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />

            {saving
              ? t('Đang lưu...')
              : t('Chưa nhớ')}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              answerCard(true)
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />

            {saving
              ? t('Đang lưu...')
              : t('Nhớ')}
          </button>

        </div>

      ) : (

        <p className="mt-6 text-center text-sm text-slate-400">
          {t('Lật thẻ để đánh giá kết quả.')}
        </p>

      )}

    </div>
  )
}

function ResultBox({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">

      <p className="text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {label}
      </p>

    </div>
  )
}