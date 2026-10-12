import { useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import { Avatar, MapBackground, Phone, Stars } from '../client/design-preview/ClientDesignPreview'
import { Icon, UgoMark } from '../client/design-preview/icons'
import { formatArs, previewProvider } from '../client/design-preview/data'
import work1 from '../client/design-preview/assets/work-1.jpg'
import work2 from '../client/design-preview/assets/work-2.jpg'

/*
 * Demo con el flujo real de UGO (docs/UGO_ECOSISTEMA_FLUJO.md), solo front-end.
 * Estado compartido: lo que hace el proveedor se refleja en la pantalla del cliente.
 * Sin Supabase, sin persistencia y sin datos reales. No reemplaza la lógica del backend.
 */

type Phase =
  | 'need'        // cliente: ¿qué necesitás?
  | 'confirm'     // cliente: revisá lo que entendí
  | 'searching'   // cliente: buscando profesionales
  | 'offer'       // proveedor: oportunidad pendiente (cliente sigue en búsqueda)
  | 'assigned'    // proveedor encontrado; cliente elige forma de pago
  | 'enroute'     // proveedor en camino
  | 'arrived'     // llegó (automática o manual)
  | 'working'     // trabajo en curso
  | 'completion'  // proveedor marcó LISTO
  | 'review'      // cliente revisa y aprueba/disputa
  | 'disputed'
  | 'completed'

type Payment = 'card' | 'mp' | 'pix' | 'cash'

const paymentOptions: { id: Payment; label: string; note?: string }[] = [
  { id: 'card', label: 'Tarjeta de crédito/débito' },
  { id: 'mp', label: 'Mercado Pago' },
  { id: 'pix', label: 'Pix' },
  { id: 'cash', label: 'Efectivo al profesional', note: 'El efectivo no lo retiene UGO; se paga directamente al profesional.' },
]

type Category = 'electricista' | 'plomeria' | 'limpieza' | 'montaje'

// Reglas de evidencia por categoría (demo). En producción las define la política del servicio.
const categories: Record<Category, { label: string; icon: 'plug' | 'droplet' | 'sparkle' | 'wrench'; problem: string; initialRequired: boolean; finalRequired: boolean }> = {
  electricista: { label: 'Electricista', icon: 'plug', problem: 'Tablero sin luz en la cocina', initialRequired: true, finalRequired: true },
  plomeria: { label: 'Plomería', icon: 'droplet', problem: 'Pérdida de agua bajo el lavatorio', initialRequired: false, finalRequired: true },
  limpieza: { label: 'Limpieza', icon: 'sparkle', problem: 'Limpieza profunda de departamento', initialRequired: false, finalRequired: false },
  montaje: { label: 'Montaje', icon: 'wrench', problem: 'Armado de un placard', initialRequired: true, finalRequired: false },
}

const offer = { client: 'Lucía F.', service: 'Electricista', problem: 'Tablero sin luz en la cocina', distanceKm: 1.2, earnings: 12400 }

const DEMO_PRICE = 8500

interface State {
  phase: Phase
  category: Category
  providerOnline: boolean
  payment: Payment | null
  eta: number
  initialRequired: boolean
  initialDone: boolean
  finalRequired: boolean
  finalDone: boolean
  stars: number
  earned: number
}

const initial: State = {
  phase: 'need',
  category: 'electricista',
  providerOnline: true,
  payment: null,
  eta: 8,
  initialRequired: true,
  initialDone: false,
  finalRequired: true,
  finalDone: false,
  stars: 0,
  earned: 0,
}

type Action =
  | { type: 'PICK'; category: Category }
  | { type: 'CONFIRM' }
  | { type: 'EDIT' }
  | { type: 'CANCEL' }
  | { type: 'RESET' }
  | { type: 'OFFER' }
  | { type: 'ACCEPT' }
  | { type: 'DECLINE' }
  | { type: 'PAYMENT'; payment: Payment }
  | { type: 'ON_WAY' }
  | { type: 'TICK' }
  | { type: 'ARRIVED_MANUAL' }
  | { type: 'UPLOAD_INITIAL' }
  | { type: 'START' }
  | { type: 'DONE' }
  | { type: 'UPLOAD_FINAL' }
  | { type: 'REQUEST_REVIEW' }
  | { type: 'APPROVE' }
  | { type: 'DISPUTE' }
  | { type: 'RATE'; stars: number }
  | { type: 'TOGGLE_ONLINE' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'PICK': {
      if (s.phase !== 'need') return s
      const c = categories[a.category]
      return { ...s, phase: 'confirm', category: a.category, initialRequired: c.initialRequired, finalRequired: c.finalRequired, initialDone: false, finalDone: false }
    }
    case 'CONFIRM': return s.phase === 'confirm' ? { ...s, phase: 'searching' } : s
    case 'EDIT': return s.phase === 'confirm' ? { ...s, phase: 'need' } : s
    case 'CANCEL': return s.phase === 'searching' || s.phase === 'offer' ? { ...initial, providerOnline: s.providerOnline } : s
    case 'RESET': return { ...initial, providerOnline: s.providerOnline }
    case 'OFFER': return s.phase === 'searching' && s.providerOnline ? { ...s, phase: 'offer' } : s
    case 'ACCEPT': return s.phase === 'offer' ? { ...s, phase: 'assigned' } : s
    case 'DECLINE': return s.phase === 'offer' ? { ...s, phase: 'searching' } : s
    case 'PAYMENT': return s.phase === 'assigned' ? { ...s, payment: a.payment } : s
    case 'ON_WAY': return s.phase === 'assigned' && s.payment ? { ...s, phase: 'enroute', eta: 8 } : s
    case 'TICK': {
      if (s.phase !== 'enroute') return s
      const eta = s.eta - 1
      return eta <= 0 ? { ...s, eta: 0, phase: 'arrived' } : { ...s, eta }
    }
    case 'ARRIVED_MANUAL': return s.phase === 'enroute' ? { ...s, eta: 0, phase: 'arrived' } : s
    case 'UPLOAD_INITIAL': return s.phase === 'arrived' ? { ...s, initialDone: true } : s
    case 'START': return s.phase === 'arrived' && (!s.initialRequired || s.initialDone) ? { ...s, phase: 'working' } : s
    case 'DONE': return s.phase === 'working' ? { ...s, phase: 'completion' } : s
    case 'UPLOAD_FINAL': return s.phase === 'completion' ? { ...s, finalDone: true } : s
    case 'REQUEST_REVIEW': return s.phase === 'completion' && (!s.finalRequired || s.finalDone) ? { ...s, phase: 'review' } : s
    case 'APPROVE': return s.phase === 'review' ? { ...s, phase: 'completed', earned: s.earned + DEMO_PRICE } : s
    case 'DISPUTE': return s.phase === 'review' ? { ...s, phase: 'disputed' } : s
    case 'RATE': return s.phase === 'completed' ? { ...s, stars: a.stars } : s
    case 'TOGGLE_ONLINE': return { ...s, providerOnline: !s.providerOnline, phase: s.phase === 'offer' && s.providerOnline ? 'searching' : s.phase }
    default: return s
  }
}

