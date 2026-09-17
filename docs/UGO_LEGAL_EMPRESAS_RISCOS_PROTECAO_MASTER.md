# UGO — Documento Mestre: Modelo Legal, UGO Empresas, UGO Hora, Riscos e Proteção

**Versão:** 1.0  
**Data:** 17/09/2026  
**Status:** Documento de produto e arquitetura jurídico-operacional  
**Observação:** Este documento organiza decisões, hipóteses e ideias de produto discutidas para o UGO. Não substitui parecer de advogado, contador, corretor/seguradora ou especialista regulatório antes de produção.

---

## 1. Objetivo

Construir o UGO como uma plataforma tecnológica de intermediação de serviços, com regras simples para o usuário e mecanismos fortes de proteção por trás do fluxo.

Princípio central:

> **UGO conecta. O cliente solicita. O profissional escolhe e aceita. Cliente e profissional contratam entre si. O UGO registra, facilita, protege a operação e cobra sua tarifa de plataforma.**

O modelo jurídico precisa coincidir com a operação real. Não adianta escrever nos termos que o UGO é apenas intermediador se, na prática, a empresa agir como empregadora, comandar jornada, impor subordinação ou assumir obrigações incompatíveis com a intermediação.

---

## 2. Modelo-base de contratação

### 2.1 UGO não contrata o prestador

O UGO deve ser estruturado como empresa de tecnologia e marketplace de serviços. O profissional não é contratado pelo UGO para executar o serviço.

A relação principal é:

**Cliente / Empresa contratante ⇄ Profissional independente**  
**UGO = infraestrutura tecnológica, matching, pagamento, registros, reputação, suporte e proteção.**

### 2.2 Liberdade do profissional

Como diretriz de produto, o profissional deve poder:

- Definir disponibilidade.
- Aceitar ou recusar pedidos.
- Desconectar-se da plataforma.
- Trabalhar com outros clientes e plataformas.
- Visualizar previamente as condições essenciais do pedido.
- Receber regras objetivas da plataforma sem que isso vire direção cotidiana típica de empregador.

### 2.3 Atenção ao trabalho doméstico recorrente

O UGO deve tratar a recorrência doméstica como situação de atenção jurídica. Para faxina e serviços domésticos, a repetição frequente para a mesma família pode mudar a natureza jurídica da relação.

Diretriz de produto: criar alerta de recorrência e exigir revisão jurídica específica com base na legislação brasileira aplicável, especialmente LC 150/2015.

---

## 3. UGO Empresas — operação por dotação

O UGO Empresas não deve ser apenas “um pedido maior”. Deve funcionar como uma operação empresarial com múltiplas vagas individuais.

### 3.1 Exemplo

Uma empresa cria:

- Evento: Hotel X
- Data: 26/09
- Horário: 18:00–02:00
- Necessidade: 20 garçons
- Valor por profissional: R$ X
- Requisitos: experiência, roupa, horário de chegada, instruções do local

O UGO transforma isso em 20 vagas individuais vinculadas a uma única operação.

### 3.2 Fluxo recomendado

1. Empresa cria a operação.
2. UGO gera as vagas individuais.
3. Cada profissional aceita sua própria vaga.
4. Sistema mostra cobertura total da operação.
5. UGO reconfirma presença antes do evento.
6. Havendo desistência, abre substituição automaticamente.
7. No local, cada profissional faz check-in.
8. Empresa acompanha o painel em tempo real.
9. Ao final, horas/entrega são validadas.
10. Pagamento, histórico e reputação são processados por profissional.

### 3.3 Titulares e suplentes

Para operações críticas, prever:

- Titulares confirmados.
- Lista de profissionais disponíveis para substituição.
- Reconfirmação 24h antes.
- Reconfirmação final poucas horas antes.
- Reposição automática quando alguém cancela ou não confirma.

Evitar prometer “quantidade garantida” sem contrato específico, capacidade operacional real e análise de responsabilidade. O produto pode prometer **protocolo prioritário de substituição**, que é diferente de garantia absoluta de comparecimento.

