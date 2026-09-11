export const UGO_UI_EVENTS={
 clientLocation:'ugo:client:capture-location',
 clientHugo:'ugo:client:open-hugo',
}as const

export function emitUgoUiEvent(name:(typeof UGO_UI_EVENTS)[keyof typeof UGO_UI_EVENTS]){
 window.dispatchEvent(new Event(name))
}
