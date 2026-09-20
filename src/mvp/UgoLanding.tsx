import React from'react'
import'./ugo-landing.css'

const go=(path:string)=>{window.location.href=path}
const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})

const services=[
 ['Limpieza','Hogar, oficinas y alquileres temporarios.','✦'],
 ['Reparaciones','Soluciones rápidas para tu casa o negocio.','⌁'],
 ['Electricidad','Instalación, mantenimiento y urgencias.','ϟ'],
 ['Plomería','Pérdidas, instalaciones y mantenimiento.','◌'],
 ['Montaje','Muebles, soportes y pequeñas instalaciones.','◇'],
 ['Más servicios','UGO crece con nuevas categorías cerca tuyo.','＋'],
]

const steps=[
 ['01','Contanos qué necesitás','Escribí o hablale a Hugo. UGO entiende el pedido y organiza los datos importantes.'],
 ['02','Encontramos profesionales','Buscamos disponibilidad cerca de tu ubicación y te mostramos el avance.'],
 ['03','Seguís todo desde la app','Estado, comunicación, cierre, pago y calificación quedan en un mismo lugar.'],
]

export function UgoLanding(){
 return <main className="ugo-landing">
  <header className="ugo-landing-header">
   <button className="ugo-landing-brand" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="UGO inicio">U.GO</button>
   <nav aria-label="Navegación principal">
    <button onClick={()=>jump('servicios')}>Servicios</button>
    <button onClick={()=>jump('como-funciona')}>Cómo funciona</button>
    <button onClick={()=>jump('seguridad')}>Seguridad</button>
    <button onClick={()=>jump('proveedores')}>Para profesionales</button>
   </nav>
   <div className="ugo-landing-header-actions">
    <button className="ugo-landing-login" onClick={()=>go('/ugo-cliente/?app=client')}>Ingresar</button>
    <button className="ugo-landing-primary compact" onClick={()=>go('/ugo-cliente/?app=client')}>Pedir servicio</button>
   </div>
  </header>

  <section className="ugo-landing-hero">
   <div className="ugo-landing-hero-copy">
    <span className="ugo-landing-badge"><i/> UGO · servicios cerca de vos</span>
    <h1>Un pedido.<br/><em>Un profesional.</em><br/>Sin vueltas.</h1>
    <p>Pedí ayuda para tu casa, negocio o alquiler. UGO organiza el pedido, busca profesionales disponibles y te acompaña hasta el cierre.</p>
    <div className="ugo-landing-actions">
     <button className="ugo-landing-primary" onClick={()=>go('/ugo-cliente/?app=client')}>Encontrar un profesional <span>→</span></button>
     <button className="ugo-landing-secondary" onClick={()=>go('/ugo-proveedor/?app=provider')}>Quiero trabajar con UGO</button>
    </div>
    <div className="ugo-landing-proof" aria-label="Beneficios UGO">
     <span><b>✓</b> Seguimiento del servicio</span>
     <span><b>✓</b> Perfiles y calificaciones</span>
     <span><b>✓</b> Soporte con Hugo</span>
    </div>
   </div>

   <div className="ugo-landing-visual" aria-label="Vista conceptual de UGO">
    <div className="ugo-landing-map-grid"/>
    <span className="ugo-landing-map-label top">Florianópolis · ahora</span>
    <span className="ugo-landing-map-pin client"><b>◎</b><small>Vos</small></span>
    <span className="ugo-landing-map-pin pro p1"><b>JP</b><small>Electricista · 8 min</small></span>
    <span className="ugo-landing-map-pin pro p2"><b>MC</b><small>Limpieza · 12 min</small></span>
    <div className="ugo-landing-hugo-card">
     <div className="ugo-landing-hugo-orb">H</div>
     <div><small>HUGO · ASISTENTE UGO</small><strong>¿Qué necesitás hoy?</strong><span>Decímelo como te salga. Yo organizo el pedido.</span></div>
    </div>
   </div>
  </section>

  <section className="ugo-landing-services" id="servicios">
   <div className="ugo-landing-section-head">
    <span>SERVICIOS</span>
    <h2>Lo que necesitás, en un solo lugar.</h2>
    <p>Una experiencia simple para pedir servicios cotidianos sin perder tiempo buscando por todos lados.</p>
   </div>
   <div className="ugo-landing-service-grid">
    {services.map(([title,copy,icon])=><article key={title}>
     <i>{icon}</i><h3>{title}</h3><p>{copy}</p>
    </article>)}
   </div>
  </section>

  <section className="ugo-landing-how" id="como-funciona">
   <div className="ugo-landing-section-head light">
    <span>CÓMO FUNCIONA</span>
    <h2>De “necesito ayuda” a “listo”.</h2>
   </div>
   <div className="ugo-landing-step-grid">
    {steps.map(([num,title,copy])=><article key={num}>
     <strong>{num}</strong><div><h3>{title}</h3><p>{copy}</p></div>
    </article>)}
   </div>
  </section>

  <section className="ugo-landing-trust" id="seguridad">
   <div className="ugo-landing-trust-copy">
    <span className="ugo-landing-eyebrow">CONFIANZA UGO</span>
    <h2>Todo el servicio queda más claro.</h2>
    <p>UGO concentra información, estados y comunicación para que cliente y profesional sepan qué está pasando en cada momento.</p>
    <div className="ugo-landing-trust-list">
     <span><b>01</b><i>Perfiles, documentos y verificación de proveedores.</i></span>
     <span><b>02</b><i>Estados y seguimiento del servicio.</i></span>
     <span><b>03</b><i>Calificaciones, soporte y gestión de disputas.</i></span>
    </div>
   </div>
   <div className="ugo-landing-trust-card">
    <small>SERVICIO UGO</small>
    <h3>Electricidad residencial</h3>
    <div className="ugo-landing-status"><i/> Profesional asignado</div>
    <dl>
     <div><dt>Profesional</dt><dd>João · 4,9 ★</dd></div>
     <div><dt>Llegada estimada</dt><dd>8 minutos</dd></div>
     <div><dt>Estado</dt><dd>En camino</dd></div>
    </dl>
    <button onClick={()=>go('/ugo-cliente/?app=client')}>Abrir UGO Cliente</button>
   </div>
  </section>

  <section className="ugo-landing-provider-banner" id="proveedores">
   <div>
    <span>UGO PARA PROFESIONALES</span>
    <h2>Tu trabajo, más cerca.</h2>
    <p>Recibí oportunidades, administrá servicios y mantené tu actividad organizada desde una sola app.</p>
   </div>
   <button onClick={()=>go('/ugo-proveedor/?app=provider')}>Entrar como proveedor <span>→</span></button>
  </section>

  <section className="ugo-landing-final">
   <div className="ugo-landing-final-orb">H</div>
   <span>HUGO ESTÁ LISTO</span>
   <h2>Decime qué necesitás.<br/>UGO se ocupa del resto.</h2>
   <button className="ugo-landing-primary" onClick={()=>go('/ugo-cliente/?app=client')}>Empezar ahora <span>→</span></button>
  </section>

  <footer className="ugo-landing-footer">
   <div><b>U.GO</b><span>Servicios cerca de vos.</span></div>
   <nav>
    <button onClick={()=>go('/ugo-cliente/?app=client')}>Cliente</button>
    <button onClick={()=>go('/ugo-proveedor/?app=provider')}>Proveedor</button>
    <button onClick={()=>go('/ugo-admin/?app=admin')}>Admin</button>
   </nav>
   <small>© 2026 UGO · Florianópolis, Brasil</small>
  </footer>
 </main>
}
