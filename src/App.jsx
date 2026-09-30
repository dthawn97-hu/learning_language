import { lazy, Suspense } from 'react'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LearnPage = lazy(() => import('./pages/LearnPage'))
const LevelPage = lazy(() => import('./pages/LevelPage'))
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))
const ReviewStudyPage = lazy(() => import('./pages/ReviewStudyPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const QuizSetupPage = lazy(() => import('./pages/QuizSetupPage'))
const QuizStudyPage = lazy(() => import('./pages/QuizStudyPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LanguagesPage = lazy(() => import('./pages/LanguagesPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const LearningSetPage = lazy(() => import('./pages/LearningSetPage'))
const FlashcardStudyPage = lazy(() => import('./pages/FlashcardStudyPage'))
export default function App() {
  return (
    <Suspense fallback={null}>
    <Routes>

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/learn"
          element={<LearnPage />}
        />

        <Route
          path="/learn/level/:levelId"
          element={<LevelPage />}
        />

        <Route
          path="/learn/:id"
          element={<LearningSetPage />}
        />

        <Route
          path="/lesson/:id"
          element={<LessonPage />}
        />

        <Route
          path="/flashcards"
          element={<FlashcardsPage />}
        />
        <Route
          path="/flashcards/:learningSetId"
          element={<FlashcardStudyPage />}
        />

        <Route
          path="/review"
          element={<ReviewPage />}
        />
        <Route
          path="/review/:learningSetId"
          element={<ReviewStudyPage />}
        />

        <Route
          path="/quiz"
          element={<QuizPage />}
        />
        <Route
          path="/quiz/:learningSetId"
          element={<QuizSetupPage />}
        />
        <Route
          path="/quiz/:learningSetId/start"
          element={<QuizStudyPage />}
        />
        <Route
          path="/languages"
          element={<LanguagesPage />}
        />
        <Route
          path="/profile"
          element={<ProfilePage />}
        />

      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

    </Routes>
    </Suspense>
  )
}