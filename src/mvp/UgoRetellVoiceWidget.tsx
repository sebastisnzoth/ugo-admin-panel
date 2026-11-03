import { useEffect } from 'react'

/**
 * Retell voice access for the public landing.
 * A shareable Orb URL can be used without a Retell Public Key.
 * Prefer the official widget once a domain-restricted public key is available.
 * Never place private API credentials in VITE_ variables.
 */
export function UgoRetellVoiceWidget() {
  const publicKey = import.meta.env.VITE_UGO_RETELL_VOICE_PUBLIC_KEY?.trim()
  const agentId = import.meta.env.VITE_UGO_RETELL_VOICE_AGENT_ID?.trim()
  const orbUrl = import.meta.env.VITE_UGO_RETELL_ORB_URL?.trim()

  const useOfficialWidget = Boolean(publicKey && agentId)
  const safeOrbUrl = (() => {
    if (!orbUrl) return null
    try {
      const url = new URL(orbUrl)
      return url.protocol === 'https:' &&
        url.hostname === 'agent.retellai.com' &&
        /^\/orb\/agent_[a-zA-Z0-9]+$/.test(url.pathname) &&
        url.searchParams.has('token') ? url.href : null
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (!useOfficialWidget) return
    const scriptId = 'retell-widget'
    if (document.getElementById(scriptId)) return
    const script = document.createElement('script')
    script.id = scriptId
    script.type = 'module'
    script.src = 'https://dashboard.retellai.com/retell-widget-v2.js'
    script.dataset.voicePublicKey = publicKey!
    script.dataset.voiceAgentId = agentId!
    script.dataset.title = 'UGO Assistente'
    script.dataset.botName = 'UGO'
    script.dataset.fabText = 'Fale com a UGO'
    script.dataset.color = '#14865a'
    script.dataset.autoOpen = 'false'
    document.head.appendChild(script)
  }, [agentId, publicKey, useOfficialWidget])

  if (useOfficialWidget || !safeOrbUrl) return null

  return <a
    href={safeOrbUrl}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Fale com a UGO por voz (abre em outra aba)"
    style={{
      position: 'fixed', right: 20, bottom: 22, zIndex: 900,
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '14px 20px', borderRadius: 999,
      background: '#14865a', color: 'white', textDecoration: 'none',
      fontWeight: 750, fontSize: 15, lineHeight: 1.2,
      boxShadow: '0 8px 28px rgba(0, 0, 0, .25)',
      maxWidth: 'calc(100vw - 40px)'
    }}
  >
    <span aria-hidden="true" style={{ fontSize: 20 }}>🎙</span>
    <span>Fale com a UGO</span>
  </a>
}
