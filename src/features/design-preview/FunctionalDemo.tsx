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
  const [items, setItems] = useState(adminDisputes.map((d) => ({ ...d, resolved: null as null | 'cliente' | 'proveedor' })))
  const open = items.filter((i) => i.resolved === null).length

  const resolve = (id: string, who: 'cliente' | 'proveedor') =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, resolved: who, status: 'Resuelta' } : x)))

  return (
    <figure className="ugo-rp-figure">
      <div className="ugo-rp-window" role="region" aria-label="Demo funcional de disputas">
        <div className="ugo-rp-chrome"><i /><i /><i /></div>
        <div className="ugo-rp-body">
          <aside className="ugo-rp-sidebar">
            <div className="ugo-rp-brand"><UgoMark size={26} /> UGO</div>
            <span className="ugo-rp-nav is-active">Disputas</span>
            <span className="ugo-rp-nav">Servicios</span>
          </aside>
          <main className="ugo-rp-main ugo-rp-main--split">
            <section className="ugo-rp-list">
              <h2 className="ugo-rp-title">Disputas abiertas: {open}</h2>
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
                      <button type="button" className="ugo-rp-btn ugo-rp-btn--ghost" onClick={() => resolve(x.id, 'cliente')}>A favor del cliente</button>
                      <button type="button" className="ugo-rp-btn" onClick={() => resolve(x.id, 'proveedor')}>A favor del proveedor</button>
                    </div>
                  )}
                </div>
              ))}
              {open === 0 && <button type="button" className="ugo-rp-btn ugo-rp-btn--ghost" onClick={() => setItems(adminDisputes.map((d) => ({ ...d, resolved: null })))}>Reiniciar demo</button>}
            </section>
          </main>
        </div>
      </div>
      <figcaption className="ugo-dp-caption">Demo · Admin (resolvé las disputas)</figcaption>
    </figure>
  )
}
