# UGO Admin Panel — Guía de Desarrollo (Claude Code)

## 🎯 Comportamiento y Estrategia (Superpowers)

- **Actúa como Ingeniero Senior**: Arquitectura-first, código-second.
- **Antes de implementar**: Genera plan detallado y espera confirmación (no procedas sin go-ahead).
- **Evalúa trade-offs**: Considera siempre impacto en arquitectura, performance, escalabilidad.
- **Code quality first**: TypeScript strict mode, no hacks, no magic numbers.

## 📐 Arquitectura del Proyecto

### Stack
- **Frontend**: React 19 + TypeScript 6 + Vite 8
- **Backend**: Supabase (PostgreSQL + Realtime)
- **State**: Hybrid (Realtime subscriptions + local useState + polling)

### Estructura
```
src/
  ├── components/
  │   ├── AdminPanel.tsx (MONOLITO - en refactoring Fase 2)
  │   ├── sections/ (nuevos - Fase 2)
  │   ├── modals/ (nuevos - Fase 2)
  │   ├── AdvancedSections.tsx
  │   ├── MapaOperativo.tsx
  │   └── ...
  ├── hooks/
  │   ├── useAdminData.ts (provider principal)
  │   ├── useAdvancedData.ts
  │   └── ... (nuevos hooks - Fase 2/3)
  ├── lib/
  │   ├── supabase.ts (client config)
  │   └── database.types.ts (auto-generated)
  └── utils/
      └── mapPins.ts

supabase/
  └── migrations/ (DDL + RPCs)
```

### Patrones Críticos
1. **Realtime Channel Global**: Un único canal subscrito a múltiples tablas. No crear subscripciones por hook.
2. **RLS Policies**: Nunca modificar. Solo usar SELECT/INSERT/UPDATE/DELETE que respeten RLS.
3. **Audit Trail**: Toda acción admin registra en `audit_log` via `log_audit()` RPC.
4. **Admin-only Operations**: Validar `is_admin=true` en backend (RPC) + frontend (guards).

## ✅ Verificación Antes de Completar

- ✅ TypeScript compila: `npm run build` sin errores
- ✅ Build genera bundle: `dist/` folder presente, sin warnings fatales
- ✅ No hay console.errors (solo warnings permitidos si son terceros)
- ✅ Si hay tests: `npm test` pasa (cuando se agreguen)
- ✅ Cambios son Git-committed (no dejar working tree dirty)

## 🔄 Git Workflow

- **Branches**: 
  - `main` — Production ready (no direct commits)
  - `backup/etapa-*` — Backup de stages completadas
  - `claude/fase-*-*` — Feature branches activas (Fase 2, Fase 3, etc)
- **Commits**: 
  - Mensaje claro con context (eg: `feat(fase-2): Extract DashboardSection`)
  - Include `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`
- **Push**: Siempre push después de commits completados (`git push -u origin branch-name`)

## 📋 Etapas del Proyecto

### ✅ Completadas
- **Etapa 1**: Regiones + Estados verificación (Julio 5)
- **Etapa 4**: OCR Dashboard visual + métricas (Julio 6)
- **PR #5**: UX Improvements merged to main (Julio 6 23:50)

### 🔄 En Progreso (Paralelo)
- **Fase 1**: Consolidación Stage 4 — ✅ COMPLETADA
- **Fase 2**: Refactor AdminPanel monolito → modularizado (Target: 2-3 weeks)
  - #7: ✅ Extract DashboardSection
  - #8-11: Pending (Extract sections, modals, hooks, lazy loading)
- **Fase 3**: Document Queue + Bulk Operations (Target: 2-3 weeks)
  - #12: ✅ DB migration (documentos_asignaciones)
  - #13: ✅ RPCs (assign, bulk approve/reject)
  - #14-16: Pending (useDocumentQueue hook, component, queries)

## 🛠️ Comandos Útiles

```bash
# Instalación
npm install

# Desarrollo
npm run dev          # Vite dev server + hot reload

# Build & Validation
npm run build        # tsc -b && vite build (ALWAYS validate)
npm run lint         # eslint

# Git operations
git checkout -b claude/feature-name origin/main
git push -u origin claude/feature-name
git status           # ALWAYS check before committing
git log --oneline -5 # See recent commits
```

## 🚨 Anti-patterns (NO HACER)

- ❌ Modificar RLS policies sin aprobación
- ❌ Crear múltiples Realtime channels (use global + fan-out)
- ❌ UPDATE directo en DB sin audit logging
- ❌ Magic numbers en código (use const THRESHOLD_VALUE = ...)
- ❌ Dejar working tree dirty (siempre commit + push)
- ❌ Ignorar build warnings (pueden romper en prod)
- ❌ Cambiar enum values sin migration (eg: `documento_estado`)

## 📞 Contactos / Referencias

- **Repo**: https://github.com/sebastisnzoth/ugo-admin-panel
- **Supabase Project**: byajcqrgetloavrgyqak
- **Migrations**: `supabase/migrations/` (SQL files in order)
- **Database Types**: Auto-generated via `npx supabase gen types typescript`

## 📚 Documentación Relacionada

- `MIGRATIONS_LOG.md` — Historia de cambios DB + stages
- `.github/` — PR templates, workflows
- `package.json` — Dependencies, scripts

---

**Última actualización**: 2026-07-06 (Fase 2 + Fase 3 iniciadas en paralelo)

**Next Checkpoint**: Completar Fase 2 refactor (Tasks #8-11) y Fase 3 features (Tasks #14-16)
