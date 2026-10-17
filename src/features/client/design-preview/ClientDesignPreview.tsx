import{LocalizedText,useLocale}from'../../../i18n/locale'
import type { ReactNode } from 'react'
import './design-preview.css'
import { Icon, UgoMark, type IconName } from './icons'
import avatar from './assets/provider-avatar.jpg'
import work1 from './assets/work-1.jpg'
import work2 from './assets/work-2.jpg'
import work3 from './assets/work-3.jpg'
import mapImg from './assets/map-floripa.jpg'
import {
  formatArs,
  previewAddress,
  previewCategories,
  previewEnRoute,
  previewProvider,
} from './data'

/*
 * Preview de diseño del Cliente (réplica de los mockups aprobados).
 * Componentes aislados: NO están conectados a rutas ni a flujos reales.
 * Todo el CSS usa el prefijo `ugo-dp-`.
 */

const categoryIcon: Record<string, IconName> = {
  electricista: 'plug',
  plomeria: 'droplet',
  limpieza: 'sparkle',
  montaje: 'wrench',
}

const works = [work1, work2, work3]

// Etiquetas de barrios de Florianópolis (posición aproximada, solo decorativa)
const neighborhoods: { label: string; x: number; y: number }[] = [
  { label: 'CENTRO', x: 42, y: 40 },
  { label: 'TRINDADE', x: 16, y: 26 },
  { label: 'AGRONÔMICA', x: 62, y: 60 },
  { label: 'COQUEIROS', x: 14, y: 58 },
]

export function MapBackground({ dark, pins = true }: { dark?: boolean; pins?: boolean }) {
  return (
    <div className={`ugo-dp-map${dark ? ' ugo-dp-map--dark' : ''}`} aria-hidden="true">
      <img src={mapImg} alt="" className="ugo-dp-map-img" />
      {!dark &&
        neighborhoods.map((n) => (
          <span key={n.label} className="ugo-dp-area" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
            {n.label}
          </span>
        ))}
      {pins && !dark && <span className="ugo-dp-you" />}
    </div>
  )
}

export function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div className={`ugo-dp-status${dark ? ' ugo-dp-status--light' : ''}`} aria-hidden="true">
      <span>9:41</span>
      <span className="ugo-dp-signal">
        <i /><i /><i /><i />
        <span className="ugo-dp-battery" />
      </span>
    </div>
  )
}

function TopBar({ onBack }: { onBack?: boolean }) {
  const{t}=useLocale()
  return (
    <div className="ugo-dp-topbar">
      <button type="button" className="ugo-dp-round" aria-label={onBack ? 'Volver' : 'Menú'}>
        <Icon name={onBack ? 'back' : 'menu'} size={22} />
      </button>
      <div className="ugo-dp-pill ugo-dp-loc">
        <span className="ugo-dp-loc-main">
          <Icon name="pin" size={18} />
          <strong><LocalizedText id="clientQuantum.location"/></strong>
        </span>
        <span className="ugo-dp-loc-sub">{previewAddress}</span>
      </div>
      <button type="button" className="ugo-dp-round" aria-label={t('preview.notifications')}>
        <Icon name="bell" size={22} />
        <span className="ugo-dp-dot" />
      </button>
    </div>
  )
}

export function Phone({ children, dark, label, caption }: { children: ReactNode; dark?: boolean; label: string; caption: string }) {
  return (
    <figure className="ugo-dp-figure">
      <div className="ugo-dp-phone">
        <div className={`ugo-dp-screen${dark ? ' ugo-dp-screen--dark' : ''}`} role="img" aria-label={label}>
          <div className="ugo-dp-island" />
          <StatusBar dark={dark} />
          {children}
        </div>
      </div>
      <figcaption className="ugo-dp-caption">{caption}</figcaption>
    </figure>
  )
}

