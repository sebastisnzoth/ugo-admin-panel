import React from 'react'
import ReactDOM from 'react-dom/client'
import { MvpApp } from './mvp/MvpApp'

class AppErrorBoundary extends React.Component<React.PropsWithChildren, {error: Error | null}> {
  state={error:null as Error|null}
  static getDerivedStateFromError(error:Error){return{error}}
  componentDidCatch(error:Error,info:React.ErrorInfo){console.error('UGO runtime error',error,info)}
  render(){
    if(this.state.error){
      return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:24,background:'#f8faf9',color:'#101828',fontFamily:'Inter,system-ui,sans-serif'}}>
        <section style={{width:'min(480px,100%)',background:'#fff',border:'1px solid #e4e7ec',borderRadius:20,padding:24,boxShadow:'0 18px 50px rgba(16,24,40,.10)'}}>
          <strong style={{color:'#067647',fontSize:13,letterSpacing:'.05em'}}>U.GO</strong>
          <h1 style={{fontSize:24,margin:'8px 0'}}>No pudimos cargar esta pantalla</h1>
          <p style={{color:'#667085',lineHeight:1.5}}>La aplicación encontró un error temporal. Recargá para volver a entrar sin perder tu cuenta.</p>
          <button type="button" onClick={()=>window.location.reload()} style={{width:'100%',minHeight:48,border:0,borderRadius:14,background:'#079455',color:'#fff',fontWeight:800,cursor:'pointer'}}>Recargar UGO</button>
        </section>
      </main>
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><MvpApp /></AppErrorBoundary>
  </React.StrictMode>,
)
