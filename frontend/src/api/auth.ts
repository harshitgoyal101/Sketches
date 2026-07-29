import { ApiError, ensureCsrfCookie, fetchJson } from '@/api/client'

export type AuthUser = {
  id: number
  username: string
  email: string
  is_staff: boolean
}

export type MeResponse = {
  user: AuthUser | null
}

export type LoginPayload = {
  username: string
  password: string
  remember?: boolean
}

export type SignupPayload = {
  username: string
  email: string
  password1: string
  password2: string
}

export type SignupResponse = {
  ok: true
  verification_required: boolean
  email: string
}

export { ApiError, ensureCsrfCookie }

export async function getMe(): Promise<MeResponse> {
  try {
    return await fetchJson<MeResponse>('/api/auth/me/')
  } catch {
    return { user: null }
  }
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const data = await fetchJson<{ ok: boolean; user: AuthUser }>('/api/auth/login/', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Login failed',
  })
  return data.user
}

export async function logout(): Promise<void> {
  await fetchJson('/api/auth/logout/', {
    method: 'POST',
    body: {},
  })
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return fetchJson<SignupResponse>('/api/auth/signup/', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Signup failed',
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await fetchJson('/api/auth/password-reset/', {
    method: 'POST',
    body: { email },
    fallbackMessage: 'Could not start password reset',
  })
}

export async function confirmPasswordReset(payload: {
  uid: string
  token: string
  password1: string
  password2: string
}): Promise<AuthUser> {
  const data = await fetchJson<{ ok: boolean; user: AuthUser }>(
    '/api/auth/password-reset/confirm/',
    {
      method: 'POST',
      body: payload,
      fallbackMessage: 'Could not reset password',
    },
  )
  return data.user
}

export async function resendVerification(email: string): Promise<void> {
  await fetchJson('/api/auth/resend-verification/', {
    method: 'POST',
    body: { email },
    fallbackMessage: 'Could not resend verification',
  })
}
