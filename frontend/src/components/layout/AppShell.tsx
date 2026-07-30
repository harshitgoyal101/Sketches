import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from './AppHeader'

const AUTH_PATHS = [
  '/login',
  '/signup',
  '/password-reset',
  '/resend-verification',
]

function isAuthRoute(pathname: string) {
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const authLayout = isAuthRoute(pathname)

  if (authLayout) {
    return (
      <main className="min-h-dvh">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader transparent={isHome} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
