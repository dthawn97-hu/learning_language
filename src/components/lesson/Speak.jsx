import { Volume2 } from 'lucide-react'

import { useLanguage } from '../../contexts/LanguageContext'
import { useT } from '../../i18n'

const VOICE = {
  ja: 'ja-JP',
  en: 'en-US',
  ko: 'ko-KR',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
}

// ponytail: dùng giọng đọc có sẵn của trình duyệt (không cần file âm thanh); chất lượng tùy thiết bị.
// Muốn giọng chuẩn hơn thì lưu file audio trong Supabase Storage và phát bằng <audio>.
export default function Speak({ text }) {
  const { active } = useLanguage()
  const t = useT()

  if (!text || !active || !('speechSynthesis' in window)) return null

  function play() {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = VOICE[active.code] ?? active.code
    u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={t('Nghe phát âm')}
      title={t('Nghe phát âm')}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900"
    >
      <Volume2 size={15} />
    </button>
  )
}
