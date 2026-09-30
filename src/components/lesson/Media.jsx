import { ExternalLink } from 'lucide-react'

import { useT } from '../../i18n'

/**
 * Tài liệu đính kèm: ảnh, PDF, video (file đã tải lên hoặc dán liên kết).
 * Loại được đoán từ đường dẫn nên chỉ cần lưu {title, url}.
 */
const IMG = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i
const PDF = /\.pdf(\?|#|$)/i
const VID = /\.(mp4|webm|mov|ogv|m4v)(\?|#|$)/i

export function mediaKind(url = '') {
  const u = url.trim()
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i)
  if (yt) return { kind: 'embed', src: `https://www.youtube.com/embed/${yt[1]}` }

  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vm) return { kind: 'embed', src: `https://player.vimeo.com/video/${vm[1]}` }

  const gd = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/i)
  if (gd) return { kind: 'embed', src: `https://drive.google.com/file/d/${gd[1]}/preview` }

  if (IMG.test(u)) return { kind: 'image', src: u }
  if (PDF.test(u)) return { kind: 'pdf', src: u }
  if (VID.test(u)) return { kind: 'video', src: u }
  return { kind: 'link', src: u }
}

function Item({ item }) {
  const t = useT()
  const { kind, src } = mediaKind(item.url)

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      {item.title && <figcaption className="mb-3 font-medium text-slate-900">{item.title}</figcaption>}

      {kind === 'image' && (
        <img src={src} alt={item.title ?? ''} loading="lazy" className="max-h-[70vh] w-auto max-w-full rounded-lg" />
      )}

      {kind === 'video' && (
        <video src={src} controls preload="metadata" className="max-h-[70vh] w-full rounded-lg bg-black" />
      )}

      {kind === 'embed' && (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={src}
            title={item.title || 'media'}
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {kind === 'pdf' && (
        <iframe src={src} title={item.title || 'pdf'} loading="lazy" className="h-[70vh] w-full rounded-lg border border-slate-200" />
      )}

      {(kind === 'link' || kind === 'pdf') && (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
        >
          <ExternalLink size={14} />
          {kind === 'pdf' ? t('Mở trong tab mới') : item.title || src}
        </a>
      )}
    </figure>
  )
}

export default function MediaView({ content }) {
  const list = Array.isArray(content) ? content.filter((m) => m?.url) : []
  return (
    <div className="space-y-4">
      {list.map((m, i) => (
        <Item key={i} item={m} />
      ))}
    </div>
  )
}
