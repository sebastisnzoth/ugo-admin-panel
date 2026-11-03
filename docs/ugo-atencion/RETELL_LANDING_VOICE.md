# UGO Retell — botão de voz na landing

A landing React `src/mvp/UgoLanding.tsx` carrega o widget oficial Retell Voice **somente** quando as duas variáveis públicas estão configuradas.

## Configurar em Vercel (Preview primeiro)

- `VITE_UGO_RETELL_VOICE_PUBLIC_KEY`: chave **pública** da Retell habilitada para web calls, restrita aos domínios de Preview/produção.
- `VITE_UGO_RETELL_VOICE_AGENT_ID`: ID do agente de voz **UGO Assistente** (`agent_...`).

Configure as variáveis no ambiente de Preview e faça o redeploy. Em seguida, ao abrir a landing (`?app=landing`), aparecerá o botão flutuante **Fale com a UGO**. Clique nele, permita o microfone e teste a conversa em pt-BR e espanhol. Após validar, copie as mesmas configurações para produção e publique.

**Nunca** use `RETELL_API_KEY`, chave secreta ou `service_role` em variáveis `VITE_`. Crie a chave pública em Retell → Keys → Public Keys e limite-a aos domínios permitidos. O widget de voz usa navegador/WebRTC; não é necessário número de telefone.

Se alguma variável não estiver configurada, o widget não será carregado, evitando botão sem atendimento.

## Limites e segurança

- Esta mudança adiciona **somente a interface de voz**; não cria solicitações nem acessa o banco de dados.
- Não modifica autenticação Google, rotas, Supabase Arena, matching ou pagamentos.
- As ligações web podem consumir créditos Retell: verifique o plano antes de habilitar em produção.
- Revise políticas de privacidade, gravação e consentimento antes de atender clientes reais.

Documentação oficial: https://docs.retellai.com/deploy/chat-widget
