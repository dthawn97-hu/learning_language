import { useToastState } from '../components/ui/Notify'
import { useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../i18n'

export default function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useToastState('error')
  const [loading, setLoading] = useState(false)

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <img src="/logo.png" alt="" className="mb-4 h-16 w-auto" />
          <p className="mb-2 text-sm font-semibold text-indigo-600">
            Learning Language
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            {t('Đăng nhập')}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {t('Tiếp tục hành trình học tiếng Nhật của bạn.')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {t('Mật khẩu')}
            </label>

            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('Đang đăng nhập...') : t('Đăng nhập')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('Chưa có tài khoản?')}{' '}
          <Link
            to="/register"
            className="font-semibold text-indigo-600"
          >
            {t('Đăng ký')}
          </Link>
        </p>
      </div>
    </main>
  )
}