function useFlow() {
  const [s, dispatch] = useReducer(reducer, initial)

  // Búsqueda: aparece una oportunidad a los 2 s si el proveedor está disponible
  useEffect(() => {
    if (s.phase !== 'searching' || !s.providerOnline) return
    const t = setTimeout(() => dispatch({ type: 'OFFER' }), 2000)
    return () => clearTimeout(t)
  }, [s.phase, s.providerOnline])

  // Viaje: cuenta regresiva; al llegar a 0 la llegada se valida automáticamente
  useEffect(() => {
    if (s.phase !== 'enroute') return
    const t = setTimeout(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearTimeout(t)
  }, [s.phase, s.eta])

  return [s, dispatch] as const
}

/* ---------- Cliente ---------- */
function ClientPhone({ s, d }: { s: State; d: Dispatch<Action> }) {
  const p = previewProvider
  const payLabel = paymentOptions.find((o) => o.id === s.payment)?.label

  if (s.phase === 'need') {
    return (
      <Phone label="Cliente · inicio" caption="Cliente · ¿Qué necesitás?">
        <MapBackground pins />
        <div className="ugo-dp-topbar">
          <button type="button" className="ugo-dp-round" aria-label="Menú"><Icon name="menu" size={22} /></button>
          <div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><Icon name="pin" size={18} /><strong>Mi ubicación</strong></span><span className="ugo-dp-loc-sub">Centro · Florianópolis</span></div>
          <button type="button" className="ugo-dp-round" aria-label="Notificaciones"><Icon name="bell" size={22} /></button>
        </div>
        <div className="ugo-dp-sheet ugo-dp-sheet--home">
          <div className="ugo-dp-handle" />
          <div className="ugo-dp-search"><Icon name="search" size={20} /><span>¿Qué necesitás? Escribí o tocá una categoría</span></div>
          <div className="ugo-dp-cats">
            <button type="button" className="ugo-dp-cat" onClick={() => d({ type: 'PICK', category: 'electricista' })}><i><Icon name="plug" size={26} /></i>Electricista</button>
            <button type="button" className="ugo-dp-cat" onClick={() => d({ type: 'PICK', category: 'plomeria' })}><i><Icon name="droplet" size={26} /></i>Plomería</button>
            <button type="button" className="ugo-dp-cat" onClick={() => d({ type: 'PICK', category: 'limpieza' })}><i><Icon name="sparkle" size={26} /></i>Limpieza</button>
            <button type="button" className="ugo-dp-cat" onClick={() => d({ type: 'PICK', category: 'montaje' })}><i><Icon name="wrench" size={26} /></i>Montaje</button>
          </div>
        </div>
        <nav className="ugo-dp-tabbar"><span className="ugo-dp-tab ugo-dp-tab--on"><Icon name="home" size={22} />Inicio</span><span className="ugo-dp-tab"><Icon name="list" size={22} />Mis servicios</span><span className="ugo-dp-tab"><Icon name="message" size={22} />Mensajes</span><span className="ugo-dp-tab"><Icon name="user" size={22} />Perfil</span></nav>
      </Phone>
    )
  }

  if (s.phase === 'confirm') {
    return (
      <Phone label="Cliente · confirmar solicitud" caption="Cliente · Revisá lo que entendí">
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head"><button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label="Volver" onClick={() => d({ type: 'EDIT' })}><Icon name="back" size={20} /></button><div className="ugo-dp-name ugo-dp-name--sm">Revisá tu solicitud</div></div>
          <div className="ugo-dp-review-list">
            <div><span>Servicio</span><b>{categories[s.category].label}</b></div>
            <div><span>Problema</span><b>{categories[s.category].problem}</b></div>
            <div><span>Lugar</span><b>Centro, Florianópolis</b></div>
            <div><span>Cuándo</span><b>Ahora</b></div>
            <div><span>Evidencia</span><b>{categories[s.category].initialRequired ? 'Foto inicial requerida' : 'Sin foto inicial'}</b></div>
          </div>
        </div>
        <div className="ugo-dp-plain-footer">
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'EDIT' })}>Editar</button>
          <div style={{ height: 10 }} />
          <button type="button" className="ugo-dp-btn" onClick={() => d({ type: 'CONFIRM' })}>Confirmar solicitud</button>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'searching' || s.phase === 'offer') {
    return (
      <Phone label="Cliente · buscando" caption="Cliente · Buscando profesional">
        <MapBackground pins={false} />
        <div className="ugo-dp-pulse" aria-hidden="true"><i /></div>
        <div className="ugo-dp-topbar"><div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><strong>Buscando profesionales</strong></span><span className="ugo-dp-loc-sub">{s.providerOnline ? 'Revisamos profesionales cerca' : 'Sin profesionales disponibles ahora'}</span></div></div>
        <div className="ugo-dp-sheet ugo-dp-sheet--route">
          <div className="ugo-dp-handle" />
          <p className="ugo-dp-desc">Tu solicitud está activa. Te avisamos apenas un profesional acepte.</p>
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'CANCEL' })}>Cancelar solicitud</button>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'assigned') {
    return (
      <Phone label="Cliente · proveedor encontrado" caption="Cliente · Proveedor encontrado">
        <MapBackground pins={false} />
        <div className="ugo-dp-sheet ugo-dp-sheet--payment">
          <div className="ugo-dp-handle" />
          <div className="ugo-dp-provider">
            <Avatar />
            <div className="ugo-dp-grow">
              <div className="ugo-dp-name ugo-dp-name--sm">{p.name}</div>
              <div className="ugo-dp-rating"><Stars value={p.rating} /> <strong>{p.rating}</strong> · {p.service}</div>
            </div>
          </div>
          <h3 className="ugo-dp-section-title">¿Cómo querés pagar?</h3>
          <div role="radiogroup" aria-label="Forma de pago" className="ugo-dp-pay-list">
            {paymentOptions.map((o) => (
              <label key={o.id} className={`ugo-dp-pay${s.payment === o.id ? ' is-on' : ''}`}>
                <input type="radio" name="pay" checked={s.payment === o.id} onChange={() => d({ type: 'PAYMENT', payment: o.id })} />
                <span>{o.label}{o.note && <small>{o.note}</small>}</span>
              </label>
            ))}
          </div>
          <p className="ugo-dp-small ugo-dp-center-text">{s.payment ? `Elegiste: ${payLabel}. El profesional sale cuando confirme.` : 'Elegí una forma de pago para continuar.'}</p>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'enroute' || s.phase === 'arrived' || s.phase === 'working') {
    const isArrived = s.phase !== 'enroute'
    return (
      <Phone label="Cliente · seguimiento" caption={s.phase === 'enroute' ? 'Cliente · En camino' : s.phase === 'arrived' ? 'Cliente · Llegó' : 'Cliente · Trabajo en curso'}>
        <MapBackground pins={false} />
        <div className="ugo-dp-marker" style={{ left: '50%', top: '42%' }}><UgoMark size={20} /></div>
        <div className="ugo-dp-topbar"><div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><strong>{s.phase === 'enroute' ? 'Tu proveedor viene' : s.phase === 'arrived' ? 'Tu proveedor llegó' : 'Trabajo en curso'}</strong></span></div></div>
        {s.phase === 'enroute' && (
          <>
            <svg className="ugo-dp-route" viewBox="0 0 360 760" preserveAspectRatio="none" aria-hidden="true">
              <path d="M265 150 Q200 210 170 240 T95 300" />
            </svg>
            <div className="ugo-dp-car" style={{ left: `${265 - ((8 - s.eta) / 8) * 170}px`, top: `${150 + ((8 - s.eta) / 8) * 150}px` }}>
              <Icon name="car" size={24} />
            </div>
            <div className="ugo-dp-bubble" style={{ left: '50%', top: '22%' }}><span>Llegando en</span><b>{s.eta} min</b></div>
          </>
        )}
        <div className="ugo-dp-sheet ugo-dp-sheet--route">
          <div className="ugo-dp-handle" />
          <div className="ugo-dp-provider">
            <Avatar />
            <div className="ugo-dp-grow">
              <div className="ugo-dp-name ugo-dp-name--sm">{p.name}</div>
              <div className="ugo-dp-onroute">{s.phase === 'enroute' ? 'En camino a tu ubicación' : s.phase === 'arrived' ? 'Llegó a tu ubicación' : 'Trabajando en tu servicio'}</div>
            </div>
          </div>
          <div className="ugo-dp-banner"><Icon name={isArrived ? 'check' : 'walk'} size={22} /><div><b>{s.phase === 'enroute' ? 'Tu proveedor está en camino' : s.phase === 'arrived' ? 'Llegada registrada' : 'El trabajo está en curso'}</b><small>{s.phase === 'enroute' ? 'Te avisamos cuando llegue.' : s.phase === 'arrived' ? 'El profesional empieza en breve.' : 'Te avisamos cuando lo marque terminado.'}</small></div></div>
          <p className="ugo-dp-small">Pago: {payLabel}</p>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'completion') {
    return (
      <Phone label="Cliente · esperando revisión" caption="Cliente · Trabajo terminado">
        <MapBackground pins={false} />
        <div className="ugo-dp-sheet ugo-dp-sheet--route">
          <div className="ugo-dp-handle" />
          <h3 className="ugo-dp-section-title">Trabajo terminado</h3>
          <p className="ugo-dp-desc">{p.name} marcó el trabajo como listo. Te pedimos revisión cuando llegue.</p>
          <p className="ugo-dp-small">Pago: {payLabel}</p>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'review') {
    return (
      <Phone label="Cliente · revisar y aprobar" caption="Cliente · Revisar y aprobar">
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head"><div className="ugo-dp-name ugo-dp-name--sm">Revisá el trabajo</div></div>
          <p className="ugo-dp-small">Evidencia final de {p.name}</p>
          <div className="ugo-dp-photo-grid">
            <img src={work1} alt="Evidencia final 1" className="ugo-dp-photo-tile" />
            <img src={work2} alt="Evidencia final 2" className="ugo-dp-photo-tile" />
          </div>
          <div className="ugo-dp-review-list">
            <div><span>Servicio</span><b>{categories[s.category].label}</b></div>
            <div><span>Total</span><b>$ {formatArs(DEMO_PRICE)}</b></div>
            <div><span>Pago</span><b>{payLabel}</b></div>
          </div>
        </div>
        <div className="ugo-dp-plain-footer">
          <button type="button" className="ugo-dp-btn" onClick={() => d({ type: 'APPROVE' })}>Aprobar y cerrar</button>
          <div style={{ height: 10 }} />
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'DISPUTE' })}>Tengo un problema</button>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'disputed') {
    return (
      <Phone label="Cliente · disputa" caption="Cliente · Disputa abierta">
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head"><div className="ugo-dp-name ugo-dp-name--sm">Disputa abierta</div></div>
          <div className="ugo-dp-banner"><Icon name="info" size={22} /><div><b>UGO revisa el caso con la evidencia</b><small>Te avisamos cuando haya una decisión.</small></div></div>
        </div>
        <div className="ugo-dp-plain-footer"><button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'RESET' })}>Volver al inicio</button></div>
      </Phone>
    )
  }

  // completed
  return (
    <Phone label="Cliente · calificar" caption="Cliente · Calificar y cerrar">
      <div className="ugo-dp-plain">
        <div className="ugo-dp-page-head"><div className="ugo-dp-name ugo-dp-name--sm">Servicio completado</div></div>
        <div className="ugo-dp-center-text">
          <div className="ugo-dp-name ugo-dp-name--sm">{p.name}</div>
          <div className="ugo-dp-stars-pick" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={s.stars === n} aria-label={`${n} estrellas`} onClick={() => d({ type: 'RATE', stars: n })} className={n <= s.stars ? 'is-on' : ''}>★</button>
            ))}
          </div>
        </div>
      </div>
      <div className="ugo-dp-plain-footer">
        <button type="button" className="ugo-dp-btn" onClick={() => d({ type: 'RESET' })}>Pedir otro servicio</button>
      </div>
    </Phone>
  )
}

