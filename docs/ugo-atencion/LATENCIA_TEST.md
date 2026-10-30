# UGO Atendimento — latência e critérios de aceitação (TEST)

## Evidência
O agente `ugo-atencion` respondeu corretamente em português utilizando o manual de Faxina, porém o operador relatou demora excessiva. Tempo exato não foi medido.

## Medição
Cronometrar separadamente: (1) resposta direta de `freellmapi/auto`, (2) execução de `openclaw agent --agent ugo-atencion`, (3) chamada ao proxy HTTPS e renderização no navegador. Fazer 3 amostras após um aquecimento, sem chamadas paralelas nem repetição de pedidos que possam executar ações. Registrar mediana, p95 estimado somente com amostra suficiente, falhas e timestamps.

## Segurança
O chat público não recebe token do Gateway, segredo de inferência nem ferramentas de terminal. O proxy deve autenticar seu acesso à inferência, limitar tráfego e isolar conversas. Mensagens recebidas não podem executar comandos. Não expor o Gateway LAN na Internet.

## Comportamento frontend
O pedido HTTP agora é abortado após 25 segundos com mensagem de indisponibilidade e possibilidade de tentar novamente. Isso não garante interrupção da inferência no servidor nem melhora tempo de resposta. O proxy ainda não está implementado.

## Otimizações condicionadas a medições
- Reduzir histórico e contexto enviado ao modelo, sem remover regras de segurança nem respostas fundamentadas.
- Para FAQ pública, buscar primeiro respostas verificadas em Markdown (sem IA quando possível).
- Investigar cold start do backend e timeouts de upstream.
- Streaming somente se o proxy e a UI suportarem saída incremental de maneira segura.

## Gate
Não publicar em main antes de verificar backend seguro, isolamento multiusuário, resposta curta em pt-BR/es, latência sob carga real e CI.
