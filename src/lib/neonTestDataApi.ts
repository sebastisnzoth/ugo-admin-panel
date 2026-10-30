/**
 * Neon TEST Data API transport for UGO migration.
 * Deliberately does not replace Supabase Auth/Realtime/Storage automatically.
 * Use only after obtaining a Neon Auth session and verifying server-side RLS.
 */
export const UGO_NEON_TEST_DATA_API =
  'https://ep-small-wildflower-b6xzg7jo.apirest.c-2.sa-east-1.aws.neon.tech/ugodbapp/rest/v1'
export const UGO_NEON_TEST_AUTH =
  'https://ep-small-wildflower-b6xzg7jo.neonauth.c-2.sa-east-1.aws.neon.tech/ugodbapp/auth'

export type NeonDataApiFailure = {
  status: number
  code: string
}
export class NeonDataApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super('Neon Data API request failed')
    this.name = 'NeonDataApiError'
    this.status = status
    this.code = code
  }
}

/** Auth token must originate from Neon TEST Auth; Supabase access tokens are not interoperable. */
export async function neonTestDataRequest<T>(
  resource: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  if (!token || /\s/.test(token)) throw new Error('Neon Auth token required')
  if (!/^[a-z][a-z0-9_]*(?:\?[a-zA-Z0-9_.,=&%\-]+)?$/.test(resource)) {
    throw new Error('Invalid Data API resource')
  }
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const result = await fetch(`${UGO_NEON_TEST_DATA_API}/${resource}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
  if (!result.ok) {
    // Never expose body: PostgREST errors may reveal internal SQL or claims.
    throw new NeonDataApiError(result.status, 'DATA_API_ERROR')
  }
  if (result.status === 204) return undefined as T
  return result.json() as Promise<T>
}
