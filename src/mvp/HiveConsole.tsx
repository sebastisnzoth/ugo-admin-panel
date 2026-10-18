import React,{useState} from 'react'
import './hive-console.css'

const agents=[
 ['Hugo','Coordenação'],['Architect','Arquitetura'],['Developer','Desenvolvimento'],
 ['QA','Qualidade'],['Security','Segurança'],['DevOps','Infraestrutura'],
 ['Judge','Avaliação'],['Sentinel','Supervisão'],['Research','Pesquisa'],
] as const

type View='overview'|'chat'|'agents'
/**
 * Preparatory read-only console. Do not infer deployment or model availability
 * from the presence of this component. Backend runtime and inference are gated.
 */
export function HiveConsole(){
 const [view,setView]=useState<View>('overview')
 const [draft,setDraft]=useState('')
 return <div className="ugo-hive" aria-label="UGO Hive">
  <header className="ugo-hive-header"><div><small>U.GO · SUPER ADMIN</small><h1>UGO Hive</h1><p>Centro de inteligência · interface de preparação</p></div><strong className="ugo-hive-state">INFERÊNCIA DESATIVADA</strong></header>
  <nav className="ugo-hive-tabs" aria-label="Navegação Hive">
   <button type="button" aria-current={view==='overview'?'page':undefined} onClick={()=>setView('overview')}>Visão geral</button>
   <button type="button" aria-current={view==='chat'?'page':undefined} onClick={()=>setView('chat')}>Chat IA</button>
   <button type="button" aria-current={view==='agents'?'page':undefined} onClick={()=>setView('agents')}>Agentes</button>
  </nav>
  {view==='overview'&&<div className="ugo-hive-stack">
    <div className="ugo-hive-cards">
     <article><small>Router Hive</small><strong>PREPARADO</strong><p>O código foi integrado; chamadas reais ainda não foram verificadas.</p></article>
     <article><small>FreeLLMAPI / OpenRouter</small><strong>NÃO VERIFICADO</strong><p>Provedor, modelo exato, custo e pinning precisam de validação.</p></article>
     <article><small>Render / persistência remota</small><strong>NÃO VERIFICADO</strong><p>Nenhuma disponibilidade de execução é presumida.</p></article>
     <article><small>Empresa Autônoma</small><strong>NÃO ATIVADA</strong><p>O Autonomy Gate permanece independente deste painel.</p></article>
    </div>
    <section className="ugo-hive-panel"><h2>Estado operacional</h2>
     <p>Este painel não executa missões, não ativa modelos e não concede permissões. Métricas, consumo e tarefas somente aparecerão quando houver uma API autenticada com dados verificados.</p>
     <a href="https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/ugo-hive/IMPLEMENTATION_STATUS.md" target="_blank" rel="noopener noreferrer">Consultar checkpoint técnico ↗</a>
    </section>
   </div>}
  {view==='chat'&&<section className="ugo-hive-panel ugo-hive-chat" aria-label="Chat Hive">
   <div className="ugo-hive-chat-title"><div><h2>Conversa com Hugo</h2><p>Gateway de inferência indisponível até validação e autorização.</p></div><span>OFFLINE</span></div>
   <div className="ugo-hive-chat-empty" role="status"><strong>Chat não conectado</strong><p>Sem respostas simuladas. O histórico persistente, streaming e seleção de modelos dependem de backend seguro e autorizado.</p></div>
   <label htmlFor="ugo-hive-message">Mensagem</label>
   <textarea id="ugo-hive-message" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Disponível após habilitação segura do backend" disabled rows={3}/>
   <button type="button" disabled aria-disabled="true">Enviar · indisponível</button>
  </section>}
  {view==='agents'&&<section className="ugo-hive-panel"><h2>Funções planejadas</h2><p>Os papéis abaixo são o catálogo proposto, não agentes atualmente conectados.</p>
   <div className="ugo-hive-agents">{agents.map(([name,role])=><article key={name}><strong>{name}</strong><small>{role}</small><span>NÃO VERIFICADO</span></article>)}</div>
  </section>}
 </div>
}
