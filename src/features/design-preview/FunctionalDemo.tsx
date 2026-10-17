import{LocalizedText,useLocale}from'../../i18n/locale'
import { useState } from 'react'
import { UgoMark } from '../client/design-preview/icons'
import { adminDisputes } from './roles-data'

/*
 * Demo funcional de Admin (solo front-end, estado local).
 * Cliente y proveedor están en RealFlowDemo.tsx.
 * No llama a Supabase, no persiste nada y no usa datos reales.
 * Cada botón cambia el estado y la pantalla, para recorrer el flujo completo.
 */

// ---------- ADMIN ----------
export function AdminDemo() {
  const{t}=useLocale()
  const [items, setItems] = useState(adminDisputes.map((d) => ({ ...d, resolved: null as null | 'cliente' | 'proveedor' })))
  const open = items.filter((i) => i.resolved === null).length

  const resolve = (id: string, who: 'cliente' | 'proveedor') =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, resolved: who, status: 'Resuelta' } : x)))

  return (
    <figure className="ugo-rp-figure">
      <div className="ugo-rp-window" role="region" aria-label={t('preview.functionalDisputes')}>
        <div className="ugo-rp-chrome"><i /><i /><i /></div>
        <div className="ugo-rp-body">
          <aside className="ugo-rp-sidebar">
            <div className="ugo-rp-brand"><UgoMark size={26} /> <LocalizedText id="ugoWebRemaining.brand"/></div>
            <span className="ugo-rp-nav is-active"><LocalizedText id="screen.admin_reports.19"/></span>
            <span className="ugo-rp-nav"><LocalizedText id="screen.admin_native.6"/></span>
          </aside>
          <main className="ugo-rp-main ugo-rp-main--split">
            <section className="ugo-rp-list">
              <h2 className="ugo-rp-title"><LocalizedText id="adminSurface.openDisputes"/> {open}</h2>
              {items.map((x) => (
                <div key={x.id} className="ugo-rp-dispute">
                  <div className="ugo-rp-dispute-head">
                    <b>{x.id}</b>
                    <span className={`ugo-rp-status ugo-rp-status--${x.resolved ? 'ok' : 'warn'}`}>{x.resolved ? `A favor del ${x.resolved}` : x.status}</span>
                  </div>
                  <div className="ugo-rp-small">{x.client} · {x.provider}</div>
                  <p>{x.reason}</p>
                  {!x.resolved && (
                    <div className="ugo-rp-actions">
                      <button type="button" className="ugo-rp-btn ugo-rp-btn--ghost" onClick={() => resolve(x.id, 'cliente')}><LocalizedText id="screen.admin_decision.46"/></button>
                      <button type="button" className="ugo-rp-btn" onClick={() => resolve(x.id, 'proveedor')}><LocalizedText id="screen.admin_decision.47"/></button>
                    </div>
                  )}
                </div>
              ))}
              {open === 0 && <button type="button" className="ugo-rp-btn ugo-rp-btn--ghost" onClick={() => setItems(adminDisputes.map((d) => ({ ...d, resolved: null })))}><LocalizedText id="preview.restartDemo"/></button>}
            </section>
          </main>
        </div>
      </div>
      <figcaption className="ugo-dp-caption"><LocalizedText id="preview.adminDemo"/></figcaption>
    </figure>
  )
}