### 3.4 Painel empresarial

Indicadores simples:

- 20 requeridos
- 20 confirmados
- 18 presentes
- 2 em deslocamento
- 1 substituto disponível
- Incidentes abertos
- Custo acumulado
- Horas trabalhadas

### 3.5 Planos comerciais possíveis

**UGO Empresas Padrão**

- Pedido múltiplo.
- Matching.
- Contratação individual.
- Dashboard.
- Pagamento e histórico.

**UGO Empresas Cobertura**

- Reconfirmação reforçada.
- Substituição prioritária.
- Suplentes quando aplicável.
- Monitoramento de presença.
- Suporte empresarial reforçado.

---

## 4. UGO Hora — serviços cobrados por tempo

Criar um modo específico para serviços por hora, separado de serviços com preço fechado.

Exemplos:

- Faxina.
- Jardinagem.
- Montagem.
- Apoio em eventos.
- Cuidados e assistência permitidos pela plataforma.
- Pequenos reparos quando o modelo comercial for por hora.

### 4.1 “Taxímetro” de serviço

O profissional chega e toca em **Cheguei**.

O trabalho só começa após autorização do cliente.

Depois disso:

- Cronômetro inicia.
- Valor acumulado aparece em tempo real.
- Pausas ficam registradas.
- Horas extras dependem de aprovação.
- Finalização gera resumo de tempo e valor.

### 4.2 PIN bilateral

O PIN é uma boa solução porque não exige encontro físico entre cliente e profissional.

Fluxo:

1. Profissional chega ao endereço.
2. Toca em “Cheguei”.
3. Cliente recebe no chat do pedido: “Profissional chegou. Autorizar início?”
4. Sistema gera PIN temporário ou botão de autorização.
5. Cliente autoriza remotamente.
6. Registro fica vinculado ao serviceId.
7. Cronômetro começa.

Se o contratante estiver longe, ele pode autorizar sem ir ao local.

### 4.3 QR Code como alternativa

QR pode existir como opção quando há responsável no local, mas não deve ser obrigatório. O PIN/chat é mais universal para casos remotos.

### 4.4 Pausas

O fluxo deve diferenciar:

- Pausa pessoal não cobrada.
- Deslocamento autorizado para compra de material.
- Interrupção solicitada pelo cliente.
- Tempo extra aprovado.

### 4.5 Serviço extra

Se o cliente pedir algo fora do combinado:

1. Profissional registra “solicitação extra”.
2. App mostra impacto estimado em tempo/valor.
3. Cliente aprova.
4. Só então o extra passa a fazer parte do pedido.

### 4.6 Finalização remota

Se o cliente não estiver no local:

- Profissional solicita finalização.
- Cliente recebe resumo.
- Há uma janela curta de revisão/contestação.
- Sem manifestação, aplica-se a regra contratual definida para encerramento.

---

## 5. UX: segurança forte, fluxo simples

Regra de experiência:

> **Quanto mais tecnologia existir por trás, menos tecnologia o usuário deve sentir.**

O usuário comum deve enxergar poucos comandos:

- Cheguei.
- Autorizar.
- Iniciar.
- Pausar.
- Finalizar.
- Reportar problema.

Por trás, o sistema pode registrar:

- serviceId.
- horário.
- confirmação bilateral.
- eventos do chat.
- status.
- pagamento.
- incidentes.
- evidências permitidas.
- logs técnicos.

O anti-fraude não deve transformar o UGO em um produto difícil.

---

## 6. “Anti-malandragem” — proteção sem vigilância excessiva

O UGO deve ser desenhado para que burlar o sistema seja mais difícil e menos vantajoso do que usar corretamente.

### 6.1 Confirmação bilateral

Eventos críticos devem ter confirmação dos dois lados sempre que necessário:

- Início.
- Serviço extra.
- Alteração relevante de valor.
- Finalização contestada.
- Incidente.

### 6.2 Evitar fechamento por fora

