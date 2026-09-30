import { useToastState } from '../components/ui/Notify'
import {
  ArrowLeft,
  Check,
  X,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import {
  Link,
  useParams,
} from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

export default function ReviewStudyPage() {
  const { learningSetId } = useParams()
  const { user } = useAuth()
  const t = useT()

  const [title, setTitle] = useState('')
  const [cards, setCards] = useState([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [saving, setSaving] = useState(false)

  const [rememberedCount, setRememberedCount] =
    useState(0)

  const [finished, setFinished] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useToastState('error')

  useEffect(() => {
    if (!user || !learningSetId) {
      return
    }

    loadReview()
  }, [user, learningSetId])

  async function loadReview() {
    setLoading(true)
    setError('')

    try {
      // 1. Lấy thông tin bộ học
      const {
        data: learningSet,
        error: learningSetError,
      } = await supabase
        .from('learning_sets')
        .select(`
          id,
          title
        `)
        .eq('id', learningSetId)
        .single()

      if (learningSetError) {
        throw learningSetError
      }

      setTitle(learningSet.title)

      // 2. Lấy các progress "Chưa nhớ" của user
      const {
        data: progressData,
        error: progressError,
      } = await supabase
        .from('user_item_progress')
        .select(`
          learning_item_id
        `)
        .eq('user_id', user.id)
        .eq('content_type', 'learning_item')
        .eq('mastery_status', 'not_remembered')

      if (progressError) {
        throw progressError
      }

      // 3. Lấy danh sách learning_item_id
      const itemIds = [
        ...new Set(
          (progressData ?? [])
            .map((row) => row.learning_item_id)
            .filter(Boolean),
        ),
      ]

      // {t('Không còn nội dung cần ôn')}
      if (itemIds.length === 0) {
        setCards([])
        return
      }

      // 4. Chỉ lấy item thuộc đúng bộ học hiện tại
      const {
        data: reviewItems,
        error: itemsError,
      } = await supabase
        .from('learning_items')
        .select(`
          id,
          learning_set_id,
          prompt,
          answer,
          reading,
          meaning,
          example,
          example_reading,
          example_meaning,
          sort_order
        `)
        .eq('learning_set_id', learningSetId)
        .in('id', itemIds)
        .order('sort_order', {
          ascending: true,
        })

      if (itemsError) {
        throw itemsError
      }

      setCards(reviewItems ?? [])
      setCurrentIndex(0)
      setFlipped(false)
      setFinished(false)
      setRememberedCount(0)
    } catch (loadError) {
      console.error(
        'Load review error:',
        loadError,
      )

      setError(
        loadError?.message ||
          t('Không thể tải nội dung ôn tập.'),
      )
    } finally {
      // QUAN TRỌNG:
      // Dù success, không có card, hay error
      // đều phải thoát loading.
      setLoading(false)
    }
  }

  async function answerCard(remembered) {
    if (!user || saving) {
      return
    }

    const card = cards[currentIndex]

    if (!card) {
      return
    }

    setSaving(true)
    setError('')

    try {
      // 1. Lấy progress hiện tại
      const {
        data: progress,
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
        .eq('learning_item_id', card.id)
        .maybeSingle()

      if (findError) {
        throw findError
      }

      if (!progress) {
        throw new Error(
          t('Không tìm thấy tiến độ của nội dung này.'),
        )
      }

      // 2. Update progress
      const {
        error: updateError,
      } = await supabase
        .from('user_item_progress')
        .update({
          mastery_status:
            remembered
              ? 'remembered'
              : 'not_remembered',

          correct_count:
            (progress.correct_count ?? 0) +
            (remembered ? 1 : 0),

          wrong_count:
            (progress.wrong_count ?? 0) +
            (remembered ? 0 : 1),

          review_count:
            (progress.review_count ?? 0) + 1,

          last_reviewed_at:
            new Date().toISOString(),
        })
        .eq('id', progress.id)
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      if (remembered) {
        setRememberedCount(
          (current) => current + 1,
        )
      }

      // 3. Card cuối
      if (currentIndex >= cards.length - 1) {
        setFinished(true)
        return
      }

      // 4. Sang card tiếp theo
      setCurrentIndex(
        (current) => current + 1,
      )

      setFlipped(false)
    } catch (saveError) {
      console.error(
        'Save review error:',
        saveError,
      )

      setError(
        saveError?.message ||
          t('Không thể lưu kết quả ôn tập.'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang chuẩn bị phiên ôn tập...')}
      </p>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl">

        <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600">
          {error}
        </div>

        <Link
          to="/review"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={17} />
          {t('Quay về Ôn tập')}
        </Link>

      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="max-w-2xl">

        <Link
          to="/review"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={17} />
          {t('Ôn tập')}
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={26} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            {t('Không còn nội dung cần ôn')}
          </h1>

          <p className="mt-2 text-slate-500">
            {t('Bạn đã nhớ toàn bộ nội dung trong bộ học này.')}
          </p>

        </div>

      </div>
    )
  }

  if (finished) {
    return (
      <div className="max-w-2xl">

        <div className="rounded-3xl border border-slate-200 bg-white p-9 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={25} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            {t('Hoàn thành ôn tập')}
          </h1>

          <p className="mt-2 text-slate-500">
            {t('Bạn vừa ôn {n} nội dung.', { n: cards.length })}
          </p>

          <div className="mt-7 rounded-2xl bg-slate-50 p-5">

            <p className="text-sm text-slate-500">
              {t('Đã chuyển sang Nhớ')}
            </p>

            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {rememberedCount}
            </p>

          </div>

          <Link
            to="/review"
            className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            {t('Quay về Ôn tập')}
          </Link>

        </div>

      </div>
    )
  }

  const card = cards[currentIndex]

  const progress =
    ((currentIndex + 1) /
      cards.length) *
    100

  return (
    <div className="max-w-3xl">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <Link
          to="/review"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={17} />
          {t('Ôn tập')}
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

      {/* TITLE */}

      <div className="mt-8 text-center">

        <p className="text-sm font-semibold text-indigo-600">
          {title}
        </p>

      </div>

      {/* CARD */}

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          setFlipped(
            (current) => !current,
          )
        }
        className="mt-5 flex min-h-[390px] w-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 text-center shadow-sm transition hover:shadow-md disabled:cursor-default"
      >

        {!flipped ? (

          <>
            <p className="text-4xl font-bold sm:text-5xl text-slate-900">
              {card.prompt}
            </p>

            <p className="mt-8 text-sm text-slate-400">
              {t('Nhấn để xem đáp án')}
            </p>
          </>

        ) : (

          <>
            <p className="text-3xl font-bold text-slate-900">
              {card.prompt}
            </p>

            {card.reading && (
              <p className="mt-3 text-xl text-slate-500">
                {card.reading}
              </p>
            )}

            <div className="my-6 h-px w-20 bg-slate-200" />

            <p className="text-2xl font-bold text-indigo-600">
              {card.answer}
            </p>

            {card.meaning && (
              <p className="mt-2 text-slate-500">
                {card.meaning}
              </p>
            )}

            {card.example && (
              <div className="mt-8 rounded-2xl bg-slate-50 px-6 py-4">

                <p className="font-medium text-slate-800">
                  {card.example}
                </p>

                {card.example_reading && (
                  <p className="mt-1 text-sm text-slate-400">
                    {card.example_reading}
                  </p>
                )}

                {card.example_meaning && (
                  <p className="mt-2 text-sm text-slate-500">
                    {card.example_meaning}
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