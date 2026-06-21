// utils/mapPins.ts — teardrop pins compartidos para todos los mapas de U.GO
declare const L: any;

export const CAT_EMOJI: Record<string, string> = {
  electricista:'⚡', plomero:'🔧', limpeza:'🧹', chaveiro:'🔑',
  pintura:'🎨', carpintaria:'🪚', jardinagem:'🌿', climatizacao:'❄️',
  ti_redes:'💻', reformas:'🏠', cliente:'👤', admin:'👑', default:'📍',
};

export function makePin(color: string, label: string, size = 32) {
  const tail = Math.round(size * 0.4);
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3));">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #FFF;
        display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.45)}px;
        box-shadow:inset 0 -3px 6px rgba(0,0,0,.15);">${label}</div>
      <div style="width:0;height:0;border-left:${tail}px solid transparent;border-right:${tail}px solid transparent;
        border-top:${Math.round(tail*1.4)}px solid ${color};margin-top:-2px;"></div>
    </div>`,
    className: '',
    iconSize: [size, size + Math.round(tail * 1.4) + 2],
    iconAnchor: [size / 2, size + Math.round(tail * 1.4) + 2],
    popupAnchor: [0, -(size + Math.round(tail * 1.4) + 2)],
  });
}

export function scoutPin(hasPhone: boolean, dist: number) {
  const color = hasPhone && dist < 3000 ? '#05944F'
    : hasPhone ? '#F59E0B'
    : dist < 3000 ? '#E11900' : '#6B7280';
  return { color, pin: makePin(color, hasPhone ? '📱' : '📍', 30) };
}

export function providerPin(online: boolean, activo: boolean, catSlug: string) {
  const color = online && activo ? '#05944F' : activo ? '#F59E0B' : '#E11900';
  return makePin(color, CAT_EMOJI[catSlug] || '🔧', 32);
}

export function centerPin() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#111;border:3px solid #FFF;box-shadow:0 0 0 4px rgba(17,17,17,.15);"></div>`,
    className: '', iconSize: [16, 16], iconAnchor: [8, 8],
  });
}
