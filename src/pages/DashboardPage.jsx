import { useToastState } from '../components/ui/Notify'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  RotateCcw,
  Trophy,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

export default function DashboardPage() {
  const t = useT()
  const { user } = useAuth()

  const [stats, setStats] = useState({
    totalSets: 0,
    totalItems: 0,
    remembered: 0,
    notRemembered: 0,
    quizCount: 0,
    latestScore: null,
  })

  const [recentSets, setRecentSets] = useState([])
  const [latestQuiz, setLatestQuiz] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useToastState('error')

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      /*
       * 1. Lấy các bộ học của user.
       *
       * learning_sets dùng owner_id,
       * không phải user_id.
       */
      const {
        data: setsData,
        error: setsError,
      } = await supabase
        .from('learning_sets')
        .select(`
          id,
          title,
          description,
          created_at,
          updated_at,

          learning_items (
            id
          )
        `)
        .eq('owner_id', user.id)
        .order('updated_at', {
          ascending: false,
        })

      if (setsError) {
        throw setsError
      }

      const sets = setsData ?? []

      /*
       * 2. Gom toàn bộ learning_item_id
       * thuộc các bộ học của user.
       */
      const itemIds = sets.flatMap(
        (set) =>
          (set.learning_items ?? []).map(
            (item) => item.id,
          ),
      )

      /*
       * 3. Lấy progress.
       */
      let progressData = []

      if (itemIds.length > 0) {
        const {
          data,
          error: progressError,
        } = await supabase
          .from('user_item_progress')
          .select(`
            learning_item_id,
            mastery_status
          `)
          .eq('user_id', user.id)
          .eq(
            'content_type',
            'learning_item',
          )
          .in(
            'learning_item_id',
            itemIds,
          )

        if (progressError) {
          throw progressError
        }

        progressData = data ?? []
      }

      /*
       * 4. Quiz đã hoàn thành.
       */
      const {
        data: quizData,
        error: quizError,
      } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          learning_set_id,
          question_type,
          total_questions,
          correct_answers,
          wrong_answers,
          score,
          completed_at,
          created_at
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', {
          ascending: false,
        })

      if (quizError) {
        throw quizError
      }

      const quizzes = quizData ?? []

      /*
       * 5. Tính thống kê.
       */
      const remembered =
        progressData.filter(
          (row) =>
            row.mastery_status ===
            'remembered',
        ).length

      const notRemembered =
        progressData.filter(
          (row) =>
            row.mastery_status ===
            'not_remembered',
        ).length

      setStats({
        totalSets: sets.length,

        totalItems:
          itemIds.length,

        remembered,

        notRemembered,

        quizCount:
          quizzes.length,

        latestScore:
          quizzes.length > 0
            ? Number(quizzes[0].score)
            : null,
      })

      /*
       * 6. Chỉ lấy 3 bộ học gần nhất.
       */
      setRecentSets(
        sets.slice(0, 3),
      )

      /*
       * 7. Quiz gần nhất.
       */
      setLatestQuiz(
        quizzes.length > 0
          ? quizzes[0]
          : null,
      )
    } catch (loadError) {
      console.error(
        'Dashboard error:',
        loadError,
      )

      setError(
        loadError?.message ||
          t('Không thể tải Dashboard.'),
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang tải tổng quan...')}
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

  const memoryRate =
    stats.totalItems > 0
      ? Math.round(
          (stats.remembered /
            stats.totalItems) *
            100,
        )
      : 0

  return (
    <div className="w-full">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

        <div>

          <p className="text-sm font-semibold text-indigo-600">
            {t('Tổng quan')}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {t('Chào mừng trở lại!')}
          </h1>

          <p className="mt-2 text-slate-500">
            {t('Tiếp tục hành trình học ngôn ngữ của bạn.')}
          </p>

        </div>

        <Link
          to="/learn"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <BookOpen size={17} />
          {t('Tiếp tục học')}
        </Link>

      </div>

      {/* MAIN STATS */}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={Layers3}
          label={t('Bộ học')}
          value={stats.totalSets}
          description={t('Bộ học của bạn')}
        />

        <StatCard
          icon={BookOpen}
          label={t('Nội dung')}
          value={stats.totalItems}
          description={t('Tổng nội dung đã tạo')}
        />

        <StatCard
          icon={CheckCircle2}
          label={t('Đã nhớ')}
          value={stats.remembered}
          description={t('{n}% tổng nội dung', { n: memoryRate })}
        />

        <StatCard
          icon={Brain}
          label={t('Chưa nhớ')}
          value={stats.notRemembered}
          description={t('Cần tiếp tục ôn tập')}
        />

      </div>

      {/* MEMORY PROGRESS */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">

        <div className="flex items-center justify-between gap-4">

          <div>

            <h2 className="font-bold text-slate-900">
              {t('Tiến độ ghi nhớ')}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t('Tỷ lệ nội dung hiện được đánh dấu là Nhớ.')}
            </p>

          </div>

          <p className="text-2xl font-bold text-indigo-600">
            {memoryRate}%
          </p>

        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">

          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{
              width: `${memoryRate}%`,
            }}
          />

        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">

          <span className="text-emerald-600">
            {t('{n} đã nhớ', { n: stats.remembered })}
          </span>

          <span className="text-orange-600">
            {t('{n} chưa nhớ', { n: stats.notRemembered })}
          </span>

          <span className="text-slate-400">
            {t('{n} chưa học', {
              n: Math.max(
                stats.totalItems -
                  stats.remembered -
                  stats.notRemembered,
                0,
              ),
            })}
          </span>

        </div>

      </div>

      {/* TWO COLUMNS */}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* RECENT SETS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                {t('Bộ học gần đây')}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t('Tiếp tục từ nội dung của bạn.')}
              </p>

            </div>

            <Link
              to="/learn"
              className="text-sm font-semibold text-indigo-600"
            >
              {t('Xem tất cả')}
            </Link>

          </div>

          {recentSets.length === 0 ? (

            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">

              <p className="text-sm text-slate-500">
                {t('Bạn chưa có bộ học nào.')}
              </p>

            </div>

          ) : (

            <div className="mt-5 space-y-3">

              {recentSets.map((set) => (

                <Link
                  key={set.id}
                  to={`/learn/${set.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                >

                  <div>

                    <p className="font-semibold text-slate-900">
                      {set.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {t('{n} nội dung', {
                        n: set.learning_items?.length ?? 0,
                      })}
                    </p>

                  </div>

                  <ArrowRight
                    size={17}
                    className="text-slate-300"
                  />

                </Link>

              ))}

            </div>

          )}

        </div>

        {/* QUIZ */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          <div>

            <h2 className="font-bold text-slate-900">
              {t('Kiểm tra')}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t('Kết quả kiểm tra gần nhất.')}
            </p>

          </div>

          {latestQuiz ? (

            <div className="mt-6">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Trophy size={21} />
                </div>

                <div>

                  <p className="text-3xl font-bold text-slate-900">
                    {Math.round(
                      Number(
                        latestQuiz.score,
                      ),
                    )}
                    %
                  </p>

                  <p className="text-sm text-slate-500">
                    {t('{correct}/{total} câu đúng', {
                      correct: latestQuiz.correct_answers,
                      total: latestQuiz.total_questions,
                    })}
                  </p>

                </div>

              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">

                <MiniStat
                  label={t('Đã làm')}
                  value={t('{n} bài', { n: stats.quizCount })}
                />

                <MiniStat
                  label={t('Sai')}
                  value={
                    latestQuiz.wrong_answers
                  }
                />

              </div>

              <Link
                to="/quiz"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <ClipboardCheck size={17} />
                {t('Làm bài kiểm tra')}
              </Link>

            </div>

          ) : (

            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">

              <ClipboardCheck
                size={24}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-sm text-slate-500">
                {t('Bạn chưa làm bài kiểm tra nào.')}
              </p>

              <Link
                to="/quiz"
                className="mt-4 inline-flex text-sm font-semibold text-indigo-600"
              >
                {t('Bắt đầu kiểm tra')}
              </Link>

            </div>

          )}

        </div>

      </div>

      {/* QUICK ACTIONS */}

      <div className="mt-6 grid gap-4 md:grid-cols-3">

        <QuickAction
          to="/learn"
          icon={BookOpen}
          title={t('Học')}
          description={t('Tiếp tục bộ học của bạn')}
        />

        <QuickAction
          to="/review"
          icon={RotateCcw}
          title={t('Ôn tập')}
          description={t('{n} nội dung cần ôn', { n: stats.notRemembered })}
        />

        <QuickAction
          to="/quiz"
          icon={ClipboardCheck}
          title={t('Kiểm tra')}
          description={t('Kiểm tra kiến thức đã học')}
        />

      </div>

    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  )
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>

    </div>
  )
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
    >

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">

        <p className="font-bold text-slate-900 group-hover:text-indigo-600">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>

      </div>

      <ArrowRight
        size={17}
        className="text-slate-300"
      />

    </Link>
  )
}