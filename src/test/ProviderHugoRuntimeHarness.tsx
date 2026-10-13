import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProviderHugoBridge } from '../mvp/provider/ProviderHugoBridge'
import { ProviderRoot } from '../mvp/provider/ProviderRoot'
import { ProviderFlowProvider } from '../mvp/provider/providerFlow'

export function mountProviderHugoRuntimeHarness() {
  const host = document.createElement('div')
  host.id = 'ugo-provider-hugo-runtime-harness'
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:block;visibility:visible;opacity:1;pointer-events:auto;overflow:auto;background:transparent;'
  document.body.append(host)
  createRoot(host).render(
    <ProviderFlowProvider>
      <ProviderRoot runtimeTestSurface={<ProviderHugoBridge />} />
    </ProviderFlowProvider>
  )
}