Problema: cliente e profissional se conhecem no UGO e depois fazem os próximos serviços diretamente para evitar a taxa.

Estratégia recomendada:

- Botão “Contratar novamente”.
- Repetição do serviço em um toque.
- Taxa menor em recorrência, se o modelo financeiro permitir.
- Pagamento protegido.
- Histórico.
- Reputação.
- Proteção/seguro quando elegível.
- Benefícios por permanência na plataforma.

A ideia é reduzir a motivação para sair, não “vigiar” o usuário fora do serviço.

### 6.3 Não rastrear vida privada

O UGO não deve tentar detectar que um profissional voltou ao endereço em outro dia simplesmente monitorando geolocalização fora de uma operação ativa.

Rastreio excessivo cria risco de privacidade, confiança e conformidade. Geolocalização deve ser limitada ao que é necessário para executar e proteger o pedido.

---

## 7. UGO Protegido — danos e incidentes

Criar uma camada comercial e operacional de proteção para serviços elegíveis.

### 7.1 Danos materiais

Exemplo: profissional quebra acidentalmente um objeto durante o serviço.

Possível modelo:

- Parceria com seguradora/corretora autorizada.
- Cobertura real definida em apólice.
- Limite de cobertura.
- Franquia.
- Exclusões.
- Fluxo de sinistro dentro do UGO.

UGO não deve se apresentar como seguradora se não for autorizado para isso.

### 7.2 Acidente pessoal do profissional

É cobertura diferente de dano material ao cliente.

Deve ser tratada separadamente, com produto/parceiro adequado.

### 7.3 Fluxo de incidente

1. Abrir incidente.
2. Selecionar categoria.
3. Descrever fato.
4. Anexar fotos/documentos quando necessários.
5. Preservar registros do pedido.
6. Análise conforme regra prévia.
7. Encaminhamento a seguradora/suporte/autoridade quando aplicável.
8. Decisão registrada.

Ninguém deve “ganhar” uma disputa só porque reclamou primeiro.

---

## 8. Cenários negativos — mapa de risco

### 8.1 Riscos do cliente

- Não pagar.
- Chargeback após serviço concluído.
- Cancelar em cima da hora.
- Não estar no local.
- Dar endereço incorreto.
- Pedir atividade diferente do anúncio.
- Acusar falsamente dano ou roubo.
- Tentar obter reembolso indevido.
- Assediar ou ameaçar profissional.
- Pedir contato para fechar por fora.
- Criar pedidos falsos.
- Manipular avaliação.

### 8.2 Riscos do profissional

- No-show.
- Atraso grave.
- Abandono do serviço.
- Serviço mal executado.
- Dano material.
- Furto/roubo.
- Usar conta de outra pessoa.
- Emprestar/alugar conta.
- Falsificar chegada.
- Manipular cronômetro.
- Cobrar valor fora do UGO.
- Pressionar cliente a cancelar na plataforma.
- Enviar contato externo.
- Manipular avaliações.

### 8.3 Riscos de conluio

Cliente e profissional podem agir juntos para:

- Fraudar cupom.
- Criar serviço falso.
- Gerar cashback/bônus.
- Fraudar seguro.
- Criar avaliações falsas.
- Simular cancelamento.
- Desviar pagamento.
- Inflar horas.

### 8.4 Riscos de UGO Empresas

- Pedido de 20 pessoas para evento inexistente.
- Cancelamento empresarial de última hora.
- Local sem condições de segurança.
- Função real diferente da publicada.
- Empresa exigindo subordinação incompatível com o modelo.
- Pagamento empresarial atrasado.
- Grande quantidade de no-shows simultâneos.
- Falta de profissionais na região.
- Dados de acesso a evento/empresa vazados.
- Cliente usando UGO para burlar obrigações trabalhistas.

### 8.5 Riscos tecnológicos

