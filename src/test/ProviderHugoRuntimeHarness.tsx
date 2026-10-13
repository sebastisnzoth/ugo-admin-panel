import { ProviderHugoBridge } from '../mvp/provider/ProviderHugoBridge'

export function mountProviderHugoRuntimeHarness() {
  const w = window as Window & { __UGO_PROVIDER_HUGO_RUNTIME_COMPONENT__?: typeof ProviderHugoBridge }
  w.__UGO_PROVIDER_HUGO_RUNTIME_COMPONENT__ = ProviderHugoBridge
  window.dispatchEvent(new Event('ugo:mount-provider-hugo-runtime'))
}
