import{LocalizedText,useLocale}from'../../i18n/locale'
import type { ReactNode } from 'react'
import { Icon, UgoMark } from '../client/design-preview/icons'
import {
  adminDisputes,
  adminInProgress,
  adminKpis,
  superAdminChecklist,
  superAdminGauges,
} from './roles-data'

/* Pantallas web de Admin y Super Admin (réplica de design/mockups/ugo-admin-*.png). Solo preview. */

function WebFrame({ children, label, caption }: { children: ReactNode; label: string; caption: string }) {
  return (
    <figure className="ugo-rp-figure">
      <div className="ugo-rp-window" role="img" aria-label={label}>
        <div className="ugo-rp-chrome"><i /><i /><i /></div>
        {children}
      </div>
      <figcaption className="ugo-dp-caption">{caption}</figcaption>
    </figure>
  )
}

const adminNav = ['Resumen', 'Servicios', 'Proveedores', 'Clientes', 'Pagos', 'Disputas', 'Reportes', 'Configuración']

function AdminSidebar({ active }: { active: string }) {
  return (
    <aside className="ugo-rp-sidebar">
      <div className="ugo-rp-brand"><UgoMark size={26} /> <LocalizedText id="ugoWebRemaining.brand"/></div>
      {adminNav.map((n) => (
        <span key={n} className={`ugo-rp-nav${n === active ? ' is-active' : ''}`}>{n}</span>
      ))}
    </aside>
  )
}

