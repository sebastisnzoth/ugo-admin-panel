export const UGO_UI_EVENTS={
 clientLocation:'ugo:client:capture-location',
 clientHugo:'ugo:open-hugo',
 clientHugoText:'ugo:client:focus-hugo-text',
 clientHugoVoice:'ugo:client:open-hugo-voice-order',
}as const

export function emitUgoUiEvent(name:(typeof UGO_UI_EVENTS)[keyof typeof UGO_UI_EVENTS]){
 window.dispatchEvent(new Event(name))
}
