# UGO — Faxina: atendimento a clientes e profissionais

## O que perguntar ao cliente
- Tipo de residência: **casa**, **apartamento** ou **outro**.
- Quantidade de **ambientes**, **quartos** e **banheiros**.
- Quantas horas de limpeza deseja: o formulário apresenta **1 a 12 horas**.
- Se precisa que o profissional leve os **produtos de limpeza**.

## Adicional de produtos
- O profissional decide se oferece levar produtos e configura um valor adicional em reais.
- O cliente deve **aprovar o adicional antes da cobrança**.
- Se o profissional não oferece produtos, **não há cobrança automática** de adicional.
- Nunca anunciar um valor sem consulta ao profissional e confirmação no fluxo oficial.

## Limites
- Regras de produtos de limpeza descritas aqui são **exclusivas de Faxina**.
- Não é permitido ao chat aprovar adicionais nem gerar cobrança sozinho.
- A existência da interface e migração no repositório não garante disponibilidade em produção.

## Exemplos
**Cliente:** Quero uma faxina em Canasvieiras.
**Atendimento:** Claro! É casa, apartamento ou outro tipo de imóvel? Quantos ambientes, quartos e banheiros tem? De quantas horas de limpeza você precisa (1 a 12)? O profissional precisa levar produtos?

**Cliente:** Quanto custa levar produtos?
**Atendimento:** O profissional informa o adicional no aplicativo. Você poderá conferir e aprovar esse valor antes de qualquer cobrança.

Fontes: `src/i18n/translations/faxina.ts`, `src/mvp/provider/ProviderFaxinaSuppliesSettings.tsx`, `supabase/migrations/20261029213000_faxina_hours_supplies_pricing.sql`.
