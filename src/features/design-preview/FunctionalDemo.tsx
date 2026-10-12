import { useEffect, useState } from 'react'
import { Avatar, MapBackground, Phone } from '../client/design-preview/ClientDesignPreview'
import { Icon, UgoMark } from '../client/design-preview/icons'
import { formatArs, previewCategories, previewProvider } from '../client/design-preview/data'
import { providerActiveJob, providerOffers, adminDisputes } from './roles-data'

/*
 * Demo funcional (solo front-end, estado local).
 * No llama a Supabase, no persiste nada y no usa datos reales.
 * Cada botón cambia el estado y la pantalla, para recorrer el flujo completo.
 */

// ---------- CLIENTE ----------
type ClientStep = 'home' | 'detail' | 'enroute' | 'rate'

export function ClientDemo() {
  const [step, setStep] = useState<ClientStep>('home')
  const [eta, setEta] = useState(8)
  const [stars, setStars] = useState(0)
  const [sent, setSent] = useState(false)

  // Cuenta regresiva del viaje (1 min de demo = 1 s real)
  useEffect(() => {
    if (step !== 'enroute') return
    if (eta <= 0) {
      const t = setTimeout(() => setStep('rate'), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setEta((e) => e - 1), 1000)
    return () => clearTimeout(t)
  }, [step, eta])

  const reset = () => {
    setStep('home')
    setEta(8)
    setStars(0)
    setSent(false)
  }

  return (
    <Phone label="Demo funcional del cliente" caption="Demo · Cliente (tocá los botones)">
      <MapBackground pins={step === 'home'} />

      {step === 'home' && (
        <>
          <div className="ugo-dp-topbar">
            <button type="button" className="ugo-dp-round" aria-label="Menú"><Icon name="menu" size={22} /></button>
            <div className="ugo-dp-pill ugo-dp-loc">
              <span className="ugo-dp-loc-main"><Icon name="pin" size={18} /><strong>Mi ubicación</strong></span>
              <span className="ugo-dp-loc-sub">Centro · Florianópolis</span>
            </div>
            <button type="button" className="ugo-dp-round" aria-label="Notificaciones"><Icon name="bell" size={22} /><span className="ugo-dp-dot" /></button>
          </div>
          <div className="ugo-dp-sheet ugo-dp-sheet--home">
            <div className="ugo-dp-handle" />
            <div className="ugo-dp-search"><Icon name="search" size={20} /><span>¿Qué servicio necesitás?</span></div>
            <div className="ugo-dp-cats">
              {previewCategories.map((c) => (
                <button key={c.id} type="button" className="ugo-dp-cat" onClick={() => setStep('detail')}>
                  <i><Icon name={c.id === 'electricista' ? 'plug' : c.id === 'plomeria' ? 'droplet' : c.id === 'limpieza' ? 'sparkle' : 'wrench'} size={26} /></i>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="ugo-dp-small ugo-dp-center-text">Tocá Electricista para ver un proveedor</p>
          </div>
        </>
      )}

      {step === 'detail' && (
        <>
          <MapBackground pins={false} />
          <div className="ugo-dp-topbar">
            <button type="button" className="ugo-dp-round" aria-label="Volver" onClick={() => setStep('home')}><Icon name="back" size={22} /></button>
            <div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><strong>Electricista</strong></span></div>
          </div>
          <div className="ugo-dp-sheet ugo-dp-sheet--provider">
            <div className="ugo-dp-handle" />
            <div className="ugo-dp-provider">
              <Avatar large />
              <div className="ugo-dp-grow">
                <div className="ugo-dp-name">{previewProvider.name}</div>
                <div className="ugo-dp-rating">★ {previewProvider.rating} ({previewProvider.reviews} reseñas)</div>
              </div>
            </div>
            <div className="ugo-dp-price"><b>$ {formatArs(previewProvider.pricePerHour)}</b> <small>/ hora</small></div>
            <p className="ugo-dp-desc">{previewProvider.description}</p>
            <button type="button" className="ugo-dp-btn" onClick={() => { setEta(8); setStep('enroute') }}>Contratar</button>
          </div>
        </>
      )}

      {step === 'enroute' && (
        <>
          <MapBackground pins={false} />
          <div className="ugo-dp-marker" style={{ left: '50%', top: '42%' }}><UgoMark size={20} /></div>
          <div className="ugo-dp-topbar">
            <button type="button" className="ugo-dp-round" aria-label="Volver" onClick={reset}><Icon name="back" size={22} /></button>
            <div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><strong>Tu proveedor llega</strong></span></div>
          </div>
          <div className="ugo-dp-bubble" style={{ left: '50%', top: '22%' }}>
            <span>{eta > 0 ? 'Llegando en' : 'Llegó'}</span>
            <b>{eta > 0 ? `${eta} min` : '¡Listo!'}</b>
          </div>
          <div className="ugo-dp-sheet ugo-dp-sheet--route">
            <div className="ugo-dp-handle" />
            <div className="ugo-dp-provider">
              <Avatar />
              <div className="ugo-dp-grow">
                <div className="ugo-dp-name ugo-dp-name--sm">{previewProvider.name}</div>
                <div className="ugo-dp-onroute">{eta > 0 ? 'En camino a tu ubicación' : 'Llegó a tu ubicación'}</div>
              </div>
            </div>
            <div className="ugo-dp-banner"><Icon name="walk" size={22} /><div><b>{eta > 0 ? 'Tu proveedor está en camino' : 'Tu proveedor llegó'}</b><small>Estado simulado en la demo.</small></div></div>
            <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => setEta(0)} disabled={eta <= 0}>Simular llegada</button>
          </div>
        </>
      )}

      {step === 'rate' && (
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head"><div className="ugo-dp-name">Calificá el servicio</div></div>
          <div className="ugo-dp-center-text">
            <div className="ugo-dp-name ugo-dp-name--sm">{previewProvider.name}</div>
            <div className="ugo-dp-stars-pick" role="radiogroup" aria-label="Calificación">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} estrellas`} onClick={() => setStars(n)} className={n <= stars ? 'is-on' : ''}>★</button>
              ))}
            </div>
          </div>
          <div className="ugo-dp-plain-footer">
            {sent ? (
              <>
                <div className="ugo-dp-banner"><Icon name="check" size={22} /><div><b>¡Gracias por calificar!</b></div></div>
                <button type="button" className="ugo-dp-btn" onClick={reset}>Volver al inicio</button>
              </>
            ) : (
              <button type="button" className="ugo-dp-btn" disabled={stars === 0} onClick={() => setSent(true)}>Enviar calificación</button>
            )}
          </div>
        </div>
      )}
    </Phone>
  )
}

// ---------- PROVEEDOR ----------
type ProvStep = 'offers' | 'job' | 'evidence' | 'earnings'

export function ProviderDemo() {
  const [step, setStep] = useState<ProvStep>('offers')
  const [offers, setOffers] = useState(providerOffers)
  const [jobStep, setJobStep] = useState(1)
  const [checks, setChecks] = useState({ done: false, clean: false })
  const [earned, setEarned] = useState(184300)
  const [jobPay, setJobPay] = useState(0)

  const reset = () => {
    setStep('offers')
    setOffers(providerOffers)
    setJobStep(1)
    setChecks({ done: false, clean: false })
    setEarned(184300)
    setJobPay(0)
  }

  const accept = (id: string) => {
    const o = offers.find((x) => x.id === id)
    setJobPay(o ? o.earnings : 0)
    setOffers([])
    setJobStep(1)
    setStep('job')
  }

  return (
    <Phone label="Demo funcional del proveedor" caption="Demo · Proveedor (tocá los botones)">
      <MapBackground pins={false} />

      {step === 'offers' && (
        <>
          <div className="ugo-dp-topbar">
            <button type="button" className="ugo-dp-round" aria-label="Menú"><Icon name="menu" size={22} /></button>
            <div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><strong>Mi zona</strong></span><span className="ugo-dp-loc-sub">Centro · Florianópolis</span></div>
            <span className="ugo-dp-switch"><i /> Disponible</span>
          </div>
          <div className="ugo-dp-sheet ugo-dp-sheet--offers">
            <div className="ugo-dp-handle" />
            <h3 className="ugo-dp-section-title">Ofertas cerca de vos</h3>
            {offers.length === 0 && <p className="ugo-dp-small">No hay ofertas por ahora. Ya aceptaste una.</p>}
            {offers.map((o) => (
              <div key={o.id} className="ugo-dp-offer">
                <div className="ugo-dp-offer-head">
                  <span className="ugo-dp-offer-icon"><Icon name="bolt" size={18} /></span>
                  <div className="ugo-dp-grow">
                    <div className="ugo-dp-name ugo-dp-name--sm">{o.client} · {o.service}</div>
                    <div className="ugo-dp-small">{o.distanceKm.toString().replace('.', ',')} km · ganancia <b>$ {formatArs(o.earnings)}</b></div>
                  </div>
                </div>
                <div className="ugo-dp-btnrow ugo-dp-btnrow--tight">
                  <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => setOffers((xs) => xs.filter((x) => x.id !== o.id))}>Rechazar</button>
                  <button type="button" className="ugo-dp-btn" onClick={() => accept(o.id)}>Aceptar</button>
                </div>
              </div>
            ))}
            {offers.length === 0 && <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => setStep('job')}>Ver trabajo aceptado</button>}
          </div>
        </>
      )}

      {step === 'job' && (
        <>
          <div className="ugo-dp-marker" style={{ left: '40%', top: '36%' }}><UgoMark size={20} /></div>
          <div className="ugo-dp-topbar">
            <button type="button" className="ugo-dp-round" aria-label="Volver" onClick={() => setStep('offers')}><Icon name="back" size={22} /></button>
            <div className="ugo-dp-pill ugo-dp-loc ugo-dp-loc--row"><span className="ugo-dp-chip ugo-dp-chip--ok">{jobStep < 3 ? 'En camino' : 'En trabajo'}</span></div>
          </div>
          <div className="ugo-dp-sheet ugo-dp-sheet--job">
            <div className="ugo-dp-handle" />
            <div className="ugo-dp-provider">
              <Avatar />
              <div className="ugo-dp-grow">
                <div className="ugo-dp-name ugo-dp-name--sm">{providerActiveJob.client}</div>
                <div className="ugo-dp-service">{providerActiveJob.service}</div>
              </div>
            </div>
            <div className="ugo-dp-address"><Icon name="pin" size={16} /> {providerActiveJob.address}</div>
            <ol className="ugo-dp-stepper">
              {providerActiveJob.steps.map((s, i) => (
                <li key={s} className={i < jobStep ? 'is-done' : i === jobStep ? 'is-current' : ''}>
                  <span>{i < jobStep ? <Icon name="check" size={12} /> : i + 1}</span>{s}
                </li>
              ))}
            </ol>
            {jobStep < 3 ? (
              <button type="button" className="ugo-dp-btn" onClick={() => setJobStep((n) => n + 1)}>
                {jobStep === 1 ? 'Marcar llegada' : 'Comenzar trabajo'}
              </button>
            ) : (
              <button type="button" className="ugo-dp-btn" onClick={() => setStep('evidence')}>Terminar y subir evidencia</button>
            )}
          </div>
        </>
      )}

      {step === 'evidence' && (
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head">
            <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label="Volver" onClick={() => setStep('job')}><Icon name="back" size={20} /></button>
            <div><div className="ugo-dp-name ugo-dp-name--sm">Evidencia final</div><div className="ugo-dp-small">Confirmá antes de enviar</div></div>
          </div>
          <label className="ugo-dp-check"><input type="checkbox" checked={checks.done} onChange={(e) => setChecks({ ...checks, done: e.target.checked })} /> Trabajo completado</label>
          <label className="ugo-dp-check"><input type="checkbox" checked={checks.clean} onChange={(e) => setChecks({ ...checks, clean: e.target.checked })} /> Área limpia</label>
          <div className="ugo-dp-plain-footer">
            <button
              type="button"
              className="ugo-dp-btn"
              disabled={!(checks.done && checks.clean)}
              onClick={() => { setEarned((e) => e + jobPay); setStep('earnings') }}
            >
              Enviar para aprobación
            </button>
          </div>
        </div>
      )}

      {step === 'earnings' && (
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head ugo-dp-page-head--between"><div className="ugo-dp-name">Ganancias</div></div>
          <div className="ugo-dp-summary"><span>Total cobrado</span><b>$ {formatArs(earned)}</b><small>Incluye el trabajo recién enviado</small></div>
          <div className="ugo-dp-payout"><div><div className="ugo-dp-name ugo-dp-name--xs">{providerActiveJob.service} · {providerActiveJob.client}</div><div className="ugo-dp-small">Pendiente de aprobación</div></div><b>$ {formatArs(jobPay)}</b></div>
          <div className="ugo-dp-plain-footer">
            <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={reset}>Reiniciar demo</button>
          </div>
        </div>
      )}
    </Phone>
  )
}

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