/** A1 · Dashboard operativo */
export function AdminDashboardScreen() {
  const{t}=useLocale()
  return (
    <WebFrame label="Dashboard de operaciones de Admin" caption="A1 · Admin · Operaciones">
      <div className="ugo-rp-body">
        <AdminSidebar active="Resumen" />
        <main className="ugo-rp-main">
          <header className="ugo-rp-top">
            <div className="ugo-rp-search"><Icon name="search" size={18} /> <LocalizedText id="preview.searchService"/></div>
            <span className="ugo-rp-chip"><LocalizedText id="flow.when.today"/></span>
            <button type="button" className="ugo-dp-round ugo-dp-round--sm" aria-label={t('preview.notifications')}><Icon name="bell" size={18} /></button>
            <span className="ugo-rp-avatar">A</span>
          </header>
          <h2 className="ugo-rp-title"><LocalizedText id="adminShell.operations"/></h2>
          <div className="ugo-rp-kpis">
            {adminKpis.map((k) => (
              <div key={k.label} className="ugo-rp-kpi">
                <span>{k.label}</span>
                <b>{k.value}</b>
              </div>
            ))}
          </div>
          <div className="ugo-rp-row">
            <section className="ugo-rp-card ugo-rp-card--chart">
              <div className="ugo-rp-card-title"><LocalizedText id="preview.servicesPerDay"/></div>
              <svg viewBox="0 0 400 140" className="ugo-rp-line" aria-hidden="true">
                <path d="M0 110 L60 90 L120 100 L180 60 L240 75 L300 40 L360 55 L400 25" />
                <path className="ugo-rp-line-fill" d="M0 110 L60 90 L120 100 L180 60 L240 75 L300 40 L360 55 L400 25 L400 140 L0 140 Z" />
              </svg>
            </section>
            <section className="ugo-rp-card ugo-rp-card--table">
              <div className="ugo-rp-card-title"><LocalizedText id="preview.servicesInProgress"/></div>
              <table>
                <thead><tr><th><LocalizedText id="screen.admin_users.15"/></th><th><LocalizedText id="screen.admin_services.20"/></th><th><LocalizedText id="screen.admin_services.19"/></th><th><LocalizedText id="screen.admin_native.22"/></th></tr></thead>
                <tbody>
                  {adminInProgress.map((r) => (
                    <tr key={r.client}>
                      <td>{r.client}</td>
                      <td>{r.provider}</td>
                      <td><span className={`ugo-rp-status ugo-rp-status--${r.tone}`}>{r.status}</span></td>
                      <td>{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </main>
      </div>
    </WebFrame>
  )
}

/** A2 · Disputas */
export function AdminDisputesScreen() {
  const d = adminDisputes[0]
  const steps = ['Solicitado', 'Aceptado', 'Llegada', 'Evidencia inicial', 'Evidencia final', 'Pago']
  return (
    <WebFrame label="Disputas en Admin" caption="A2 · Admin · Disputas">
      <div className="ugo-rp-body">
        <AdminSidebar active="Disputas" />
        <main className="ugo-rp-main ugo-rp-main--split">
          <section className="ugo-rp-list">
            <h2 className="ugo-rp-title"><LocalizedText id="screen.admin_reports.19"/></h2>
            {adminDisputes.map((x) => (
              <div key={x.id} className={`ugo-rp-dispute${x.id === d.id ? ' is-selected' : ''}`}>
                <div className="ugo-rp-dispute-head">
                  <b>{x.id}</b>
                  <span className={`ugo-rp-status ugo-rp-status--${x.status === 'Abierta' ? 'warn' : 'muted'}`}>{x.status}</span>
                </div>
                <div className="ugo-rp-small">{x.client} · {x.provider}</div>
                <p>{x.reason}</p>
              </div>
            ))}
          </section>
          <section className="ugo-rp-detail">
            <div className="ugo-rp-card-title">{d.id} <LocalizedText id="preview.timeline"/></div>
            <ol className="ugo-rp-timeline">
              {steps.map((s, i) => (
                <li key={s} className={i < 4 ? 'is-done' : ''}>
                  <span>{i < 4 ? <Icon name="check" size={14} /> : ''}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="ugo-rp-thumbs">
              <div /><div />
            </div>
            <div className="ugo-rp-actions">
              <button type="button" className="ugo-rp-btn ugo-rp-btn--ghost"><LocalizedText id="preview.resolveForCustomer"/></button>
              <button type="button" className="ugo-rp-btn"><LocalizedText id="preview.resolveForProvider"/></button>
            </div>
          </section>
        </main>
      </div>
    </WebFrame>
  )
}

/** S1 · Command Center (Super Admin) */
export function SuperAdminCommandCenterScreen() {
  return (
    <WebFrame label="Command Center de Super Admin" caption="S1 · Super Admin · Command Center">
      <div className="ugo-rp-body">
        <aside className="ugo-rp-sidebar ugo-rp-sidebar--dark">
          <div className="ugo-rp-brand"><UgoMark size={26} /> <LocalizedText id="ugoWebRemaining.brand"/></div>
          {['Gobierno', 'Readiness', 'Evidencia', 'Autonomía', 'Auditoría'].map((n) => (
            <span key={n} className={`ugo-rp-nav${n === 'Readiness' ? ' is-active' : ''}`}>{n}</span>
          ))}
        </aside>
        <main className="ugo-rp-main">
          <h2 className="ugo-rp-title"><LocalizedText id="preview.commandCenter"/></h2>
          <div className="ugo-rp-kpis">
            {superAdminGauges.map((g) => (
              <div key={g.label} className="ugo-rp-kpi">
                <span>{g.label}</span>
                <b>{g.value}</b>
                {g.value.endsWith('%') && (
                  <div className="ugo-rp-progress" aria-hidden="true">
                    <i style={{ width: g.value }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="ugo-rp-row">
            <section className="ugo-rp-card">
              <div className="ugo-rp-card-title"><LocalizedText id="preview.launchChecklist"/></div>
              {superAdminChecklist.map((c) => (
                <div key={c.item} className="ugo-rp-check-row">
                  <span>{c.item}</span>
                  <span className={`ugo-rp-status ugo-rp-status--${c.tone}`}>{c.status}</span>
                </div>
              ))}
            </section>
            <section className="ugo-rp-card">
              <div className="ugo-rp-card-title"><LocalizedText id="preview.globalControls"/></div>
              {['Pausar nuevas solicitudes', 'Modo mantenimiento'].map((t, i) => (
                <div key={t} className="ugo-rp-check-row">
                  <span>{t}</span>
                  <span className={`ugo-rp-switch${i === 0 ? '' : ' is-on'}`} aria-hidden="true"><i /></span>
                </div>
              ))}
              <div className="ugo-rp-card-title ugo-rp-log-title"><LocalizedText id="preview.recentEvents"/></div>
              <div className="ugo-rp-small"><LocalizedText id="preview.checklistUpdated"/></div>
              <div className="ugo-rp-small"><LocalizedText id="preview.evidenceVerified"/></div>
            </section>
          </div>
        </main>
      </div>
    </WebFrame>
  )
}
