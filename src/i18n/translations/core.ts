// Combine the last known valid core catalog with incremental, parity-checked modules.
// UI translations are data only: matching, GPS, payment and RLS rules stay unchanged.
import {coreMessages as baseMessages} from './coreBase'
import {recoveryMessages} from './recovery'
import {opportunityMessages} from './opportunities'
import {payoutMessages} from './payout'
import {earningsMessages} from './earnings'
import {followupMessages} from './followup'
import {gpsErrorMessages} from './gpsErrors'
import {routeMessages} from './routes'
import {developmentMessages} from './development'
import {adminPanelMessages} from './adminPanels'
import {operationsMessages} from './operations'
import {adminOpsMessages} from './adminOps'

export const coreMessages: Record<'pt-BR'|'es'|'en',Record<string,string>> = {
  'pt-BR': {...baseMessages['pt-BR'], ...recoveryMessages['pt-BR'], ...opportunityMessages['pt-BR'], ...payoutMessages['pt-BR'], ...earningsMessages['pt-BR'], ...followupMessages['pt-BR'], ...gpsErrorMessages['pt-BR'], ...routeMessages['pt-BR'], ...developmentMessages['pt-BR'], ...adminPanelMessages['pt-BR'], ...operationsMessages['pt-BR'], ...adminOpsMessages['pt-BR']},
  es: {...baseMessages.es, ...recoveryMessages.es, ...opportunityMessages.es, ...payoutMessages.es, ...earningsMessages.es, ...followupMessages.es, ...gpsErrorMessages.es, ...routeMessages.es, ...developmentMessages.es, ...adminPanelMessages.es, ...operationsMessages.es, ...adminOpsMessages.es},
  en: {...baseMessages.en, ...recoveryMessages.en, ...opportunityMessages.en, ...payoutMessages.en, ...earningsMessages.en, ...followupMessages.en, ...gpsErrorMessages.en, ...routeMessages.en, ...developmentMessages.en, ...adminPanelMessages.en, ...operationsMessages.en, ...adminOpsMessages.en},
}
