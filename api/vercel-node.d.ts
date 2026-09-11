declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string
    headers: Record<string, string | undefined>
    query: Record<string, string | string[] | undefined>
    body?: Record<string, unknown>
  }

  export interface VercelResponse {
    status(code: number): VercelResponse
    json(body: unknown): VercelResponse
    send(body: unknown): VercelResponse
    end(body?: unknown): VercelResponse
    setHeader(name: string, value: string | number | readonly string[]): VercelResponse
  }
}
