import { useToastState } from '../components/ui/Notify'
import {
  ArrowLeft,
  Check,
  Keyboard,
  ListChecks,
  Shuffle,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

export default function QuizSetupPage() {
  const { learningSetId } = useParams()
  const navigate = useNavigate()
  const t = useT()

  const [learningSet, setLearningSet] = useState(null)
  const [uniqueAnswerCount, setUniqueAnswerCount] =
    useState(0)
  const [itemCount, setItemCount] = useState(0)

  const [questionType, setQuestionType] =
    useState('multiple_choice')

  const [questionCount, setQuestionCount] =
    useState(10)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useToastState('error')

  useEffect(() => {
    if (learningSetId) {
      loadLearningSet()
    }
  }, [learningSetId])

  async function loadLearningSet() {
    setLoading(true)
    setError('')

    const {
      data,
      error: queryError,
    } = await supabase
      .from('learning_sets')
      .select(`
        id,
        title,
        description,

       learning_items (
  id,
  answer
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

    const items =
      data.learning_items ?? []

    const total = items.length

    const uniqueAnswers = new Set(
      items
        .map((item) =>
          String(item.answer ?? '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    )

    const answerCount = uniqueAnswers.size

    setLearningSet(data)
    setItemCount(total)
    setUniqueAnswerCount(answerCount)

    // Không đủ 4 đáp án khác nhau:
    // tự chuyển sang dạng nhập đáp án.
    if (answerCount < 4) {
      setQuestionType('typing')
    }

    // Mặc định tối đa 10 câu,
    // nhưng không vượt quá số item hiện có.
    setQuestionCount(
      Math.min(10, total),
    )

    setLoading(false)
  }

  function startQuiz() {
    if (!itemCount) return

    const params =
      new URLSearchParams({
        type: questionType,
        count: String(questionCount),
      })

    navigate(
      `/quiz/${learningSetId}/start?${params.toString()}`,
    )
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang tải bài kiểm tra...')}
      </p>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600">
        {error}
      </div>
    )
  }
const canUseMultipleChoice =
  uniqueAnswerCount >= 4
  return (
    <div className="max-w-3xl">

      <Link
        to="/quiz"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={17} />
        {t('Kiểm tra')}
      </Link>

      <div className="mt-7">

        <p className="text-sm font-semibold text-indigo-600">
          {t('Thiết lập bài kiểm tra')}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {learningSet?.title}
        </h1>

        {learningSet?.description && (
          <p className="mt-2 text-slate-500">
            {learningSet.description}
          </p>
        )}

        <p className="mt-3 text-sm font-medium text-slate-500">
          {t('{n} nội dung có thể kiểm tra', { n: itemCount })}
        </p>

      </div>

      {/* QUESTION TYPE */}

      <div className="mt-9">

        <h2 className="text-lg font-bold text-slate-900">
          {t('Dạng câu hỏi')}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {t('Chọn cách bạn muốn làm bài kiểm tra.')}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">

          <TypeCard
            active={
              questionType ===
              'multiple_choice'
            }
            disabled={!canUseMultipleChoice}
            icon={ListChecks}
            title={t('Trắc nghiệm')}
            description={
              canUseMultipleChoice
                ? t('Chọn 1 đáp án đúng trong A, B, C, D.')
                : t('Cần ít nhất 4 đáp án khác nhau.')
            }
            onClick={() =>
              setQuestionType(
                'multiple_choice',
              )
            }
          />

          <TypeCard
            active={
              questionType === 'typing'
            }
            icon={Keyboard}
            title={t('Nhập đáp án')}
            description={t('Tự nhập câu trả lời cho từng câu.')}
            onClick={() =>
              setQuestionType('typing')
            }
          />

          <TypeCard
            active={
              questionType === 'mixed'
            }
            disabled={!canUseMultipleChoice}
            icon={Shuffle}
            title={t('Hỗn hợp')}
            description={
              canUseMultipleChoice
                ? t('Kết hợp trắc nghiệm và nhập đáp án.')
                : t('Cần ít nhất 4 đáp án khác nhau.')
            }
            onClick={() =>
              setQuestionType('mixed')
            }
          />

        </div>

      </div>

      {/* QUESTION COUNT */}

      <div className="mt-9">

        <h2 className="text-lg font-bold text-slate-900">
          {t('Số câu hỏi')}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {t('Chọn số lượng câu cho bài kiểm tra.')}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">

          {[5, 10, 20].map((count) => {

            const disabled =
              count > itemCount

            return (
              <button
                key={count}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setQuestionCount(count)
                }
                className={`
                  rounded-xl border px-5 py-3 text-sm font-semibold transition
                  ${questionCount === count
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                  }
                  ${disabled
                    ? 'cursor-not-allowed opacity-40'
                    : ''
                  }
                `}
              >
                {t('{n} câu', { n: count })}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() =>
              setQuestionCount(itemCount)
            }
            className={`
              rounded-xl border px-5 py-3 text-sm font-semibold transition
              ${questionCount === itemCount
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
              }
            `}
          >
            {t('Tất cả ({n})', { n: itemCount })}
          </button>

        </div>

      </div>

      {/* SUMMARY */}

      <div className="mt-9 rounded-2xl bg-slate-50 p-5">

        <div className="flex items-center justify-between gap-4">

          <div>

            <p className="text-sm text-slate-500">
              {t('Bài kiểm tra')}
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {t('{n} câu', { n: questionCount })} ·{' '}

              {questionType ===
                'multiple_choice'
                ? t('Trắc nghiệm')
                : questionType ===
                  'typing'
                  ? t('Nhập đáp án')
                  : t('Hỗn hợp')}
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={18} />
          </div>

        </div>

      </div>

      <button
        type="button"
        disabled={!itemCount}
        onClick={startQuiz}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('Bắt đầu kiểm tra')}
      </button>

    </div>
  )
}

function TypeCard({
  active,
  disabled = false,
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        relative rounded-2xl border p-5 text-left transition
        ${disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
          : active
            ? 'border-indigo-600 bg-indigo-50'
            : 'border-slate-200 bg-white hover:border-indigo-200'
        }
      `}
    >
      {active && !disabled && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
          <Check size={12} />
        </div>
      )}

      <div
        className={`
          flex h-10 w-10 items-center justify-center rounded-xl
          ${disabled
            ? 'bg-slate-100 text-slate-400'
            : active
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-500'
          }
        `}
      >
        <Icon size={18} />
      </div>

      <p className="mt-4 font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </button>
  )
}