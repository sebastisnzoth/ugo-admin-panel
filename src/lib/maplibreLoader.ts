/**
 * Carga diferida de maplibre-gl (~1 MB min + ~83 kB CSS).
 *
 * Antes, cinco componentes importaban maplibre estáticamente y el chunk
 * `vendor-maplibre` (~1 MB) se descargaba con ClientRoot/ProviderRoot aunque
 * el usuario nunca abriera un mapa. Ahora el módulo sólo se descarga cuando un
 * componente monta un mapa real. La primera carga es async; las siguientes
 * devuelven la misma promesa cacheada.
 */
let cached:Promise<typeof import('maplibre-gl')>|null=null

export function loadMaplibre():Promise<typeof import('maplibre-gl')>{
 if(!cached){
  cached=Promise.all([
   import('maplibre-gl'),
   import('maplibre-gl/dist/maplibre-gl.css'),
  ]).then(([maplibre])=>maplibre)
 }
 return cached
}

export type MaplibreNamespace=typeof import('maplibre-gl')
