import type { ReactNode } from 'react'
import './design-preview.css'
import {
  formatArs,
  previewAddress,
  previewCategories,
  previewEnRoute,
  previewProvider,
} from './data'

/*
 * Preview de diseño del Cliente (mockups aprobados).
 * Componentes aislados: NO están conectados a rutas ni a flujos reales.
 * Todo el CSS usa el prefijo `ugo-dp-` para no interferir con la app.
 */

function StatusBar() {
  return (
    <div className="ugo-dp-status" aria-hidden="true">
      <span>9:41</span>
      <span>●●● ◔ ▮</span>
    </div>
  )
}

function TopBar({ onBack }: { onBack?: boolean }) {
  return (
    <div className="ugo-dp-topbar">
      <button type="button" className="ugo-dp-round" aria-label={onBack ? 'Volver' : 'Menú'}>
        {onBack ? '‹' : '☰'}
      </button>
      <div className="ugo-dp-pill ugo-dp-loc">
        <strong>Mi ubicación</strong>
        {previewAddress} ⌄
      </div>
      <button type="button" className="ugo-dp-round" aria-label="Notificaciones">
        🔔<span className="ugo-dp-dot" />
      </button>
    </div>
  )
}

function ProviderPhoto({ large }: { large?: boolean }) {
  return <div className={`ugo-dp-photo${large ? ' ugo-dp-photo--lg' : ''}`} aria-hidden="true" />
}

function Phone({ children, dark, label, caption }: { children: ReactNode; dark?: boolean; label: string; caption: string }) {
  return (
    <figure className="ugo-dp-figure">
      <div className="ugo-dp-phone">
        <div className={`ugo-dp-screen${dark ? ' ugo-dp-screen--dark' : ''}`} role="img" aria-label={label}>
          <div className="ugo-dp-island" />
          <StatusBar />
          {children}
        </div>
      </div>
      <figcaption className="ugo-dp-caption">
        {caption}
      </figcaption>
    </figure>
  )
}

/** 1 · Inicio: mapa, buscador y categorías */
export function ClientHomeScreen() {
  return (
    <Phone label="Pantalla de inicio del cliente" caption="1 · Inicio">
      <div className="ugo-dp-map" aria-hidden="true" />
      <TopBar />
      <div className="ugo-dp-you" aria-hidden="true" />
      <div className="ugo-dp-sheet ugo-dp-sheet--home">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-search">🔍 ¿Qué servicio necesitás?</div>
        <div className="ugo-dp-cats">
          {previewCategories.map((c) => (
            <button type="button" key={c.id} className="ugo-dp-cat">
              <i>{c.icon}</i>
              {c.label}
            </button>
          ))}
        </div>
        <div className="ugo-dp-hint">⚡ Hay 12 electricistas cerca de vos</div>
      </div>
      <nav className="ugo-dp-tabbar" aria-label="Navegación principal">
        <span className="ugo-dp-tab ugo-dp-tab--on">⌂ Inicio</span>
        <span className="ugo-dp-tab">▦ Mis servicios</span>
        <span className="ugo-dp-tab">✉ Mensajes</span>
        <span className="ugo-dp-tab">◯ Perfil</span>
      </nav>
    </Phone>
  )
}

/** 2 · Proveedor seleccionado */
export function ProviderDetailScreen() {
  const p = previewProvider
  return (
    <Phone label="Detalle del proveedor seleccionado" caption="2 · Proveedor seleccionado">
      <div className="ugo-dp-map" aria-hidden="true" />
      <TopBar onBack />
      <div className="ugo-dp-pin" aria-hidden="true">🔧</div>
      <div className="ugo-dp-sheet ugo-dp-sheet--provider">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-provider">
          <ProviderPhoto large />
          <div className="ugo-dp-grow">
            <div className="ugo-dp-name">{p.name}</div>
            <div className="ugo-dp-rating">
              <span className="ugo-dp-star">★</span> {p.rating} ({p.reviews} reseñas)
            </div>
          </div>
          <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label="Guardar proveedor">♡</button>
        </div>
        <div className="ugo-dp-price">
          <span>⚡ {p.service}</span>
          <span>
            <b>$ {formatArs(p.pricePerHour)}</b> <small>/ hora</small>
          </span>
        </div>
        <div className="ugo-dp-chips">
          {p.verified && <span className="ugo-dp-chip ugo-dp-chip--ok">✔ Verificado</span>}
          <span className="ugo-dp-chip">🛡 Seguro</span>
          <span className="ugo-dp-chip">◷ {p.yearsExperience}+ años</span>
        </div>
        <p className="ugo-dp-desc">{p.description}</p>
        <div className="ugo-dp-works" aria-label="Trabajos realizados">
          {p.works.map((c, i) => (
            <div key={i} style={{ background: `linear-gradient(135deg, ${c}, #9DAAB8)` }} />
          ))}
        </div>
        <button type="button" className="ugo-dp-btn">Contratar</button>
      </div>
    </Phone>
  )
}

