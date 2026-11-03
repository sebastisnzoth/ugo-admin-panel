import { useEffect } from 'react'

/**
 * Voice-only Retell widget. Public keys are scoped to approved domains in Retell.
 * Never place a Retell secret API key in VITE_ variables.
 */
export function UgoRetellVoiceWidget() {
  const publicKey = import.meta.env.VITE_UGO_RETELL_VOICE_PUBLIC_KEY?.trim()
  const agentId = import.meta.env.VITE_UGO_RETELL_VOICE_AGENT_ID?.trim()

  useEffect(() => {
    if (!publicKey || !agentId) return

    const scriptId = 'retell-widget'
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id = scriptId
    script.type = 'module'
    script.src = 'https://dashboard.retellai.com/retell-widget-v2.js'
    script.dataset.voicePublicKey = publicKey
    script.dataset.voiceAgentId = agentId
    script.dataset.title = 'UGO Assistente'
    script.dataset.botName = 'UGO'
    script.dataset.fabText = 'Fale com a UGO'
    script.dataset.color = '#14865a'
    script.dataset.autoOpen = 'false'
    document.head.appendChild(script)

    return () => {
      // The official widget owns its own open call and lifecycle.
      // Keep the script mounted across transient React remounts.
    }
  }, [agentId, publicKey])

  return null
}
