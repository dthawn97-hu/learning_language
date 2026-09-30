import { useToastState } from '../components/ui/Notify'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  X,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

function shuffle(array) {
  const result = [...array]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

      ;[result[i], result[j]] = [
        result[j],
        result[i],
      ]
  }

  return result
}

function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default function QuizStudyPage() {
  const { learningSetId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const t = useT()

  const requestedType =
    searchParams.get('type') || 'multiple_choice'

  const requestedCount =
    Number(searchParams.get('count')) || 10

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState([])

  const [currentIndex, setCurrentIndex] =
    useState(0)

  const [selectedAnswer, setSelectedAnswer] =
    useState('')

  const [typingAnswer, setTypingAnswer] =
    useState('')

  const [answered, setAnswered] =
    useState(false)

  const [currentCorrect, setCurrentCorrect] =
    useState(false)

  const [results, setResults] =
    useState([])

  const [attemptId, setAttemptId] =
    useState(null)

  const [finished, setFinished] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] = useToastState('error')

  useEffect(() => {
    if (user && learningSetId) {
      prepareQuiz()
    }
  }, [user, learningSetId])

  async function prepareQuiz() {
    setLoading(true)
    setError('')

    try {
      // 1. Load learning set + items
      const {
        data: learningSet,
        error: setError,
      } = await supabase
        .from('learning_sets')
        .select(`
          id,
          title,

          learning_items (
            id,
            prompt,
            answer,
            reading,
            meaning,
            sort_order
          )
        `)
        .eq('id', learningSetId)
        .single()

      if (setError) {
        throw setError
      }

      const allItems =
        learningSet.learning_items ?? []

      if (!allItems.length) {
        throw new Error(
          t('Bộ học này chưa có nội dung để kiểm tra.'),
        )
      }

      const uniqueAnswers = [
        ...new Set(
          allItems
            .map((item) =>
              String(item.answer ?? '').trim(),
            )
            .filter(Boolean),
        ),
      ]

      const canUseMultipleChoice =
        uniqueAnswers.length >= 4

      if (
        (requestedType === 'multiple_choice' ||
          requestedType === 'mixed') &&
        !canUseMultipleChoice
      ) {
        throw new Error(
          t('Bộ học cần ít nhất 4 đáp án khác nhau để tạo câu hỏi trắc nghiệm.'),
        )
      }

      setTitle(learningSet.title)

      // 2. Random các câu hỏi
      const selectedItems =
        shuffle(allItems).slice(
          0,
          Math.min(
            requestedCount,
            allItems.length,
          ),
        )

      // 3. Sinh question type
      const preparedQuestions =
        selectedItems.map(
          (item, index) => {
            let questionType =
              requestedType

            if (requestedType === 'mixed') {
              questionType =
                index % 2 === 0
                  ? 'multiple_choice'
                  : 'typing'
            }

            let options = []

            if (
              questionType ===
              'multiple_choice'
            ) {
              const wrongAnswers = shuffle(
                [
                  ...new Map(
                    allItems
                      .filter(
                        (other) =>
                          other.id !== item.id &&
                          other.answer &&
                          normalizeAnswer(
                            other.answer,
                          ) !==
                          normalizeAnswer(
                            item.answer,
                          ),
                      )
                      .map((other) => [
                        normalizeAnswer(
                          other.answer,
                        ),
                        other.answer,
                      ]),
                  ).values(),
                ],
              ).slice(0, 3)
              if (wrongAnswers.length < 3) {
                throw new Error(
                  t('Không đủ đáp án khác nhau để tạo câu hỏi trắc nghiệm.'),
                )
              }

              options = shuffle([
                item.answer,
                ...wrongAnswers,
              ])
            }

            return {
              ...item,
              questionType,
              options,
            }
          },
        )

      // 4. Tạo attempt
      const {
        data: attempt,
        error: attemptError,
      } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          learning_set_id:
            learningSetId,

          question_type:
            requestedType,

          total_questions:
            preparedQuestions.length,

          correct_answers: 0,
          wrong_answers: 0,
          score: 0,
        })
        .select('id')
        .single()

      if (attemptError) {
        throw attemptError
      }

      setAttemptId(attempt.id)
      setQuestions(preparedQuestions)
    } catch (loadError) {
      console.error(
        'Prepare quiz error:',
        loadError,
      )

      setError(
        loadError?.message ||
        t('Không thể tạo bài kiểm tra.'),
      )
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer() {
    if (answered || saving) {
      return
    }

    const question =
      questions[currentIndex]

    if (!question) return

    const userAnswer =
      question.questionType ===
        'multiple_choice'
        ? selectedAnswer
        : typingAnswer

    if (!userAnswer.trim()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const isCorrect =
        normalizeAnswer(userAnswer) ===
        normalizeAnswer(question.answer)

      // 1. Lưu câu trả lời
      const {
        error: answerError,
      } = await supabase
        .from('quiz_answers')
        .insert({
          attempt_id: attemptId,

          learning_item_id:
            question.id,

          question_type:
            question.questionType,

          user_answer:
            userAnswer,

          correct_answer:
            question.answer,

          is_correct:
            isCorrect,
        })

      if (answerError) {
        throw answerError
      }

      // 2. Cập nhật progress
      await updateItemProgress(
        question.id,
        isCorrect,
      )

      // 3. Local result
      const result = {
        learningItemId:
          question.id,

        prompt:
          question.prompt,

        userAnswer,

        correctAnswer:
          question.answer,

        isCorrect,
      }

      setResults(
        (current) => [
          ...current,
          result,
        ],
      )

      setCurrentCorrect(isCorrect)
      setAnswered(true)
    } catch (submitError) {
      console.error(
        'Submit answer error:',
        submitError,
      )

      setError(
        submitError?.message ||
        t('Không thể lưu câu trả lời.'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateItemProgress(
    learningItemId,
    isCorrect,
  ) {
    const {
      data: existing,
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
      .eq(
        'content_type',
        'learning_item',
      )
      .eq(
        'learning_item_id',
        learningItemId,
      )
      .maybeSingle()

    if (findError) {
      throw findError
    }

    const now =
      new Date().toISOString()

    if (existing) {
      const {
        error: updateError,
      } = await supabase
        .from('user_item_progress')
        .update({
          mastery_status:
            isCorrect
              ? 'remembered'
              : 'not_remembered',

          correct_count:
            (existing.correct_count ?? 0) +
            (isCorrect ? 1 : 0),

          wrong_count:
            (existing.wrong_count ?? 0) +
            (isCorrect ? 0 : 1),

          review_count:
            (existing.review_count ?? 0) +
            1,

          last_reviewed_at: now,
        })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return
    }

    const {
      error: insertError,
    } = await supabase
      .from('user_item_progress')
      .insert({
        user_id: user.id,

        content_type:
          'learning_item',

        learning_item_id:
          learningItemId,

        mastery_status:
          isCorrect
            ? 'remembered'
            : 'not_remembered',

        correct_count:
          isCorrect ? 1 : 0,

        wrong_count:
          isCorrect ? 0 : 1,

        review_count: 1,

        last_reviewed_at: now,
      })

    if (insertError) {
      throw insertError
    }
  }

  async function nextQuestion() {
    if (!answered || saving) {
      return
    }

    // Câu cuối
    if (
      currentIndex >=
      questions.length - 1
    ) {
      await finishQuiz()
      return
    }

    setCurrentIndex(
      (current) => current + 1,
    )

    setSelectedAnswer('')
    setTypingAnswer('')
    setAnswered(false)
    setCurrentCorrect(false)
  }

  async function finishQuiz() {
    setSaving(true)
    setError('')

    try {
      const correct =
        results.filter(
          (result) =>
            result.isCorrect,
        ).length

      const total =
        results.length

      const wrong =
        total - correct

      const score =
        total > 0
          ? Number(
            (
              (correct / total) *
              100
            ).toFixed(2),
          )
          : 0

      const {
        error: updateError,
      } = await supabase
        .from('quiz_attempts')
        .update({
          correct_answers:
            correct,

          wrong_answers:
            wrong,

          score,

          completed_at:
            new Date().toISOString(),
        })
        .eq('id', attemptId)
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      setFinished(true)
    } catch (finishError) {
      console.error(
        'Finish quiz error:',
        finishError,
      )

      setError(
        finishError?.message ||
        t('Không thể hoàn thành bài kiểm tra.'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang tạo bài kiểm tra...')}
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
          to="/quiz"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={17} />
          {t('Quay về Kiểm tra')}
        </Link>

      </div>
    )
  }

  if (!questions.length) {
    return null
  }

  if (finished) {
    const correct =
      results.filter(
        (result) =>
          result.isCorrect,
      ).length

    const total =
      results.length

    const wrong =
      total - correct

    const percentage =
      total > 0
        ? Math.round(
          (correct / total) * 100,
        )
        : 0

    return (
      <div className="max-w-3xl">

        <div className="rounded-3xl border border-slate-200 bg-white p-8">

          <div className="text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={26} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              {t('Hoàn thành kiểm tra')}
            </h1>

            <p className="mt-2 text-slate-500">
              {title}
            </p>

          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <ResultBox
              label={t('Điểm')}
              value={`${percentage}%`}
            />

            <ResultBox
              label={t('Đúng')}
              value={correct}
            />

            <ResultBox
              label={t('Sai')}
              value={wrong}
            />

          </div>

          {wrong > 0 && (
            <div className="mt-8">

              <h2 className="font-bold text-slate-900">
                {t('Câu cần xem lại')}
              </h2>

              <div className="mt-4 space-y-3">

                {results
                  .filter(
                    (result) =>
                      !result.isCorrect,
                  )
                  .map(
                    (
                      result,
                      index,
                    ) => (
                      <div
                        key={
                          result.learningItemId
                        }
                        className="rounded-2xl bg-red-50 p-4"
                      >

                        <p className="text-sm font-semibold text-slate-900">
                          {index + 1}.{' '}
                          {result.prompt}
                        </p>

                        <p className="mt-2 text-sm text-red-600">
                          {t('Bạn trả lời:')}{' '}
                          {result.userAnswer}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-emerald-600">
                          {t('Đáp án:')}{' '}
                          {
                            result.correctAnswer
                          }
                        </p>

                      </div>
                    ),
                  )}

              </div>

            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">

            <Link
              to={`/quiz/${learningSetId}`}
              className="rounded-xl border border-slate-200 px-5 py-3 text-center font-semibold text-slate-700"
            >
              {t('Kiểm tra lại')}
            </Link>

            <Link
              to="/review"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white"
            >
              {t('Ôn các câu chưa nhớ')}
            </Link>

          </div>

        </div>

      </div>
    )
  }

  const question =
    questions[currentIndex]

  const progress =
    ((currentIndex + 1) /
      questions.length) *
    100

  return (
    <div className="max-w-3xl">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <Link
          to={`/quiz/${learningSetId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={17} />
          {t('Thoát')}
        </Link>

        <p className="text-sm font-semibold text-slate-500">
          {currentIndex + 1} /{' '}
          {questions.length}
        </p>

      </div>

      {/* PROGRESS */}

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      {/* QUESTION */}

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">

        <p className="text-sm font-semibold text-indigo-600">
          {question.questionType ===
            'multiple_choice'
            ? t('Chọn đáp án đúng')
            : t('Nhập đáp án')}
        </p>

        <h1 className="mt-5 text-center text-3xl sm:text-4xl font-bold text-slate-900">
          {question.prompt}
        </h1>

        {question.reading && (
          <p className="mt-3 text-center text-lg text-slate-400">
            {question.reading}
          </p>
        )}

        {/* MULTIPLE CHOICE */}

        {question.questionType ===
          'multiple_choice' && (

            <div className="mt-8 grid gap-3">

              {question.options.map(
                (option, index) => {

                  const selected =
                    selectedAnswer ===
                    option

                  const correctOption =
                    answered &&
                    normalizeAnswer(
                      option,
                    ) ===
                    normalizeAnswer(
                      question.answer,
                    )

                  const wrongSelected =
                    answered &&
                    selected &&
                    !correctOption

                  return (
                    <button
                      key={`${option}-${index}`}
                      type="button"
                      disabled={answered}
                      onClick={() =>
                        setSelectedAnswer(
                          option,
                        )
                      }
                      className={`
                      flex items-center gap-4 rounded-2xl border p-4 text-left transition
                      ${correctOption
                          ? 'border-emerald-400 bg-emerald-50'
                          : wrongSelected
                            ? 'border-red-400 bg-red-50'
                            : selected
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-slate-200 hover:border-indigo-200'
                        }
                    `}
                    >

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                        {
                          ['A', 'B', 'C', 'D'][
                          index
                          ]
                        }
                      </div>

                      <span className="font-medium text-slate-800">
                        {option}
                      </span>

                    </button>
                  )
                },
              )}

            </div>
          )}

        {/* TYPING */}

        {question.questionType ===
          'typing' && (

            <div className="mt-8">

              <input
                type="text"
                value={typingAnswer}
                disabled={answered}
                onChange={(event) =>
                  setTypingAnswer(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter' &&
                    !answered
                  ) {
                    submitAnswer()
                  }
                }}
                placeholder={t('Nhập đáp án...')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />

              {answered && (
                <div
                  className={`
                  mt-4 rounded-xl p-4 text-sm
                  ${currentCorrect
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                    }
                `}
                >

                  {currentCorrect ? (
                    <p className="font-semibold">
                      {t('Chính xác!')}
                    </p>
                  ) : (
                    <>
                      <p className="font-semibold">
                        {t('Chưa chính xác.')}
                      </p>

                      <p className="mt-1">
                        {t('Đáp án đúng:')}{' '}
                        <strong>
                          {question.answer}
                        </strong>
                      </p>
                    </>
                  )}

                </div>
              )}

            </div>
          )}

      </div>

      {/* ACTION */}

      {!answered ? (

        <button
          type="button"
          disabled={
            saving ||
            !(
              question.questionType ===
                'multiple_choice'
                ? selectedAnswer
                : typingAnswer.trim()
            )
          }
          onClick={submitAnswer}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? t('Đang lưu...')
            : t('Kiểm tra đáp án')}
        </button>

      ) : (

        <button
          type="button"
          disabled={saving}
          onClick={nextQuestion}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >

          {currentIndex >=
            questions.length - 1
            ? t('Xem kết quả')
            : t('Câu tiếp theo')}

          <ChevronRight size={18} />

        </button>

      )}

      {answered &&
        question.questionType ===
        'multiple_choice' && (

          <div
            className={`
            mt-4 rounded-xl p-4 text-center text-sm font-semibold
            ${currentCorrect
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
              }
          `}
          >

            {currentCorrect ? (
              <>
                <Check
                  size={17}
                  className="mr-1 inline"
                />
                {t('Chính xác!')}
              </>
            ) : (
              <>
                <X
                  size={17}
                  className="mr-1 inline"
                />
                {t('Chưa chính xác. Đáp án đúng: {answer}', { answer: question.answer })}
              </>
            )}

          </div>

        )}

    </div>
  )
}

function ResultBox({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">

      <p className="text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {label}
      </p>

    </div>
  )
}