/** 3 · Asistente (mockup; la voz está deshabilitada en producción) */
export function AssistantListeningScreen() {
  return (
    <Phone dark label="Asistente escuchando (mockup)" caption="3 · Asistente Hugo (mockup)">
      <div className="ugo-dp-map ugo-dp-map--dark" aria-hidden="true" />
      <div className="ugo-dp-scrim" aria-hidden="true" />
      <div className="ugo-dp-orb" aria-hidden="true" />
      <div className="ugo-dp-listening">Te estoy escuchando…</div>
      <div className="ugo-dp-quote">“Necesito un electricista hoy en mi casa”</div>
      <div className="ugo-dp-actions">
        <button type="button">🔍<span>Buscar electricistas</span></button>
        <button type="button">⚡<span>Pedir ahora</span></button>
        <button type="button">📅<span>Agendar para después</span></button>
      </div>
      <button type="button" className="ugo-dp-close" aria-label="Cerrar asistente">✕</button>
    </Phone>
  )
}

/** 4 · Proveedor en camino */
export function ProviderEnRouteScreen() {
  const p = previewProvider
  return (
    <Phone label="Proveedor en camino" caption="4 · Proveedor en camino">
      <div className="ugo-dp-map" aria-hidden="true">
        <svg viewBox="0 0 360 700" preserveAspectRatio="xMidYMid slice" className="ugo-dp-route">
          <path d="M120 430 Q150 380 170 360 T270 230 T290 170" />
          <circle cx="290" cy="170" r="10" />
        </svg>
      </div>
      <TopBar onBack />
      <div className="ugo-dp-bubble" style={{ left: 250, top: 120 }}>
        <span>Llegando en</span>
        <b>{previewEnRoute.etaMinutes} min</b>
      </div>
      <div className="ugo-dp-sheet ugo-dp-sheet--route">
        <div className="ugo-dp-handle" />
        <div className="ugo-dp-provider">
          <ProviderPhoto />
          <div className="ugo-dp-grow">
            <div className="ugo-dp-name ugo-dp-name--sm">{p.name}</div>
            <div className="ugo-dp-onroute">En camino a tu ubicación</div>
          </div>
          <div className="ugo-dp-rating">
            <span className="ugo-dp-star">★</span> {p.rating}
          </div>
        </div>
        <div className="ugo-dp-vehicle">
          <div className="ugo-dp-box">
            🚗 Vehículo
            <b>{previewEnRoute.vehicle}</b>
            {previewEnRoute.plate}
          </div>
          <div className="ugo-dp-box">
            Llegada estimada
            <b className="ugo-dp-green">{previewEnRoute.etaMinutes} min</b>
          </div>
        </div>
        <div className="ugo-dp-btnrow">
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost">💬 Mensaje</button>
          <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost">📞 Llamar</button>
        </div>
        <div className="ugo-dp-banner">
          <span aria-hidden="true">🚶</span>
          <div>
            <b>Tu proveedor está en camino</b>
            <small>Te avisaremos cuando llegue.</small>
          </div>
        </div>
      </div>
    </Phone>
  )
}

/** 5 · Versión web de escritorio */
export function ClientWebScreen() {
  const p = previewProvider
  return (
    <figure className="ugo-dp-figure ugo-dp-figure--web">
      <div className="ugo-dp-web">
        <div className="ugo-dp-web-top">
          <span className="ugo-dp-logo">UGO</span>
          <div className="ugo-dp-web-actions">
            <span className="ugo-dp-chip">📍 {previewAddress}</span>
            <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label="Notificaciones">🔔</button>
          </div>
        </div>
        <div className="ugo-dp-web-body">
          <aside className="ugo-dp-side">
            <div className="ugo-dp-search">🔍 ¿Qué servicio necesitás?</div>
            <div className="ugo-dp-chips">
              {previewCategories.map((c) => (
                <span key={c.id} className="ugo-dp-chip">
                  {c.icon} {c.label}
                </span>
              ))}
            </div>
            <div className="ugo-dp-card">
              <div className="ugo-dp-provider">
                <ProviderPhoto large />
                <div>
                  <div className="ugo-dp-name">{p.name}</div>
                  <div className="ugo-dp-rating">
                    <span className="ugo-dp-star">★</span> {p.rating} ({p.reviews} reseñas)
                  </div>
                </div>
              </div>
              <div className="ugo-dp-price">
                <span>⚡ {p.service}</span>
                <span>
                  <b>$ {formatArs(p.pricePerHour)}</b> <small>/ hora</small>
                </span>
              </div>
              <div className="ugo-dp-chips">
                <span className="ugo-dp-chip ugo-dp-chip--ok">✔ Verificado</span>
                <span className="ugo-dp-chip">🛡 Seguro</span>
              </div>
              <button type="button" className="ugo-dp-btn">Contratar</button>
            </div>
          </aside>
          <main className="ugo-dp-web-map" aria-label="Mapa">
            <svg viewBox="0 0 900 700" preserveAspectRatio="xMidYMid slice" className="ugo-dp-route ugo-dp-route--web">
              <path d="M380 520 Q420 460 470 420 T640 250" />
              <circle cx="640" cy="250" r="12" />
            </svg>
            <div className="ugo-dp-float">
              <div className="ugo-dp-provider">
                <ProviderPhoto />
                <div className="ugo-dp-grow">
                  <div className="ugo-dp-name ugo-dp-name--sm">{p.name}</div>
                  <div className="ugo-dp-onroute">En camino a tu ubicación</div>
                </div>
              </div>
              <div className="ugo-dp-eta">
                <span>Llegada estimada</span>
                <b>{previewEnRoute.etaMinutes} min</b>
              </div>
              <button type="button" className="ugo-dp-btn ugo-dp-btn--ghost">💬 Mensaje</button>
            </div>
          </main>
        </div>
      </div>
      <figcaption className="ugo-dp-caption">5 · Versión web</figcaption>
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
