import { useEffect, useRef } from 'react'

type GoogleSignInButtonProps = {
  clientId?: string
  onCredential: (credential: string) => void
  className?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (
            parent: HTMLElement,
            config: Record<string, unknown>,
          ) => void
        }
      }
    }
  }
}

export function GoogleSignInButton({
  clientId,
  onCredential,
  className,
}: GoogleSignInButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!clientId) return

    const scriptId = 'google-gsi'
    function init() {
      if (!window.google?.accounts?.id || !btnRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          onCredential(response.credential)
        },
      })
      btnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: Math.min(360, btnRef.current.parentElement?.clientWidth || 320),
        text: 'continue_with',
        shape: 'rectangular',
      })
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = init
      document.head.appendChild(script)
    } else if (window.google?.accounts?.id) {
      init()
    } else {
      script.addEventListener('load', init)
    }

    return () => {
      script?.removeEventListener('load', init)
    }
  }, [clientId, onCredential])

  if (!clientId) {
    return (
      <p className="rounded-btn border border-border bg-surface px-3 py-2.5 text-center text-xs text-muted">
        Google sign-in is not configured. Use email below.
      </p>
    )
  }

  return <div ref={btnRef} className={className ?? 'flex min-h-10 justify-center'} />
}
