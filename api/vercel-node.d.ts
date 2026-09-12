declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string
    headers: Record<string, string | undefined>
    query: Record<string, string | string[] | undefined>
    // Vercel parses JSON bodies dynamically. Keep this permissive so handlers can
    // safely narrow the payload at runtime without importing @vercel/node.
    body?: any
  }

  export interface VercelResponse {
    status(code: number): VercelResponse
    json(body: unknown): VercelResponse
    send(body: unknown): VercelResponse
    end(body?: unknown): VercelResponse
    setHeader(name: string, value: string | number | readonly string[]): VercelResponse
  }
}