- App fora do ar.
- Cronômetro não sincroniza.
- Início registrado duas vezes.
- Cobrança duplicada.
- Pagamento liberado errado.
- Falha de notificação.
- GPS indisponível.
- Perda de conexão.
- Dados inconsistentes entre cliente e profissional.
- Conta invadida.
- Vazamento de dados.
- Dependência de API externa.
- Falha em backup.
- Erro de permissão de administrador.

### 8.6 Riscos jurídicos e regulatórios

- Caracterização indevida de vínculo trabalhista.
- Responsabilidade de consumo.
- Tratamento de dados em desacordo com LGPD.
- Uso excessivo de geolocalização.
- Falta de consentimento/base legal adequada.
- Publicidade enganosa sobre “garantia” ou “seguro”.
- Contrato contradizendo a prática.
- Falha tributária/fiscal.
- Uso de profissional sem habilitação quando a atividade exigir.
- Operação em cidade/país sem adaptar regras locais.

### 8.7 Riscos reputacionais

- Caso de violência.
- Roubo.
- Acidente grave.
- Reclamação viral.
- Profissional inadequado.
- Cliente abusivo.
- Resposta lenta do suporte.
- Promessa comercial que o UGO não consegue cumprir.

---

## 9. Regra de Red Team do UGO

Antes de lançar qualquer função, responder quatro perguntas:

1. **Como isso pode ser abusado?**
2. **Como detectar o abuso?**
3. **Que evidência fica registrada?**
4. **Qual é a resposta quando der errado?**

Estrutura padrão:

**Prevenção → Detecção → Evidência → Resposta → Aprendizado**

O objetivo não é criar uma empresa “100% invulnerável”. Isso não existe. O objetivo é evitar ficar com a “batata quente” sem processo, evidência ou saída.

---

## 10. Registro de evidências

Eventos importantes devem ser auditáveis, respeitando privacidade e minimização de dados.

Guardar, conforme necessidade e base legal:

- Aceite do pedido.
- Condições exibidas no momento do aceite.
- serviceId.
- Horários.
- PIN/autorização.
- Alterações de escopo.
- Chat do pedido.
- Check-in/check-out.
- Pagamentos.
- Cancelamentos.
- Incidentes.
- Fotos de antes/depois somente quando justificadas.
- Histórico de status.
- Versão dos termos aceitos.

Definir política de retenção. Não guardar dados indefinidamente sem necessidade.

---

## 11. Segurança de acesso a imóveis

Para casas, condomínios e propriedades sem o cliente presente:

- Evitar senhas permanentes no chat.
- Preferir instruções temporárias.
- Não expor código de portão para além do necessário.
- Expirar informações sensíveis após o serviço quando tecnicamente possível.
- Registrar quem recebeu a autorização.
- Permitir revogação imediata.
- Não compartilhar dados de acesso com outros profissionais.

---

## 12. Estrutura societária e propriedade do UGO

### 12.1 Empresa brasileira

Estratégia discutida: começar com uma empresa brasileira, provavelmente LTDA, para a operação local.

A empresa deve ser separada da pessoa física do fundador.

### 12.2 Quem é o dono

O fundador é dono da empresa por meio de suas quotas.

A empresa, por sua vez, deve ser dona dos ativos do UGO.

Exemplo:

**Fundador → possui quotas da UGO Brasil LTDA → UGO Brasil LTDA possui marca, código, domínios, contratos e ativos.**

### 12.3 Propriedade intelectual no nome da empresa

Passar para a empresa, documentadamente:

- Marca.
- Logotipo.
- Código.
- Repositórios.
- Domínios.
- Design.
- Documentação.
- Bases de dados quando juridicamente aplicável.
- Materiais comerciais.
- Conteúdos.
- Direitos cedidos por colaboradores.

### 12.4 Cadeia de titularidade

Qualquer pessoa que participe da criação deve ter contrato adequado de cessão/licença de propriedade intelectual.

Isso é importante para:

- Investimento.
- Due diligence.
- Venda parcial.
- Venda total.
- Internacionalização.

---

## 13. Marca e proteção internacional

### 13.1 Brasil

Distinguir:

- **Empresa/CNPJ:** existência societária.
- **Marca:** proteção do nome/logotipo perante o INPI.

