import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../i18n'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const t = useT()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          {t('Đang tải...')}
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}