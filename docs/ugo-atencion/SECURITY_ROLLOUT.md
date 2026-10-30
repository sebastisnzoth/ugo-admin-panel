# UGO Atendimento — implantação segura TEST

## Implementação confirmada
- Supabase TEST `tmossnqfwfwfwjrtzwcbmm`: migrações de limite atômico e RPC assinado aplicadas.
- `ugo_support_check_limit_signed`: controla seis chamadas por minuto por fingerprint. Teste SQL de sete chamadas confirmou seis autorizações e sétima rejeitada.
- A RPC pública exige assinatura HMAC gerada apenas pelo servidor e segredos armazenados no schema privado de TEST; não depende da chave service_role de PROD.
- Vercel Preview somente na branch `feat/ugo-landing-ai-support-chat`: configuradas URL e publishable key TEST, HMAC secreto, `UGO_SUPPORT_ENABLED=true`, `GEMINI_API_KEY` e credenciais Turnstile.
- Cloudflare Turnstile: widget real (não chave de testes), restrito aos hostnames de Preview.
- Nenhuma configuração da produção foi alterada nesta operação.

## Evidências e limites
- O deployment Vercel `dpl_CmbD2iyRMJihXAGkNrkoYTZJqy8Y`, SHA `488b421cc3804b9a0453433483f466f3cd72be8b`, ficou READY.
- **Não confundir READY com um smoke test real**: validação com navegador e token Turnstile ainda é necessária para certificar Gemini E2E.
- GitHub Core CI anterior falhou com 12 literais JSX; o frontend foi localizado em pt/es/en. Roadmap e continuidade foram atualizados para resolver outro gate. Reavaliar CI no SHA final.
- A quota de seis/minuto por IP reduz abuso, mas limites podem afetar IPs compartilhados e não equivalem a um orçamento de cobrança no provedor Gemini.
- A rota permanece proibida em produção sem credenciais independentes, revisão de privacidade e verificação de disponibilidade de Gemini.

## Smoke test manual
Acessar URL de Preview, abrir Atendimento UGO, confirmar Turnstile e enviar `oi`.
Verificar se a resposta vem da API (POST /api/ugo-support), sem simulação.
Verificar 429 após limite e se GET retorna 405, além de proteção de origem e falha segura.