Abrir empresa não significa registrar a marca automaticamente.

### 13.2 Exterior

Proteção internacional é territorial. Não existe um único registro que automaticamente proteja tudo em todos os países.

Estratégia:

- Brasil primeiro.
- Selecionar mercados-alvo.
- Avaliar Sistema de Madri para extensão internacional quando adequado.
- Registrar domínios e usernames estratégicos.
- Adaptar contratos e privacidade por país.

### 13.3 O que proteger além da marca

- Software/código.
- Design original quando aplicável.
- Documentação.
- Bases proprietárias.
- Segredos de negócio.
- Algoritmos e regras internas confidenciais.
- Domínios.
- Identidade visual.
- Contratos.
- Know-how operacional.

Ideias abstratas não são protegidas do mesmo modo que ativos concretos.

---

## 14. Venda de participação e investimento

Se UGO for LTDA, o normal é falar em **quotas**, não ações.

Possibilidades:

- Fundador vende parte de suas quotas.
- Empresa faz aumento de capital e o investidor entra com dinheiro novo.
- No futuro, a sociedade pode mudar de tipo se fizer sentido.

Exemplo:

- Fundador: 100%.
- Investidor entra com 25%.
- Fundador continua com 75%, sujeito às regras societárias.

Porcentagem não é tudo. Acordo de sócios deve tratar:

- Controle.
- Quóruns.
- Direito de voto.
- Entrada/saída.
- Venda de quotas.
- Preferência.
- Diluição.
- Propriedade intelectual.
- Vesting quando houver sócios operacionais.
- Deadlock.
- Drag/tag quando fizer sentido.

---

## 15. Financiamento sem vender o UGO

Prioridade discutida: obter recursos sem entregar participação cedo demais.

Caminhos:

- Receita de clientes.
- Pilotos pagos.
- Contratos empresariais.
- Editais públicos.
- Subvenção econômica.
- Programas de inovação.
- Aceleradoras sem equity quando disponíveis.
- Parcerias comerciais.
- Créditos/benefícios tecnológicos.
- Programas regionais.

Candidatos citados para pesquisar quando houver inscrição aberta:

- ACATE.
- MIDITEC.
- InovAtiva.
- FAPESC.
- Centelha.
- BRDE Labs.
- Programas corporativos e bancários de inovação.
- Google for Startups e equivalentes para suporte, rede e créditos quando aplicável.

Esses programas mudam. Confirmar condições, calendário, contrapartidas e eventual participação antes de aplicar.

---

## 16. Como apresentar UGO sem “entregar o ouro”

Em pitch, aceleradora ou edital:

Mostrar:

- Problema.
- Solução.
- Produto funcionando.
- Fluxos.
- Diferenciais.
- Mercado.
- Métricas.
- Pilotos.
- Modelo de receita.
- Equipe.
- Roadmap.
- Uso pretendido do dinheiro.

Não entregar sem necessidade:

- Código-fonte.
- Tokens.
- Credenciais.
- Algoritmos internos detalhados.
- Regras antifraude completas.
- Dados pessoais.
- Documentos confidenciais.
- Segredos comerciais.

Antes de assinar qualquer documento, revisar cláusulas sobre:

- Exclusividade.
- Propriedade intelectual.
- Participação.
- Opção de compra.
- Preferência.
- Licença.
- Uso de dados.
- Confidencialidade.

---

## 17. Hipótese de expansão territorial

Marketplace precisa de densidade.

Estratégia discutida:

1. Começar por zonas de Florianópolis.
2. Garantir equilíbrio entre demanda e profissionais.
3. Expandir para áreas próximas.
4. Testar Balneário Camboriú.
5. Avaliar Curitiba.
6. Depois mercados maiores como São Paulo e Rio.

Não abrir “Brasil inteiro” apenas porque tecnicamente é possível. Primeiro construir liquidez local.

---

## 18. Concorrentes e diferenciação

Referências citadas:

- GetNinjas.
- Triider.
- Taskrabbit.

