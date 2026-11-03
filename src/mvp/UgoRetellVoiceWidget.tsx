import { useEffect, useState } from 'react'

/**
 * UGO voice support: official Retell widget if a domain-restricted public
 * key is configured; otherwise a local dialog around the shared Orb page.
 * Orb embedding depends on Retell's frame policy; external fallback remains.
 */
export function UgoRetellVoiceWidget() {
  const [open, setOpen] = useState(false)
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

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (useOfficialWidget || !safeOrbUrl) return null

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Fale com a UGO por voz"
      style={{
        position: 'fixed', right: 20, bottom: 22, zIndex: 900,
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '14px 20px', borderRadius: 999, border: 0, cursor: 'pointer',
        background: '#14865a', color: '#fff', fontWeight: 750, fontSize: 15,
        boxShadow: '0 8px 28px rgba(0, 0, 0, .25)',
        maxWidth: 'calc(100vw - 40px)'
      }}
    ><span aria-hidden="true" style={{ fontSize: 20 }}>🎙</span>Fale com a UGO</button>
    {open && <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(6, 25, 17, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ugo-voice-title"
        onClick={event => event.stopPropagation()}
        style={{
          background: '#fff', color: '#153524', borderRadius: 20,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          width: 'min(440px, 100%)', height: 'min(720px, 88dvh)',
          boxShadow: '0 24px 80px rgba(0,0,0,.36)'
        }}
      >
        <header style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: '#edf8f0',
          gap: 12
        }}>
          <div><strong id="ugo-voice-title">UGO Assistente</strong><div style={{ fontSize: 12 }}>Atendimento por voz · PT / ES</div></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar conversa" style={{
            border: 0, borderRadius: 10, padding: '9px 13px',
            background: '#dcece1', color: '#173725', cursor: 'pointer',
            fontWeight: 700
          }}>✕</button>
        </header>
        <iframe
          src={safeOrbUrl}
          title="Conversa por voz com UGO Assistente"
          allow="microphone; autoplay"
          referrerPolicy="no-referrer"
          style={{ border: 0, width: '100%', flex: 1, background: '#fff' }}
        />
        <footer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 12 }}>
          <span>Não abriu ou o microfone foi bloqueado?</span>
          <a href={safeOrbUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#11744d', fontWeight: 700 }}>Abrir em outra aba</a>
        </footer>
      </section>
    </div>}
  </>
}
