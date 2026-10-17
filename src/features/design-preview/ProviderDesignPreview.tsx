import{LocalizedText,useLocale}from'../../i18n/locale'
import { Avatar, MapBackground, Phone } from '../client/design-preview/ClientDesignPreview'
import { Icon, UgoMark } from '../client/design-preview/icons'
import work1 from '../client/design-preview/assets/work-1.jpg'
import work2 from '../client/design-preview/assets/work-2.jpg'
import work3 from '../client/design-preview/assets/work-3.jpg'
import { formatArs } from '../client/design-preview/data'
import { providerActiveJob, providerEarnings, providerOffers } from './roles-data'

/* Pantallas de Proveedor (réplica de design/mockups/ugo-proveedor-*.png). Solo preview. */

function ProviderBottomNav({ active }: { active: 'inicio' | 'trabajos' | 'ganancias' | 'perfil' }) {
  const{t}=useLocale()
  const items: { id: typeof active; label: string; icon: 'home' | 'list' | 'layers' | 'user' }[] = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'trabajos', label: 'Trabajos', icon: 'list' },
    { id: 'ganancias', label: 'Ganancias', icon: 'layers' },
    { id: 'perfil', label: 'Perfil', icon: 'user' },
  ]
  return (
    <nav className="ugo-dp-tabbar" aria-label={t('preview.providerMenu')}>
      {items.map((i) => (
        <span key={i.id} className={`ugo-dp-tab${i.id === active ? ' ugo-dp-tab--on' : ''}`}>
          <Icon name={i.icon} size={22} />
          {i.label}
        </span>
      ))}
    </nav>
  )
}

function ProviderTopBar({ right }: { right?: 'toggle' }) {
  const{t}=useLocale()
  return (
    <div className="ugo-dp-topbar">
      <button type="button" className="ugo-dp-round" aria-label={t('preview.menu')}>
        <Icon name="menu" size={22} />
      </button>
      <div className="ugo-dp-pill ugo-dp-loc">
        <span className="ugo-dp-loc-main">
          <Icon name="pin" size={18} />
          <strong><LocalizedText id="preview.myArea"/></strong>
        </span>
        <span className="ugo-dp-loc-sub">{t('preview.placeCenter')}</span>
      </div>
      {right === 'toggle' ? (
        <span className="ugo-dp-switch" role="switch" aria-checked="true" aria-label={t('preview.available')}>
          <i /> <LocalizedText id="providerPayout.available"/>
        </span>
      ) : (
        <button type="button" className="ugo-dp-round" aria-label={t('preview.notifications')}>
          <Icon name="bell" size={22} />
          <span className="ugo-dp-dot" />
        </button>
      )}
    </div>
  )
}

/** P1 · Inicio del proveedor: disponibilidad y ofertas cerca */
export function ProviderHomeScreen() {
  const{t}=useLocale()
  return (
    <Phone label="Inicio del proveedor" caption="P1 · Inicio · ofertas cerca">
      <MapBackground pins={false} />
      <div className="ugo-dp-marker" style={{ left: '34%', top: '34%' }}><UgoMark size={20} /></div>
      <div className="ugo-dp-marker ugo-dp-marker--muted" style={{ left: '68%', top: '46%' }}><UgoMark size={18} /></div>
      <ProviderTopBar right="toggle" />
      <div className="ugo-dp-sheet ugo-dp-sheet--offers">
        <div className="ugo-dp-handle" />
        <h3 className="ugo-dp-section-title"><LocalizedText id="preview.nearbyOffers"/></h3>
        {providerOffers.map((o) => (
          <div key={o.id} className="ugo-dp-offer">
            <div className="ugo-dp-offer-head">
              <span className="ugo-dp-offer-icon"><Icon name="bolt" size={18} /></span>
              <div className="ugo-dp-grow">
                <div className="ugo-dp-name ugo-dp-name--sm">{o.client} · {o.service}</div>
                <div className="ugo-dp-small">{o.distanceKm.toString().replace('.', ',')} <LocalizedText id="preview.estimatedEarnings"/> <b>$ {formatArs(o.earnings)}</b></div>
              </div>
            </div>
            <div className="ugo-dp-btnrow ugo-dp-btnrow--tight">
              <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost"><LocalizedText id="screen.opportunities.25"/></button>
              <button type="button" className="ugo-dp-btn"><LocalizedText id="preview.accept"/></button>
            </div>
          </div>
        ))}
      </div>
      <ProviderBottomNav active="inicio" />
    </Phone>
  )
}

