// GPS errors translated only; location accuracy and matching safety checks are unchanged.
export const gpsErrorMessages: Record<'pt-BR'|'es'|'en',Record<string,string>> = {
  "pt-BR": {
    "providerGps.https": "A localização exige HTTPS ou localhost.",
    "providerGps.unavailable": "Este navegador não oferece geolocalização.",
    "providerGps.permissionRoute": "Permita o acesso à localização para compartilhar o trajeto com o cliente.",
    "providerGps.permissionOnline": "Permita o acesso à localização para receber pedidos.",
    "providerGps.noPosition": "Não foi possível obter sua localização.",
    "providerGps.timeout": "A localização demorou demais. Tente novamente.",
    "providerGps.invalid": "O GPS retornou coordenadas inválidas.",
    "providerGps.inaccurate": "A precisão do GPS é insuficiente para esta ação.",
    "providerGps.stale": "A localização está desatualizada. Aguarde um novo sinal GPS.",
    "providerGps.publishFailed": "Não foi possível sincronizar a localização. Tente novamente.",
    "providerGps.lostPermission": "O acesso à localização foi revogado. Ative-o no navegador."
  },
  "es": {
    "providerGps.https": "La ubicación requiere HTTPS o localhost.",
    "providerGps.unavailable": "Este navegador no admite geolocalización.",
    "providerGps.permissionRoute": "Permití el acceso a la ubicación para compartir el trayecto con el cliente.",
    "providerGps.permissionOnline": "Permití el acceso a la ubicación para recibir pedidos.",
    "providerGps.noPosition": "No se pudo obtener tu ubicación.",
    "providerGps.timeout": "La ubicación tardó demasiado. Intentá otra vez.",
    "providerGps.invalid": "El GPS devolvió coordenadas inválidas.",
    "providerGps.inaccurate": "La precisión del GPS es insuficiente para esta acción.",
    "providerGps.stale": "La ubicación está desactualizada. Esperá una nueva señal GPS.",
    "providerGps.publishFailed": "No se pudo sincronizar la ubicación. Intentá otra vez.",
    "providerGps.lostPermission": "Se revocó el acceso a la ubicación. Activá el permiso en el navegador."
  },
  "en": {
    "providerGps.https": "Location requires HTTPS or localhost.",
    "providerGps.unavailable": "This browser does not support geolocation.",
    "providerGps.permissionRoute": "Allow location access to share your route with the client.",
    "providerGps.permissionOnline": "Allow location access to receive requests.",
    "providerGps.noPosition": "Could not get your location.",
    "providerGps.timeout": "Location timed out. Try again.",
    "providerGps.invalid": "GPS returned invalid coordinates.",
    "providerGps.inaccurate": "GPS accuracy is insufficient for this action.",
    "providerGps.stale": "Location is outdated. Wait for a new GPS fix.",
    "providerGps.publishFailed": "Could not sync location. Try again.",
    "providerGps.lostPermission": "Location access was revoked. Enable it in your browser."
  }
}
