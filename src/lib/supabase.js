import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cache các truy vấn đọc trong 60s để mở lại trang không phải tải lại.
// Mọi thao tác ghi (POST/PATCH/DELETE/rpc) xoá toàn bộ cache nên dữ liệu không bị cũ sau khi sửa.
// ponytail: cache trong RAM, mất khi F5; muốn giữ qua F5 thì lưu vào sessionStorage.
const TTL = 60_000
const cache = new Map()

async function cachedFetch(input, init) {
  const req = new Request(input, init)
  const isData = req.url.includes('/rest/v1/')
  const readOnly = req.method === 'GET' || req.method === 'HEAD'

  if (!isData) {
    if (req.url.includes('/auth/v1/')) cache.clear()
    return fetch(req)
  }

  if (!readOnly) {
    cache.clear()
    return fetch(req)
  }

  const key = [
    req.method,
    req.url,
    req.headers.get('authorization'),
    req.headers.get('accept'),
    req.headers.get('prefer'),
  ].join('|')

  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) {
    return new Response(hit.body, hit)
  }

  const res = await fetch(req)
  if (res.ok) {
    const body = await res.clone().text()
    cache.set(key, {
      at: Date.now(),
      body: body || null,
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers],
    })
  }
  return res
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  { global: { fetch: cachedFetch } },
)