/** P2 · Trabajo en curso: pasos y marcar llegada */
export function ProviderActiveJobScreen() {
  const{t}=useLocale()
  const j = providerActiveJob
  return (
    <Phone label="Trabajo en curso del proveedor" caption="P2 · Trabajo en curso">
      <MapBackground pins={false} />
      <svg className="ugo-dp-route" viewBox="0 0 360 760" preserveAspectRatio="none" aria-hidden="true">
        <path d="M120 300 Q160 250 190 240 T260 150" />
      </svg>
      <div className="ugo-dp-marker" style={{ left: 120, top: 320 }}><UgoMark size={20} /></div>
      <div className="ugo-dp-marker" style={{ left: 260, top: 160 }}><Icon name="pin" size={20} /></div>
      <div className="ugo-dp-topbar">
        <button type="button" className="ugo-dp-round" aria-label={t('preview.back')}><Icon name="back" size={22} /></button>
        <div className="ugo-dp-pill ugo-dp-loc ugo-dp-loc--row">
          <span className="ugo-dp-chip ugo-dp-chip--ok"><LocalizedText id="preview.arrivedShort"/></span>
        </div>
      </div>
      <div className="ugo-dp-sheet ugo-dp-sheet--job">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-provider">
          <Avatar />
          <div className="ugo-dp-grow">
            <div className="ugo-dp-name ugo-dp-name--sm">{j.client}</div>
            <div className="ugo-dp-service">{j.service}</div>
          </div>
          <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.message')}><Icon name="message" size={18} /></button>
        </div>
        <div className="ugo-dp-address"><Icon name="pin" size={16} /> {j.address}</div>
        <ol className="ugo-dp-stepper" aria-label={t('preview.workProgress')}>
          {j.steps.map((s, i) => (
            <li key={s} className={i < j.currentStep ? 'is-done' : i === j.currentStep ? 'is-current' : ''}>
              <span>{i < j.currentStep ? <Icon name="check" size={12} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <button type="button" className="ugo-dp-btn"><LocalizedText id="preview.startWork"/></button>
        <p className="ugo-dp-small ugo-dp-center-text"><LocalizedText id="preview.locationShared"/></p>
      </div>
    </Phone>
  )
}

/** P3 · Evidencia final */
export function ProviderEvidenceScreen() {
  const{t}=useLocale()
  return (
    <Phone label="Evidencia final del proveedor" caption="P3 · Evidencia final">
      <div className="ugo-dp-plain">
        <div className="ugo-dp-page-head">
          <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.back')}><Icon name="back" size={20} /></button>
          <div>
            <div className="ugo-dp-name ugo-dp-name--sm"><LocalizedText id="ugoWeb.finalEvidence"/></div>
            <div className="ugo-dp-small"><LocalizedText id="preview.backFinalPhoto"/></div>
          </div>
        </div>
        <div className="ugo-dp-photo-grid">
          {[work1, work2, work3].map((src, i) => (
            <img key={i} src={src} alt={`Foto de evidencia ${i + 1}`} className="ugo-dp-photo-tile" />
          ))}
          <button type="button" className="ugo-dp-photo-tile ugo-dp-photo-add" aria-label={t('preview.addPhoto')}>
            <Icon name="plus" size={26} />
            <LocalizedText id="adminSurface.add"/>
          </button>
        </div>
        <label className="ugo-dp-field-label" htmlFor="ugo-dp-notes"><LocalizedText id="preview.clientNotes"/></label>
        <div id="ugo-dp-notes" className="ugo-dp-field"><LocalizedText id="preview.workNote"/></div>
        <ul className="ugo-dp-checklist">
          <li><Icon name="check" size={18} /> <LocalizedText id="preview.completedWork"/></li>
          <li><Icon name="check" size={18} /> <LocalizedText id="preview.cleanArea"/></li>
        </ul>
        <div className="ugo-dp-plain-footer">
          <button type="button" className="ugo-dp-btn"><LocalizedText id="preview.requestReview"/></button>
        </div>
      </div>
      <ProviderBottomNav active="trabajos" />
    </Phone>
  )
}

/** P4 · Ganancias */
export function ProviderEarningsScreen() {
  const{t}=useLocale()
  const e = providerEarnings
  const max = Math.max(...e.days.map((d) => d.value))
  return (
    <Phone label="Ganancias del proveedor" caption="P4 · Ganancias">
      <div className="ugo-dp-plain">
        <div className="ugo-dp-page-head ugo-dp-page-head--between">
          <div className="ugo-dp-name"><LocalizedText id="screen.provider_profile.15"/></div>
          <span className="ugo-dp-chip"><LocalizedText id="preview.thisWeek"/></span>
        </div>
        <div className="ugo-dp-summary">
          <span><LocalizedText id="preview.totalCollected"/></span>
          <b>$ {formatArs(e.total)}</b>
          <small>{e.jobs} <LocalizedText id="preview.completedJobs"/></small>
        </div>
        <div className="ugo-dp-bars" aria-label={t('preview.dailyEarnings')}>
          {e.days.map((d) => (
            <div key={d.label} className="ugo-dp-bar-col">
              <div className="ugo-dp-bar" style={{ height: `${(d.value / max) * 100}%` }} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
        <div className="ugo-dp-payouts-title"><LocalizedText id="preview.recentPayments"/></div>
        {e.payouts.map((p) => (
          <div key={p.service + p.date} className="ugo-dp-payout">
            <div>
              <div className="ugo-dp-name ugo-dp-name--xs">{p.service}</div>
              <div className="ugo-dp-small">{p.date}</div>
            </div>
            <b>$ {formatArs(p.amount)}</b>
          </div>
        ))}
      </div>
      <ProviderBottomNav active="ganancias" />
    </Phone>
  )
}

