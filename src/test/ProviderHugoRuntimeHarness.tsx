import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProviderHugoBridge } from '../mvp/provider/ProviderHugoBridge'
import { ProviderDataProvider, useProviderData } from '../mvp/provider/providerData'
import { ProviderFlowProvider } from '../mvp/provider/providerFlow'

function ProviderHugoRuntimeHarnessContent() {
  const data = useProviderData()
  return <>
    <ProviderHugoBridge />
    <output
      data-testid="provider-hugo-runtime-state"
      data-online={String(data.online)}
      data-service-state={data.service?.estado || ''}
      aria-label="Estado de prueba de Hugo proveedor"
    />
  </>
}

/** Test-only mount for exercising the deliberately unmounted provider voice surface. */
export function mountProviderHugoRuntimeHarness() {
  const appRoot = document.querySelector('.ugo-provider-root')
  if (!appRoot) throw new Error('PROVIDER_RUNTIME_ROOT_REQUIRED')
  const host = document.createElement('div')
  host.id = 'ugo-provider-hugo-runtime-harness'
  appRoot.append(host)
  createRoot(host).render(
    <ProviderDataProvider>
      <ProviderFlowProvider>
        <ProviderHugoRuntimeHarnessContent />
      </ProviderFlowProvider>
    </ProviderDataProvider>
  )
}
