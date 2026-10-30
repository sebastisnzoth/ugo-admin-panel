import React, { useEffect, useState } from 'react'
import { UGO_NEON_TEST_AUTH } from '../lib/neonTestDataApi'
import { neonTestDataRequest } from '../lib/neonTestDataApi'
import { resolveNeonUgoProfile, type UgoRoleProfile } from '../lib/neonAuthIdentity'

type SessionResponse = { user?: { id: string; email: string }; session?: { id: string } } | null

async function authRequest(path: string, init: RequestInit = {}) {
  return fetch(UGO_NEON_TEST_AUTH + path, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

export function NeonTestLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<UgoRoleProfile | null>(null)

  async function restore() {
    setProfile(null)
    const response = await authRequest('/get-session')
    if (!response.ok) throw new Error('No fue posible recuperar la sesión de Neon')
    const data = (await response.json()) as SessionResponse
    if (!data?.user?.id || !data?.user?.email || !data.session) {
      setMessage('Ingresá para acceder a Neon TEST')
      return
    }
    // The Neon Auth JWT is delivered through a response header, not the session cookie.
    // Never send the Better Auth session ID to the Data API as a bearer token.
    const jwt = response.headers.get('set-auth-jwt')
    if (!jwt || jwt.split('.').length !== 3) {
      setMessage('Sesión de Neon válida; falta token autorizado para recuperar el perfil. Verificá CORS y JWT en Neon.')
      return
    }
    const entries = await neonTestDataRequest<UgoRoleProfile[]>(
      'usuarios?select=id,tipo&id=eq.' + encodeURIComponent(data.user.id), jwt,
    )
    const resolved = resolveNeonUgoProfile(data.user, entries[0] ?? null)
    if (!resolved) {
      setMessage('Cuenta autenticada, pero el perfil UGO no está habilitado o no coincide')
      return
    }
    setProfile(resolved)
    setMessage('Sesión de prueba recuperada correctamente')
  }

  useEffect(() => {
    let active = true
    void restore().catch(() => { if (active) setMessage('No se pudo recuperar la sesión TEST') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const path = mode === 'sign-in' ? '/sign-in/email' : '/sign-up/email'
      const body = mode === 'sign-in'
        ? { email, password }
        : { email, password, name: email.split('@')[0] || 'Cliente' }
      const response = await authRequest(path, { method: 'POST', body: JSON.stringify(body) })
      if (!response.ok) throw new Error('No fue posible autenticar. Revisá los datos o la configuración de Neon Auth.')
      setPassword('')
      await restore()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      await authRequest('/sign-out', { method: 'POST', body: '{}' })
      setProfile(null)
      setMessage('Sesión finalizada')
    } finally {
      setLoading(false)
    }
  }

  return <main style={{ maxWidth: 420, margin: '48px auto', padding: 20 }}>
    <h1>UGO · Neon TEST</h1>
    <p>Acceso aislado de prueba. No utiliza UGO Arena ni producción.</p>
    {profile
      ? <section><p>Perfil recuperado: {profile.tipo}</p><button type="button" disabled={loading} onClick={() => void signOut()}>Salir</button></section>
      : <form onSubmit={event => void submit(event)}>
          <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Contraseña<input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>
          <button type="submit" disabled={loading}>{mode === 'sign-in' ? 'Ingresar' : 'Crear cuenta TEST'}</button>
          <button type="button" disabled={loading} onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>{mode === 'sign-in' ? 'Crear cuenta de prueba' : 'Ya tengo cuenta'}</button>
        </form>}
    <p role="status">{loading ? 'Verificando…' : message}</p>
  </main>
}
