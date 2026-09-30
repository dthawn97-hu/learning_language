import { useToastState } from '../components/ui/Notify'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

export default function RegisterPage() {
  const t = useT()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useToastState('error')
  const [message, setMessage] = useToastState('success')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (password.length < 6) {
      setError(t('Mật khẩu phải có ít nhất 6 ký tự.'))
      return
    }

    setLoading(true)

    const { data, error: signUpError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,

        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    /*
     * Nếu Supabase đang bật Confirm Email:
     * data.session sẽ null.
     *
     * Nếu Confirm Email tắt:
     * user có session ngay.
     */
    if (!data.session) {
      setMessage(
        t('Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận tài khoản.'),
      )
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <img src="/logo.png" alt="" className="mb-4 h-16 w-auto" />
          <p className="mb-2 text-sm font-semibold text-indigo-600">
            Learning Language
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            {t('Tạo tài khoản')}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {t('Bắt đầu học tiếng Nhật từ Hiragana đến N1.')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t('Tên hiển thị')}
            </label>

            <input
              type="text"
              required
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="Dthawn"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t('Mật khẩu')}
            </label>

            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder={t('Ít nhất 6 ký tự')}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? t('Đang tạo...') : t('Đăng ký')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('Đã có tài khoản?')}{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600"
          >
            {t('Đăng nhập')}
          </Link>
        </p>
      </div>
    </main>
  )
}