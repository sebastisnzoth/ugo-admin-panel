// Script de rediseño UGO Flow (uso único, ejecutar desde la raíz del repo).
// Migra la paleta hardcodeada al lenguaje visual del prototipo "UGO · Preview de flow"
// (public/ugo-design-preview/index.html). No toca: prototipo objetivo, mockups aprobados
// (design-preview), ugo-dark-premium.css (contratos), ni docs/tests/public/design.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const HEX = [
  // — Neutrales (Untitled UI / grises fríos → verde-gris del prototipo) —
  ['#101828', '#18211d'], ['#131b2e', '#18211d'], ['#122019', '#18211d'],
  ['#1d2939', '#243026'], ['#20252b', '#243026'],
  ['#344054', '#2f3d34'], ['#475467', '#56645b'], ['#5f6e66', '#56645b'],
  ['#667085', '#647269'], ['#657080', '#65756b'], ['#7a8a82', '#687a6e'],
  ['#98a2b3', '#8fa396'],
  ['#d0d5dd', '#dce4dd'], ['#dfe5e2', '#dce4dd'], ['#d7e1dc', '#dce4dd'], ['#d5ddd7', '#dce4dd'],
  ['#e4e7ec', '#e7ece8'], ['#edf1ef', '#e7ece8'],
  ['#eaecf0', '#e0e9e1'], ['#e8ecea', '#e0e9e1'], ['#e8edeb', '#e0e9e1'],
  ['#eef2f6', '#eef2ed'], ['#eef2f0', '#eef2ed'], ['#e7eeeb', '#eef2ed'],
  ['#f2f4f7', '#eef2ed'], ['#f2f4f3', '#eef2ed'], ['#f1f3f2', '#eef2ed'], ['#f3f5f4', '#eef2ed'], ['#f4f6f5', '#eef2ed'],
  ['#f4f7f5', '#f7f9f7'], ['#f3f6f5', '#f7f9f7'], ['#f5f7f6', '#f7f9f7'],
  ['#f7faf8', '#f7f9f7'], ['#f7fbf9', '#f7f9f7'], ['#f8faf9', '#f7f9f7'], ['#f8fbfa', '#f7f9f7'],
  ['#f9fafb', '#f7f9f7'], ['#f4faf6', '#f7f9f7'], ['#f5fbff', '#f7f9f7'],
  ['#eef3f1', '#f7f9f7'], ['#edf4f1', '#f7f9f7'],
  ['#dfe9e4', '#dce5de'], ['#d4e2db', '#dce5de'], ['#d2d9f4', '#dce5de'],
  // — Lavandas/azules Stitch → verdes/grises del prototipo —
  ['#eaedff', '#eef2ed'], ['#e2e7ff', '#e5eee6'], ['#dae2fd', '#e0e9e1'], ['#f2f3ff', '#f7f9f7'],
  ['#eff8ff', '#eef2ed'], ['#b2ddff', '#dce4dd'],
  // — Verdes de marca → paleta UGO Flow —
  ['#006948', '#159366'], ['#00855d', '#168f66'], ['#07804b', '#159366'],
  ['#067647', '#197249'], ['#076745', '#197249'], ['#087747', '#197249'], ['#087d63', '#159366'],
  ['#079455', '#159366'], ['#0b8f61', '#159366'], ['#05944f', '#159366'],
  ['#12ad67', '#29b984'], ['#26df8a', '#29b984'], ['#18e08b', '#29b984'],
  ['#0d2117', '#15241a'],
  // — Fondos suaves verdes → pill del prototipo —
  ['#ecfdf3', '#e5f5e9'], ['#eaf8f0', '#e5f5e9'], ['#e5f7ed', '#e5f5e9'], ['#dff5ea', '#e5f5e9'],
  ['#e5f5ed', '#e5f5e9'], ['#eafff3', '#e5f5e9'], ['#d7f8e5', '#e5f5e9'],
  ['#91e5bc', '#bbf0c9'], ['#abefc6', '#c9ead4'], ['#b7e7cf', '#c9ead4'], ['#75c9aa', '#7fc9a3'],
  // — Cianes/azules de acento → familia verde UGO —
  ['#57dffe', '#29b984'], ['#46cfff', '#29b984'], ['#18d8f7', '#29b984'], ['#8efaff', '#ffffff'],
  ['#74f5ff', '#29b984'], ['#a6f4f7', '#bbf0c9'], ['#0aa8b8', '#159366'],
  ['#2563eb', '#168f66'], ['#6da8ff', '#168f66'], ['#0058be', '#168f66'], ['#00687a', '#197249'],
  ['#175cd3', '#197249'], ['#1570ef', '#159366'], ['#2f80ed', '#159366'],
  // — Superficies oscuras navy → verde-noche del prototipo —
  ['#07111c', '#141c17'], ['#050b12', '#101613'], ['#0a1623', '#1a241e'], ['#0d1b2a', '#202b23'],
  ['#112233', '#27312b'], ['#162a3d', '#2c3a30'], ['#1b3145', '#334137'],
  ['#050d15', '#101613'], ['#20364a', '#3b4942'], ['#263b4e', '#3b4c3f'],
  ['#091b28', '#141c17'], ['#102335', '#141c17'], ['#0b1c30', '#141c17'], ['#18222c', '#1c2921'],
  // — Ámbar de estrellas/warn —
  ['#f59e0b', '#d9aa40'], ['#fff8e8', '#fff0da'], ['#fef0c7', '#fff0da'],
]
const RGBA = [
  ['rgba(7,148,85', 'rgba(21,147,102'], ['rgba(5,148,79', 'rgba(21,147,102'],
  ['rgba(0,105,72', 'rgba(21,147,102'], ['rgba(8,119,71', 'rgba(25,114,73'],
  ['rgba(24,216,247', 'rgba(41,185,132'], ['rgba(18,173,103', 'rgba(41,185,132'],
  ['rgba(16,24,40', 'rgba(24,33,29'], ['rgba(15,23,42', 'rgba(24,33,29'],
  ['rgba(19,27,46', 'rgba(24,33,29'], ['rgba(25,45,35', 'rgba(24,33,29'],
  ['rgba(11,28,48', 'rgba(20,28,23'], ['rgba(24,34,44', 'rgba(28,41,33'],
]

const EXCLUDE = ['design-preview', 'ugo-dark-premium.css', 'ugo-design-preview', 'RealFlowDemo']
const EXT = new Set(['.css', '.tsx', '.ts'])
const roots = ['src']
let changedFiles = 0, replacements = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (EXCLUDE.some((x) => p.includes(x))) continue
    const st = statSync(p)
    if (st.isDirectory()) { walk(p); continue }
    if (!EXT.has(extname(p))) continue
    let src = readFileSync(p, 'utf8')
    const before = src
    for (const [from, to] of HEX) {
      // hex case-insensitive; mantener el resto del texto intacto
      const re = new RegExp(from.replace('#', '#') + '(?![0-9a-fA-F])', 'gi')
      src = src.replace(re, () => { replacements++; return to })
    }
    for (const [from, to] of RGBA) {
      const re = new RegExp(from.replace(/[()]/g, '\\$&'), 'gi')
      src = src.replace(re, () => { replacements++; return to })
    }
    if (src !== before) { writeFileSync(p, src); changedFiles++; console.log('·', p) }
  }
}
for (const r of roots) walk(r)
console.log(`\nListo: ${changedFiles} archivos, ${replacements} reemplazos.`)
