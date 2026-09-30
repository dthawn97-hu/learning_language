import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import { uiLangOf } from '../i18n'
import { useAuth } from './AuthContext'

const LanguageContext = createContext(null)
const KEY = 'active_language'

export function LanguageProvider({ children }) {
  const { user } = useAuth()
  const [languages, setLanguages] = useState([])
  const [activeId, setActive] = useState(() => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  })
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('languages')
      .select('id, code, name')
      .order('name')
    if (error) console.error(error)
    setLanguages(data ?? [])
    setReady(true)
  }, [])

  useEffect(() => {
    if (user) reload()
  }, [user, reload])

  const setActiveId = (id) => {
    setActive(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* không lưu được thì thôi, chỉ mất lựa chọn khi F5 */
    }
  }

  // mặc định: ngôn ngữ đã chọn -> tiếng Nhật -> ngôn ngữ đầu tiên
  const active =
    languages.find((l) => l.id === activeId) ??
    languages.find((l) => l.code === 'ja') ??
    languages[0] ??
    null

  // ngôn ngữ giao diện theo ngôn ngữ đang học (en -> tiếng Anh, còn lại -> tiếng Việt)
  const uiLang = uiLangOf(active?.code)

  useEffect(() => {
    document.documentElement.lang = uiLang
  }, [uiLang])

  return (
    <LanguageContext.Provider
      value={{ languages, active, uiLang, ready, setActiveId, reload }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