/* ---------- Proveedor ---------- */
function ProviderHeader({ s, d }: { s: State; d: Dispatch<Action> }) {
  return (
    <div className="ugo-dp-topbar">
      <div className="ugo-dp-pill ugo-dp-loc"><span className="ugo-dp-loc-main"><strong>{s.providerOnline ? 'Disponible' : 'Desconectado'}</strong></span><span className="ugo-dp-loc-sub">Centro · Florianópolis</span></div>
      <button type="button" className="ugo-dp-switch" aria-pressed={s.providerOnline} onClick={() => d({ type: 'TOGGLE_ONLINE' })}><i style={{ background: s.providerOnline ? '#006948' : '#9AA3AD' }} />{s.providerOnline ? 'En línea' : 'Conectarme'}</button>
    </div>
  )
}
function Job({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <Phone label={`Proveedor · ${title}`} caption={`Proveedor · ${title}`}>
      <MapBackground pins={false} />
      <div className="ugo-dp-marker" style={{ left: '40%', top: '36%' }}><UgoMark size={20} /></div>
      <div className="ugo-dp-sheet ugo-dp-sheet--job">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-provider">
          <div className="ugo-dp-offer-icon"><Icon name="bolt" size={18} /></div>
          <div className="ugo-dp-grow"><div className="ugo-dp-name ugo-dp-name--sm">{offer.client} · {offer.service}</div><div className="ugo-dp-onroute">{sub}</div></div>
        </div>
        {children}
      </div>
    </Phone>
  )
}


