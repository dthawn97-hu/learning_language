import { useEffect, useState } from 'react'

import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Admin = profiles.role === 'admin'. Quyền thật được chặn bởi RLS ở Supabase;
// hook này chỉ quyết định có hiện nút quản trị hay không.
export function useIsAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'))
  }, [user])

  return isAdmin
}
