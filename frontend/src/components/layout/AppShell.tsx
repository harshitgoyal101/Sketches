import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader transparent={isHome} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