O UGO não deve se vender como “melhor que todos” antes de provar isso em operação.

Tese de diferenciação a validar:

- Radar e disponibilidade em tempo real.
- Fluxo simples estilo “pedir agora”.
- UGO Hora com cronômetro.
- PIN bilateral.
- Recontratação rápida.
- Pagamento e histórico.
- Proteção de incidentes.
- Antifraude invisível.
- UGO Empresas com múltiplas vagas.
- Suplentes e substituição.
- Dashboard empresarial em tempo real.

---

## 19. Princípios de produto consolidados

1. UGO é tecnologia e intermediação.
2. O profissional escolhe se aceita o pedido.
3. Cliente e profissional contratam o serviço entre si.
4. Segurança deve ser forte por trás e simples na frente.
5. Cada evento crítico precisa de evidência.
6. Evitar vigilância desnecessária.
7. Incentivar recorrência dentro do UGO.
8. Fraude deve ser mais difícil do que agir corretamente.
9. Danos, acidentes, pagamento e violência precisam de fluxos separados.
10. Toda nova função passa por Red Team.
11. UGO Empresas é operação por dotação, não uma agência tradicional de mão de obra.
12. O patrimônio intelectual deve pertencer à empresa.
13. Crescimento internacional exige adaptação país a país.
14. Não prometer garantia/seguro sem estrutura jurídica e operacional real.
15. Preparar o UGO para due diligence desde cedo.

---

## 20. Priorização sugerida

### P0 — antes de escalar produção

- Definir juridicamente o modelo de intermediação.
- Termos de Cliente.
- Termos de Profissional.
- Contrato/termos UGO Empresas.
- Política de Privacidade e LGPD.
- Política de incidentes.
- Regras de cancelamento/no-show.
- Política de pagamento/reembolso/chargeback.
- Cadeia de propriedade intelectual.
- Estrutura societária.
- Registro de marca.
- Logs essenciais e trilha de auditoria.

### P1 — produto de confiança

- PIN bilateral.
- UGO Hora.
- Check-in/check-out.
- Serviço extra aprovado.
- Recontratar profissional.
- Antidesintermediação por incentivo.
- Fluxo de incidentes.
- Sistema de confiabilidade/reputação.

### P2 — expansão empresarial

- UGO Empresas.
- Múltiplas vagas.
- Reconfirmação.
- Suplentes.
- Substituição automática.
- Dashboard.
- Relatório pós-operação.

### P3 — proteção avançada

- UGO Protegido com parceiro autorizado.
- Cobertura material.
- Cobertura de acidentes adequada.
- Motor antifraude.
- Red Team automatizado.
- Monitoramento de anomalias.
- Expansão internacional.

---

## 21. Checklist de revisão jurídica antes do lançamento

Antes de colocar cada módulo em produção, validar com profissional jurídico competente:

- UGO atua realmente como intermediador?
- Algum fluxo cria subordinação indevida?
- Há risco de relação de emprego?
- Consumidor entende quem presta o serviço?
- Responsabilidades estão claras?
- Pagamento e cancelamento são transparentes?
- Geolocalização é necessária e proporcional?
- Dados coletados são mínimos?
- Retenção está definida?
- Há base legal adequada para dados?
- Incidentes de segurança têm processo?
- “Seguro”, “garantia” e “proteção” estão corretamente nomeados?
- Atividades reguladas têm validações específicas?
- Contratos refletem a operação real?
- Empresa é dona de todo o IP?
- Há documentação suficiente para due diligence?

---

## 22. Definição estratégica final

O UGO deve crescer como uma infraestrutura de confiança para contratação de serviços.

A vantagem não deve ser apenas “achar alguém”. Deve ser:

**encontrar, contratar, iniciar, medir, pagar, registrar, resolver problemas, substituir quando necessário e construir reputação — tudo dentro de um fluxo simples.**

Essa é a base para UGO Cliente, UGO Profissional e UGO Empresas evoluírem como partes do mesmo ecossistema.