function ProviderPhone({ s, d }: { s: State; d: Dispatch<Action> }) {
  if (s.phase === 'offer') {
    return (
      <Phone label="Proveedor · oportunidad" caption="Proveedor · Oportunidad">
        <MapBackground pins={false} />
        <ProviderHeader s={s} d={d} />
        <div className="ugo-dp-sheet ugo-dp-sheet--offers">
          <div className="ugo-dp-handle" />
          <h3 className="ugo-dp-section-title">Nueva oportunidad</h3>
          <div className="ugo-dp-offer">
            <div className="ugo-dp-name ugo-dp-name--sm">{offer.problem}</div>
            <div className="ugo-dp-small">{offer.client} · {offer.distanceKm.toString().replace('.', ',')} km · ganancia <b>$ {formatArs(offer.earnings)}</b></div>
            <div className="ugo-dp-btnrow ugo-dp-btnrow--tight" style={{ marginTop: 12 }}>
              <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'DECLINE' })}>NO PUEDO TOMARLO</button>
              <button type="button" className="ugo-dp-btn" onClick={() => d({ type: 'ACCEPT' })}>ACEPTAR</button>
            </div>
          </div>
        </div>
      </Phone>
    )
  }

  if (s.phase === 'assigned') {
    return (
      <Job title="Misión" sub="Aceptado · esperando forma de pago">
        <div className="ugo-dp-address"><Icon name="pin" size={16} /> Centro, Florianópolis</div>
        <p className="ugo-dp-small">{s.payment ? 'El cliente eligió cómo pagar.' : 'El cliente todavía no eligió forma de pago.'}</p>
        <div className="ugo-dp-footer-stack">
          <button type="button" className="ugo-dp-btn" disabled={!s.payment} onClick={() => d({ type: 'ON_WAY' })}>ESTOY YENDO</button>
        </div>
      </Job>
    )
  }

  if (s.phase === 'enroute') {
    return (
      <Job title="En camino" sub={`Llegás en ${s.eta} min`}>
        <p className="ugo-dp-small">La llegada se valida sola cuando estés a 200 m. Si no se detecta, usá el respaldo.</p>
        <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'ARRIVED_MANUAL' })}>YA LLEGUÉ</button>
      </Job>
    )
  }

  if (s.phase === 'arrived') {
    const needsEvidence = s.initialRequired && !s.initialDone
    return (
      <Job title="Llegada" sub="Llegaste a la ubicación">
        {needsEvidence ? (
          <>
            <p className="ugo-dp-small">Esta categoría pide una foto del estado inicial antes de empezar.</p>
            <img src={work1} alt="Foto inicial" className="ugo-dp-thumb" />
            <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'UPLOAD_INITIAL' })}>Subir foto inicial</button>
          </>
        ) : null}
        <button type="button" className="ugo-dp-btn" disabled={needsEvidence} onClick={() => d({ type: 'START' })}>EMPEZAR TRABAJO</button>
      </Job>
    )
  }

  if (s.phase === 'working') {
    return (
      <Job title="Trabajo" sub="Trabajo en curso">
        <p className="ugo-dp-small">Cuando termines, marcá LISTO para pedir la revisión del cliente.</p>
        <button type="button" className="ugo-dp-btn" onClick={() => d({ type: 'DONE' })}>LISTO</button>
      </Job>
    )
  }

  if (s.phase === 'completion') {
    const needsFinal = s.finalRequired && !s.finalDone
    return (
      <Job title="Cierre" sub="Trabajo terminado">
        {needsFinal ? (
          <>
            <p className="ugo-dp-small">Subí una foto final del trabajo para pedir la revisión.</p>
            <img src={work2} alt="Foto final" className="ugo-dp-thumb" />
            <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'UPLOAD_FINAL' })}>Subir foto final</button>
          </>
        ) : null}
        <button type="button" className="ugo-dp-btn" disabled={needsFinal} onClick={() => d({ type: 'REQUEST_REVIEW' })}>SOLICITAR REVISIÓN</button>
      </Job>
    )
  }

  if (s.phase === 'review') {
    return (
      <Job title="Esperando aprobación" sub="El cliente está revisando">
        <p className="ugo-dp-small">Te avisamos cuando el cliente apruebe.</p>
      </Job>
    )
  }

  if (s.phase === 'disputed') {
    return (
      <Job title="Disputa" sub="Caso en revisión de UGO">
        <p className="ugo-dp-small">El caso está en revisión. No necesitás hacer nada más por ahora.</p>
        <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost" onClick={() => d({ type: 'RESET' })}>Volver a disponible</button>
      </Job>
    )
  }

  if (s.phase === 'completed') {
    return (
      <Phone label="Proveedor · completado" caption="Proveedor · Completado">
        <div className="ugo-dp-plain">
          <div className="ugo-dp-page-head"><div className="ugo-dp-name ugo-dp-name--sm">Trabajo completado</div></div>
          <div className="ugo-dp-summary"><span>Ganado en esta demo</span><b>$ {formatArs(s.earned)}</b><small>Suma de esta demo</small></div>
        </div>
        <div className="ugo-dp-plain-footer"><button type="button" className="ugo-dp-btn" onClick={() => d({ type: 'RESET' })}>Volver a disponible</button></div>
      </Phone>
    )
  }

  // need / confirm / searching (sin oportunidad todavía)
  return (
    <Phone label="Proveedor · disponible" caption="Proveedor · Disponible">
      <MapBackground pins={false} />
      <ProviderHeader s={s} d={d} />
      <div className="ugo-dp-sheet ugo-dp-sheet--offers">
        <div className="ugo-dp-handle" />
        <h3 className="ugo-dp-section-title">{s.providerOnline ? '¿Qué tengo que hacer ahora?' : 'Estás desconectado'}</h3>
        <p className="ugo-dp-desc">{s.providerOnline ? 'Esperando oportunidades cerca. Te avisamos cuando haya una.' : 'Conectate para recibir oportunidades.'}</p>
      </div>
    </Phone>
  )
}

/** Demo principal: cliente y proveedor con estado compartido. */
export function RealFlowDemo() {
  const [s, d] = useFlow()
  return (
    <div className="ugo-rf-wrap">
      <div className="ugo-rf-row">
        <ClientPhone s={s} d={d} />
        <ProviderPhone s={s} d={d} />
      </div>
      <div className="ugo-rf-controls">
        <button type="button" className="ugo-rp-btn ugo-rp-btn--ghost" onClick={() => d({ type: 'RESET' })}>Reiniciar demo</button>
        {s.phase === 'need' && <span className="ugo-dp-small">Empezá tocando una categoría en el celular del cliente.</span>}
        {s.phase === 'searching' && <span className="ugo-dp-small">Esperando un profesional… (llega en unos segundos)</span>}
      </div>
    </div>
  )
}