export function Avatar({ large }: { large?: boolean }) {
  const{t}=useLocale()
  return <img src={avatar} alt={t('preview.avatarAlt')} className={`ugo-dp-photo${large ? ' ugo-dp-photo--lg' : ''}`} />
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="ugo-dp-stars" aria-label={`${value} de 5 estrellas`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={13} className="ugo-dp-star-icon" style={{ fill: 'currentColor' }} />
      ))}
    </span>
  )
}

/** 1 · Inicio: mapa, buscador y categorías */
export function ClientHomeScreen() {
  const{t}=useLocale()
  return (
    <Phone label="Pantalla de inicio del cliente" caption="1 · Inicio">
      <MapBackground />
      <TopBar />
      <div className="ugo-dp-sheet ugo-dp-sheet--home">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-search">
          <Icon name="search" size={20} />
          <span><LocalizedText id="clientQuantum.serviceQuestion"/></span>
        </div>
        <div className="ugo-dp-cats">
          {previewCategories.map((c) => (
            <button type="button" key={c.id} className="ugo-dp-cat">
              <i>
                <Icon name={categoryIcon[c.id]} size={26} />
              </i>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <nav className="ugo-dp-tabbar" aria-label={t('sharedUi.navigation')}>
        <span className="ugo-dp-tab ugo-dp-tab--on"><Icon name="home" size={22} /><LocalizedText id="screen.client_history.1"/></span>
        <span className="ugo-dp-tab"><Icon name="list" size={22} /><LocalizedText id="preview.myServices"/></span>
        <span className="ugo-dp-tab"><Icon name="message" size={22} /><LocalizedText id="preview.messages"/></span>
        <span className="ugo-dp-tab"><Icon name="user" size={22} /><LocalizedText id="providerProfile.title"/></span>
      </nav>
    </Phone>
  )
}

/** 2 · Proveedor seleccionado */
export function ProviderDetailScreen() {
  const{t}=useLocale()
  const p = previewProvider
  return (
    <Phone label="Detalle del proveedor seleccionado" caption="2 · Proveedor seleccionado">
      <MapBackground pins={false} />
      <TopBar onBack />
      <div className="ugo-dp-marker" style={{ left: '50%', top: '40%' }}>
        <UgoMark size={20} />
      </div>
      <div className="ugo-dp-sheet ugo-dp-sheet--provider">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-provider">
          <Avatar large />
          <div className="ugo-dp-grow">
            <div className="ugo-dp-name">{p.name}</div>
            <div className="ugo-dp-service">{p.service} <Icon name="bolt" size={14} className="ugo-dp-bolt" /></div>
            <div className="ugo-dp-rating">
              <Stars value={p.rating} /> <strong>{p.rating}</strong> ({p.reviews} <LocalizedText id="admin.reports.reviews"/>
            </div>
          </div>
          <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.saveProvider')}>
            <Icon name="heart" size={20} />
          </button>
        </div>
        <div className="ugo-dp-price">
          <b>$ {formatArs(p.pricePerHour)}</b> <small><LocalizedText id="screen.admin_tariffs.18"/></small>
        </div>
        <div className="ugo-dp-chips">
          {p.verified && <span className="ugo-dp-chip ugo-dp-chip--ok"><Icon name="check" size={14} /><LocalizedText id="clientHome.verified"/></span>}
          <span className="ugo-dp-chip ugo-dp-chip--ok"><Icon name="shield" size={14} /><LocalizedText id="clientQuantum.insured"/></span>
          <span className="ugo-dp-chip ugo-dp-chip--ok"><Icon name="clock" size={14} />{p.yearsExperience}<LocalizedText id="verification.years"/></span>
        </div>
        <p className="ugo-dp-desc"><LocalizedText id="preview.listedTechnician"/> {p.description}</p>
        <div className="ugo-dp-works" aria-label={t('preview.works')}>
          {works.map((src, i) => (
            <img key={i} src={src} alt="" />
          ))}
        </div>
        <button type="button" className="ugo-dp-btn"><LocalizedText id="preview.choosePayment"/></button>
      </div>
    </Phone>
  )
}

/** 3 · Asistente (mockup; la voz está deshabilitada en producción) */
export function AssistantListeningScreen() {
  const{t}=useLocale()
  return (
    <Phone dark label="Asistente escuchando (mockup)" caption="3 · Asistente Hugo (mockup)">
      <MapBackground dark />
      <div className="ugo-dp-scrim" aria-hidden="true" />
      <div className="ugo-dp-orb" aria-hidden="true" />
      <div className="ugo-dp-listening"><LocalizedText id="preview.listening"/></div>
      <div className="ugo-dp-quote"><LocalizedText id="preview.voiceSample"/></div>
      <div className="ugo-dp-actions">
        <button type="button"><Icon name="search" size={22} /><span><LocalizedText id="preview.searchElectricians"/></span></button>
        <button type="button"><Icon name="bolt" size={22} /><span><LocalizedText id="preview.requestNow"/></span></button>
        <button type="button"><Icon name="calendar" size={22} /><span><LocalizedText id="preview.scheduleLater"/></span></button>
      </div>
      <button type="button" className="ugo-dp-close" aria-label={t('preview.closeAssistant')}>
        <Icon name="x" size={22} />
      </button>
    </Phone>
  )
}

/** 4 · Proveedor en camino */
export function ProviderEnRouteScreen() {
  const p = previewProvider
  return (
    <Phone label="Proveedor en camino" caption="4 · Proveedor en camino">
      <MapBackground pins={false} />
      <svg className="ugo-dp-route" viewBox="0 0 360 760" preserveAspectRatio="none" aria-hidden="true">
        <path d="M95 300 Q140 260 170 240 T265 150" />
      </svg>
      <div className="ugo-dp-marker" style={{ left: 95, top: 280 }}>
        <UgoMark size={20} />
      </div>
      <div className="ugo-dp-car" style={{ left: 255, top: 130 }}>
        <Icon name="car" size={26} />
      </div>
      <TopBar onBack />
      <div className="ugo-dp-bubble" style={{ left: 240, top: 215 }}>
        <span><LocalizedText id="preview.arrivingIn"/></span>
        <b>{previewEnRoute.etaMinutes} <LocalizedText id="screen.admin_tariffs.19"/></b>
      </div>
      <div className="ugo-dp-sheet ugo-dp-sheet--route">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-provider">
          <Avatar />
          <div className="ugo-dp-grow">
            <div className="ugo-dp-name ugo-dp-name--sm">{p.name}</div>
            <div className="ugo-dp-onroute"><LocalizedText id="preview.enRouteLocation"/></div>
          </div>
        </div>
        <div className="ugo-dp-meta">
          <span className="ugo-dp-rating"><Stars value={p.rating} /> <strong>{p.rating}</strong></span>
          <span className="ugo-dp-vehicle-tag"><Icon name="car" size={16} />{previewEnRoute.vehicle}</span>
          <span className="ugo-dp-plate">{previewEnRoute.plate}</span>
        </div>
        <div className="ugo-dp-eta-box">
          <LocalizedText id="preview.estimatedArrival"/> <b>{previewEnRoute.etaMinutes} <LocalizedText id="screen.admin_tariffs.19"/></b>
        </div>
        <div className="ugo-dp-btnrow">
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost"><Icon name="message" size={18} /><LocalizedText id="adminSurface.message"/></button>
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost"><Icon name="phone" size={18} /><LocalizedText id="preview.call"/></button>
        </div>
        <div className="ugo-dp-banner">
          <Icon name="walk" size={22} />
          <div>
            <b><LocalizedText id="preview.providerEnRoute"/></b>
            <small><LocalizedText id="preview.weWillNotify"/></small>
          </div>
        </div>
      </div>
    </Phone>
  )
}

/** 5 · Versión web de escritorio */
export function ClientWebScreen() {
  const{t}=useLocale()
  const p = previewProvider
  return (
    <figure className="ugo-dp-figure ugo-dp-figure--web">
      <div className="ugo-dp-web">
        <div className="ugo-dp-web-top">
          <span className="ugo-dp-logo"><UgoMark size={30} /> <LocalizedText id="ugoWebRemaining.brand"/></span>
          <span className="ugo-dp-chip ugo-dp-chip--loc"><Icon name="pin" size={16} />{previewAddress}<LocalizedText id="providerProfile.cityPlaceholder"/></span>
          <div className="ugo-dp-web-actions">
            <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.notifications')}>
              <Icon name="bell" size={20} />
            </button>
          </div>
        </div>
        <div className="ugo-dp-web-body">
          <aside className="ugo-dp-side">
            <div className="ugo-dp-search">
              <span><LocalizedText id="clientQuantum.serviceQuestion"/></span>
              <Icon name="search" size={20} />
            </div>
            <div className="ugo-dp-cat-grid">
              {previewCategories.map((c) => (
                <span key={c.id} className="ugo-dp-cat-chip">
                  <Icon name={categoryIcon[c.id]} size={18} />
                  {c.label}
                </span>
              ))}
            </div>
            <div className="ugo-dp-card">
              <img src={work1} alt="" className="ugo-dp-card-hero" />
              <div className="ugo-dp-card-body">
                <div className="ugo-dp-name ugo-dp-center">{p.name}</div>
                <div className="ugo-dp-service ugo-dp-center">{p.service} <LocalizedText id="preview.registered"/></div>
                <div className="ugo-dp-rating ugo-dp-center">
                  <Stars value={p.rating} /> <strong>{p.rating}</strong> ({p.reviews} <LocalizedText id="admin.reports.reviews"/>
                </div>
                <div className="ugo-dp-price ugo-dp-center">
                  <b>$ {formatArs(p.pricePerHour)}</b> <small><LocalizedText id="screen.admin_tariffs.18"/></small>
                </div>
                <button type="button" className="ugo-dp-btn"><LocalizedText id="preview.choosePayment"/></button>
              </div>
            </div>
          </aside>
          <main className="ugo-dp-web-map" aria-label={t('adminShell.map')}>
            <MapBackground pins={false} />
            <div className="ugo-dp-marker ugo-dp-marker--web" style={{ left: '52%', top: '48%' }}>
              <UgoMark size={22} />
            </div>
            <div className="ugo-dp-float">
              <div className="ugo-dp-float-head">
                <strong><LocalizedText id="preview.arrivingIn"/> {previewEnRoute.etaMinutes} <LocalizedText id="screen.admin_tariffs.19"/></strong>
              </div>
              <div className="ugo-dp-provider">
                <Avatar />
                <div className="ugo-dp-grow">
                  <div className="ugo-dp-onroute"><LocalizedText id="clientWeb.onTheWay"/></div>
                  <div className="ugo-dp-small"><LocalizedText id="preview.minutesRemaining" params={{count:previewEnRoute.etaMinutes}}/></div>
                </div>
                <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('chat.message')}><Icon name="message" size={18} /></button>
                <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.call')}><Icon name="phone" size={18} /></button>
              </div>
            </div>
            <div className="ugo-dp-map-tools">
              <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.zoomIn')}><Icon name="plus" size={18} /></button>
              <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.zoomOut')}><Icon name="minus" size={18} /></button>
              <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.myLocation')}><Icon name="locate" size={18} /></button>
            </div>
          </main>
        </div>
      </div>
      <figcaption className="ugo-dp-caption"><LocalizedText id="preview.webVersion"/></figcaption>
    </figure>
  )
}

/** Galería con las 5 pantallas, lista para montar en un preview aislado. */
export default function ClientDesignPreview() {
  return (
    <main className="ugo-dp-gallery">
      <ClientHomeScreen />
      <ProviderDetailScreen />
      <AssistantListeningScreen />
      <ProviderEnRouteScreen />
      <ClientWebScreen />
    </main>
  )
}
