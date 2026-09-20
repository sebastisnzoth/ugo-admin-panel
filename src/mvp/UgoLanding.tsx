import React from'react'
import'./ugo-landing.css'

const go=(path:string)=>{window.location.href=path}
const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})

const services=[
 ['Limpieza','Hogar, oficinas y alquileres'],
 ['Electricidad','Instalaciones y urgencias'],
 ['Plomería','Pérdidas y mantenimiento'],
 ['Reparaciones','Soluciones rápidas'],
 ['Montaje','Muebles y equipamiento'],
 ['Más servicios','Todo en una sola app'],
]

export function UgoLanding(){
 return <main className="ugo-landing">
  <header className="ugo-nav">
   <button className="ugo-logo" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>U.GO</button>
   <nav>
    <button onClick={()=>jump('servicios')}>Servicios</button>
    <button onClick={()=>jump('como')}>Cómo funciona</button>
    <button onClick={()=>jump('proveedores')}>Profesionales</button>
   </nav>
   <div className="ugo-nav-actions">
    <button className="ghost" onClick={()=>go('/ugo-cliente/?app=client')}>Ingresar</button>
    <button className="solid" onClick={()=>go('/ugo-cliente/?app=client')}>Pedir ahora</button>
   </div>
  </header>

  <section className="ugo-hero">
   <div className="ugo-hero-glow one"/>
   <div className="ugo-hero-glow two"/>
   <div className="ugo-hero-copy">
    <div className="ugo-live-pill"><i/> UGO está activo en Florianópolis</div>
    <h1>Un pedido.<br/><span>Un profesional.</span><br/>Sin vueltas.</h1>
    <p>Pedí un servicio hablando o escribiendo. Hugo entiende lo que necesitás, encuentra profesionales disponibles y te acompaña hasta que el trabajo termine.</p>
    <div className="ugo-hero-actions">
     <button className="ugo-cta primary" onClick={()=>go('/ugo-cliente/?app=client')}>Encontrar profesional <b>→</b></button>
     <button className="ugo-cta secondary" onClick={()=>go('/ugo-proveedor/?app=provider')}>Soy profesional</button>
    </div>
    <div className="ugo-hero-trust">
     <span><b>✓</b> Profesionales verificados</span>
     <span><b>✓</b> Seguimiento en vivo</span>
     <span><b>✓</b> Soporte con Hugo</span>
    </div>
   </div>

   <div className="ugo-hero-demo">
    <div className="ugo-demo-shell">
     <div className="ugo-demo-top">
      <div><small>UGO</small><strong>¿Qué necesitás hoy?</strong></div>
      <div className="ugo-avatar">SZ</div>
     </div>
     <div className="ugo-demo-search"><span>⌕</span><b>Necesito un electricista ahora</b></div>
     <div className="ugo-demo-map">
      <div className="road r1"/><div className="road r2"/><div className="road r3"/>
      <div className="ugo-user-dot"><i/></div>
      <div className="ugo-pro pro1"><b>JP</b><span>8 min</span></div>
      <div className="ugo-pro pro2"><b>MC</b><span>12 min</span></div>
      <div className="ugo-pro pro3"><b>AR</b><span>15 min</span></div>
     </div>
     <div className="ugo-demo-sheet">
      <div className="ugo-hugo">
       <div className="ugo-orb">H</div>
       <div><small>HUGO</small><strong>Encontré 3 profesionales cerca.</strong><span>João puede llegar en 8 minutos.</span></div>
      </div>
      <button onClick={()=>go('/ugo-cliente/?app=client')}>Ver profesionales <b>→</b></button>
     </div>
    </div>
    <div className="ugo-float-card a"><small>PROFESIONAL</small><strong>João P.</strong><span>★ 4,9 · Verificado</span></div>
    <div className="ugo-float-card b"><small>ESTADO</small><strong>En camino</strong><span>ETA 8 min</span></div>
   </div>
  </section>

  <section className="ugo-marquee">
   <span>UGO</span><i/> <span>LIMPIEZA</span><i/> <span>ELECTRICIDAD</span><i/> <span>PLOMERÍA</span><i/> <span>REPARACIONES</span><i/> <span>MONTAJE</span>
  </section>

  <section className="ugo-services" id="servicios">
   <div className="ugo-section-kicker">SERVICIOS CERCA DE VOS</div>
   <div className="ugo-section-title">
    <h2>Todo lo que necesitás.<br/><span>Sin perder tiempo.</span></h2>
    <p>UGO reúne los servicios cotidianos en una experiencia rápida, visual y simple.</p>
   </div>
   <div className="ugo-services-grid">
    {services.map(([title,copy],i)=><button key={title} className={"ugo-service-card card-"+(i+1)} onClick={()=>go('/ugo-cliente/?app=client')}>
     <span className="ugo-service-index">0{i+1}</span>
     <div><h3>{title}</h3><p>{copy}</p></div>
     <b>↗</b>
    </button>)}
   </div>
  </section>

  <section className="ugo-how" id="como">
   <div className="ugo-how-copy">
    <div className="ugo-section-kicker light">CÓMO FUNCIONA</div>
    <h2>Pedilo como<br/>lo dirías vos.</h2>
    <p>No tenés que llenar formularios eternos. Hugo interpreta el pedido y UGO arma el servicio.</p>
    <button onClick={()=>go('/ugo-cliente/?app=client')}>Probar UGO <span>→</span></button>
   </div>
   <div className="ugo-how-steps">
    <article><b>01</b><div><h3>Decilo</h3><p>“Necesito un plomero hoy a la tarde.”</p></div></article>
    <article><b>02</b><div><h3>UGO lo organiza</h3><p>Categoría, ubicación, horario y detalles.</p></div></article>
    <article><b>03</b><div><h3>Conectamos</h3><p>Encontramos al profesional indicado y seguís todo desde la app.</p></div></article>
   </div>
  </section>

  <section className="ugo-confidence">
   <div className="ugo-confidence-card">
    <div className="ugo-confidence-left">
     <span>CONFIANZA UGO</span>
     <h2>Todo queda claro.<br/>Todo queda registrado.</h2>
     <p>Estados del servicio, comunicación, pagos, calificaciones y soporte en un mismo lugar.</p>
    </div>
    <div className="ugo-confidence-metrics">
     <article><strong>24/7</strong><span>Seguimiento del pedido</span></article>
     <article><strong>1</strong><span>Flujo simple de principio a fin</span></article>
     <article><strong>✓</strong><span>Perfiles y documentos verificados</span></article>
    </div>
   </div>
  </section>

  <section className="ugo-provider" id="proveedores">
   <div className="ugo-provider-art">
    <div className="ugo-provider-phone">
     <div className="ugo-provider-head"><span>UGO PROVEEDOR</span><b>Online</b></div>
     <div className="ugo-provider-money"><small>HOY</small><strong>R$ 486</strong><span>3 servicios completados</span></div>
     <div className="ugo-provider-job"><small>NUEVA OPORTUNIDAD</small><strong>Instalación eléctrica</strong><span>2,4 km · R$ 180</span><button>Aceptar trabajo</button></div>
    </div>
   </div>
   <div className="ugo-provider-copy">
    <div className="ugo-section-kicker">PARA PROFESIONALES</div>
    <h2>Más trabajo.<br/><span>Menos vueltas.</span></h2>
    <p>Recibí oportunidades, administrá tu agenda, seguí tus servicios y tus cobros desde una sola app.</p>
    <button className="ugo-cta primary" onClick={()=>go('/ugo-proveedor/?app=provider')}>Entrar como proveedor <b>→</b></button>
   </div>
  </section>

  <section className="ugo-final">
   <div className="ugo-final-orb">H</div>
   <span>HUGO ESTÁ LISTO</span>
   <h2>Decime qué necesitás.<br/>UGO se ocupa del resto.</h2>
   <button onClick={()=>go('/ugo-cliente/?app=client')}>Empezar ahora <b>→</b></button>
  </section>

  <footer className="ugo-footer">
   <div><strong>U.GO</strong><span>Un pedido. Un profesional. Sin vueltas.</span></div>
   <div className="ugo-footer-links"><button onClick={()=>go('/ugo-cliente/?app=client')}>Cliente</button><button onClick={()=>go('/ugo-proveedor/?app=provider')}>Proveedor</button><button onClick={()=>go('/ugo-admin/?app=admin')}>Admin</button></div>
   <small>© 2026 UGO · Florianópolis, Brasil</small>
  </footer>
 </main>
}
