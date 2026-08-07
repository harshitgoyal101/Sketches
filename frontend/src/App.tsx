import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/auth/AuthProvider'
import { GuestProvider } from '@/guest/GuestProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { HomePage } from '@/pages/HomePage'
import { GalleryPage } from '@/pages/GalleryPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { SketchDetailPage } from '@/pages/SketchDetailPage'
import { MakerProfilePage } from '@/pages/MakerProfilePage'
import { SavedPage } from '@/pages/SavedPage'
import { ExploreTodayPage } from '@/pages/ExploreTodayPage'
import { AccountPage } from '@/pages/AccountPage'
import { CreateSketchPage } from '@/pages/CreateSketchPage'
import { SketchSettingsPage } from '@/pages/SketchSettingsPage'
import { PasswordResetRequestPage } from '@/pages/PasswordResetRequestPage'
import { PasswordResetConfirmPage } from '@/pages/PasswordResetConfirmPage'
import { ResendVerificationPage } from '@/pages/ResendVerificationPage'

const EditSketchPage = lazy(() =>
  import('@/pages/EditSketchPage').then((m) => ({ default: m.EditSketchPage })),
)
const SandboxPage = lazy(() =>
  import('@/pages/SandboxPage').then((m) => ({ default: m.SandboxPage })),
)

function IdeFallback() {
  return (
    <p className="px-6 py-16 text-center text-sm text-muted">Loading editor…</p>
  )
}

/** Django APPEND_SLASH sends /games → /games/; RR path="games" needs no trailing slash. */
function StripTrailingSlash() {
  const location = useLocation()
  if (location.pathname.length > 1 && location.pathname.endsWith('/')) {
    const next = location.pathname.replace(/\/+$/, '') || '/'
    return (
      <Navigate
        to={`${next}${location.search}${location.hash}`}
        replace
      />
    )
  }
  return null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter basename={basename}>
          <AuthProvider>
            <GuestProvider>
              <StripTrailingSlash />
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="gallery" element={<GalleryPage />} />
                  <Route path="sketches/new" element={<CreateSketchPage />} />
                  <Route
                    path="sandbox"
                    element={
                      <Suspense fallback={<IdeFallback />}>
                        <SandboxPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="sketches/:slug/edit"
                    element={
                      <Suspense fallback={<IdeFallback />}>
                        <EditSketchPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="sketches/:slug/settings"
                    element={<SketchSettingsPage />}
                  />
                  <Route path="sketches/:slug" element={<SketchDetailPage />} />
                  <Route path="makers/:username" element={<MakerProfilePage />} />
                  <Route path="saved" element={<SavedPage />} />
                  <Route path="explore/today" element={<ExploreTodayPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="signup" element={<SignupPage />} />
                  <Route path="password-reset" element={<PasswordResetRequestPage />} />
                  <Route
                    path="password-reset/sent"
                    element={<PasswordResetRequestPage />}
                  />
                  <Route
                    path="password-reset/confirm/:uidb64/:token"
                    element={<PasswordResetConfirmPage />}
                  />
                  <Route
                    path="resend-verification"
                    element={<ResendVerificationPage />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </GuestProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
