import { useToastState } from '../components/ui/Notify'
import {
  Check,
  LogOut,
  Mail,
  Save,
  User,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

export default function ProfilePage() {
  const t = useT()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const [error, setError] = useToastState('error')
  const [success, setSuccess] = useToastState('success')

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  async function loadProfile() {
    setLoading(true)
    setError('')

    try {
      const {
        data,
        error: queryError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          display_name,
          avatar_url,
          role,
          preferred_language_id,
          created_at,
          updated_at
        `)
        .eq('id', user.id)
        .single()

      if (queryError) {
        throw queryError
      }

      setProfile(data)
      setDisplayName(data.display_name ?? '')
    } catch (loadError) {
      console.error('Load profile error:', loadError)

      setError(
        loadError?.message ||
          t('Không thể tải thông tin hồ sơ.'),
      )
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile(event) {
    event.preventDefault()

    if (saving) return

    const cleanName = displayName.trim()

    if (!cleanName) {
      setError(t('Tên hiển thị không được để trống.'))
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          display_name: cleanName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select(`
          id,
          email,
          display_name,
          avatar_url,
          role,
          preferred_language_id,
          created_at,
          updated_at
        `)
        .single()

      if (updateError) {
        throw updateError
      }

      setProfile(data)
      setDisplayName(data.display_name ?? '')
      setSuccess(t('Đã lưu thay đổi.'))
    } catch (saveError) {
      console.error('Save profile error:', saveError)

      setError(
        saveError?.message ||
          t('Không thể cập nhật hồ sơ.'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)
    setError('')

    const {
      error: logoutError,
    } = await supabase.auth.signOut()

    if (logoutError) {
      console.error(logoutError)
      setError(logoutError.message)
      setLoggingOut(false)
      return
    }

    navigate('/login', {
      replace: true,
    })
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {t('Đang tải hồ sơ...')}
      </p>
    )
  }

  if (error && !profile) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600">
        {error}
      </div>
    )
  }

  const initial =
    (
      profile?.display_name ||
      profile?.email ||
      'U'
    )
      .charAt(0)
      .toUpperCase()

  return (
    <div className="w-full">

      {/* HEADER */}

      <div>
        <p className="text-sm font-semibold text-indigo-600">
          {t('Tài khoản')}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {t('Hồ sơ')}
        </h1>

        <p className="mt-2 text-slate-500">
          {t('Quản lý thông tin tài khoản của bạn.')}
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">

        {/* PROFILE CARD */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={t('Avatar')}
              className="mx-auto h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-600">
              {initial}
            </div>
          )}

          <div className="mt-5 text-center">

            <h2 className="text-xl font-bold text-slate-900">
              {profile?.display_name || t('Người học')}
            </h2>

            <p className="mt-1 break-all text-sm text-slate-500">
              {profile?.email || user?.email}
            </p>

          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">

            <div className="flex items-center justify-between">

              <span className="text-sm text-slate-500">
                {t('Vai trò')}
              </span>

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                {profile?.role === 'learner'
                  ? t('Người học')
                  : profile?.role || t('Người học')}
              </span>

            </div>

          </div>

        </div>

        {/* EDIT PROFILE */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-bold text-slate-900">
            {t('Thông tin cá nhân')}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {t('Cập nhật thông tin hiển thị trên 日本語.')}
          </p>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <Check size={17} />
              {success}
            </div>
          )}

          <form
            onSubmit={saveProfile}
            className="mt-6"
          >

            <label className="block">

              <span className="text-sm font-semibold text-slate-700">
                {t('Tên hiển thị')}
              </span>

              <div className="relative mt-2">

                <User
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                    setSuccess('')
                  }}
                  placeholder={t('Tên của bạn')}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />

              </div>

            </label>

            <label className="mt-5 block">

              <span className="text-sm font-semibold text-slate-700">
                Email
              </span>

              <div className="relative mt-2">

                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={profile?.email || user?.email || ''}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-500"
                />

              </div>

              <p className="mt-2 text-xs text-slate-400">
                {t('Email đăng nhập hiện chưa chỉnh sửa tại đây.')}
              </p>

            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />

              {saving
                ? t('Đang lưu...')
                : t('Lưu thay đổi')}
            </button>

          </form>

          {/* LOGOUT */}

          <div className="mt-8 border-t border-slate-100 pt-6">

            <h3 className="font-bold text-slate-900">
              {t('Đăng xuất')}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {t('Kết thúc phiên đăng nhập hiện tại.')}
            </p>

            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut size={17} />

              {loggingOut
                ? t('Đang đăng xuất...')
                : t('Đăng xuất')}
            </button>

          </div>

        </div>

      </div>

    </div>
  )
}