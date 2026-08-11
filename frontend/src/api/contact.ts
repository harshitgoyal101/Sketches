import { fetchJson } from '@/api/client'

export type ContactPayload = {
  name: string
  email: string
  subject?: string
  message: string
}

export type ContactResponse = {
  ok: true
}

export async function sendContactMessage(
  payload: ContactPayload,
): Promise<ContactResponse> {
  return fetchJson<ContactResponse>('/api/contact/', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Could not send your message.',
  })
}
