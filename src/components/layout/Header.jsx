import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Brain,
  ClipboardCheck,
  House,
  Globe,
  Layers3,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { useNotify } from '../ui/Notify'
import { useT } from '../../i18n'

import LanguageSwitcher from './LanguageSwitcher'

const navigation = [
  { name: 'Trang chủ', path: '/dashboard', icon: House },
  { name: 'Học', path: '/learn', icon: BookOpen },
  { name: 'Flashcards', path: '/flashcards', icon: Layers3 },
  { name: 'Ôn tập', path: '/review', icon: Brain },
  { name: 'Kiểm tra', path: '/quiz', icon: ClipboardCheck },
]

const linkClass = ({ isActive }) =>
  [
    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
    isActive
      ? 'bg-white/10 font-medium text-white'
      : 'text-slate-400 hover:bg-white/5 hover:text-white',
  ].join(' ')

export default function Header() {
  const { user, signOut } = useAuth()
  const { toast } = useNotify()
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const menuRef = useRef(null)

  const initial =
    user?.email?.charAt(0)?.toUpperCase() ?? 'U'

  // đóng menu khi bấm ra ngoài
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-[#0b1020]">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-8">

        <button
          type="button"
          aria-label={t('Menu')}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white md:hidden"
        >
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <NavLink
          to="/dashboard"
          className="flex shrink-0 items-center gap-2 font-semibold text-white"
        >
          <img src="/logo.png" alt="" className="h-8 w-auto" />
          <span className="hidden sm:inline">日本語</span>
        </NavLink>

        <nav className="hidden flex-1 justify-center gap-1 md:flex">
          {navigation.map(({ path, name, icon: Icon }) => (
            <NavLink key={path} to={path} className={linkClass}>
              <Icon size={16} />
              {t(name)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto md:ml-0">
          <LanguageSwitcher />
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={t('Tài khoản')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-medium text-white hover:bg-white/25"
          >
            {initial}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <p className="truncate px-3 py-2 text-xs text-slate-500">
                {user?.email}
              </p>
              <NavLink
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserRound size={16} />
                {t('Hồ sơ')}
              </NavLink>
              <NavLink
                to="/languages"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Globe size={16} />
                {t('Quản lý ngôn ngữ')}
              </NavLink>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <LogOut size={16} />
                {t('Đăng xuất')}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Mobile: menu điều hướng xổ xuống */}
      {navOpen && (
        <nav className="grid gap-1 border-t border-white/10 px-3 py-2 md:hidden">
          {navigation.map(({ path, name, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={() => setNavOpen(false)} className={linkClass}>
              <Icon size={18} />
              {t(name)}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
