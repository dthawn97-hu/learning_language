import { useMemo } from 'react'

import { useLanguage } from '../contexts/LanguageContext'
import core from './en.core'
import auth from './en.auth'
import learn from './en.learn'
import study from './en.study'
import enLesson from './en.lesson'

// Khóa = chính câu tiếng Việt trong code. Chưa có bản dịch thì hiện nguyên tiếng Việt.
// ponytail: chỉ có vi + en; thêm ngôn ngữ giao diện khác = thêm một dict và một dòng trong UI_DICTS.
const en = { ...core, ...auth, ...learn, ...study, ...enLesson }
const UI_DICTS = { en }

export const uiLangOf = (code) => (code in UI_DICTS ? code : 'vi')

/** const t = useT(); t('Trang chủ'); t('Xóa "{name}"?', { name }) */
export function useT() {
  const { uiLang } = useLanguage()

  return useMemo(() => {
    const dict = UI_DICTS[uiLang]
    return (text, vars) => {
      let out = dict?.[text] ?? text
      if (vars) {
        for (const k in vars) out = out.replaceAll(`{${k}}`, vars[k])
      }
      return out
    }
  }, [uiLang])
}

const LOCALES = { en: 'en-US', ja: 'ja-JP' }
export const localeOf = (uiLang) => LOCALES[uiLang] ?? 'vi-VN'
