export const UGO_UI_EVENTS={
 clientLocation:'ugo:client:capture-location',
 clientHugo:'ugo:open-hugo',
 clientHugoText:'ugo:client:focus-hugo-text',
 clientHugoVoice:'ugo:client:open-hugo-voice-order',
 clientFocusServiceSearch:'ugo:client:focus-service-search',
 clientShowCategories:'ugo:client:show-categories',
 clientProfilePayment:'ugo:client:profile-payment',
 clientProfileAddresses:'ugo:client:profile-addresses',
}as const

export function emitUgoUiEvent(name:(typeof UGO_UI_EVENTS)[keyof typeof UGO_UI_EVENTS]){
 window.dispatchEvent(new Event(name))
}
