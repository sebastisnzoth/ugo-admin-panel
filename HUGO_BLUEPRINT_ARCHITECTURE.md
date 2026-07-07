# Hugo Blueprint: Architectural Plan
**Date**: 2026-07-07  
**Status**: ⏳ AWAITING USER APPROVAL  
**Scope**: Complete refactor of Hugo AI system + Control Panel integration

---

## 1. VISION & CORE OBJECTIVES

### Primary Goal
Transform Hugo from a stateless chat bot into a **persistent, context-aware AI co-pilot** 
that maintains deep relationships with Clients and Providers, enabling:
- Personalized recommendations based on history
- Proactive issue detection
- Relationship strength predictions
- Bidirectional communication facilitation
- Voice-ready operations

### Success Metrics
- Hugo recall accuracy: >95% on user context (who am I? what's my history?)
- Admin control panel: All features toggleable via UI (feature flags)
- Response time: <2s for contextual queries (with caching)
- Voice commands: Complete workflow executable via Voiceflow/Twilio integration

---

## 2. ARCHITECTURAL COMPONENTS

### 2.1 Memory Layer (Database)

**New Tables**:
```
hugo_client_provider_relationships (tracks all connections)
hugo_service_memory (service history with quality scores)
hugo_interaction_log (every interaction with Hugo)
hugo_memory_insights (aggregated profiles for ML/recommendations)
hugo_feature_flags (toggleable features - Modular Design requirement)
```

**Implementation Timeline**:
- **Phase 1** (Week 1): Create tables + RLS policies
- **Phase 2** (Week 2): Populate from existing `servicios`, `resenas`, `usuarios`
- **Phase 3** (Week 3): Build query layer + caching

**Data Flow**:
```
servicios → hugo_service_memory (on completion)
usuarios + resenas → hugo_memory_insights (on rating/review)
chat messages → hugo_interaction_log (on every Hugo msg)
```

### 2.2 Query Layer (API Endpoints)

**New RPCs** (in Supabase):
```sql
-- Get full context for a user
hugo_get_user_context(user_id, user_role) 
  → {profile, relationships, service_history, preferences}

-- Get relationship summary (Client ↔ Provider)
hugo_get_relationship_summary(cliente_id, proveedor_id)
  → {total_services, ratings, reviews, disputes, repeat_likelihood}

-- Search providers based on client preferences
hugo_find_providers(cliente_id, categoria_id, prefer_...)
  → [{provider_id, compatibility_score, reason}]

-- Log interaction for memory
hugo_log_interaction(user_id, tipo, contexto)
  → {logged: true}

-- Toggle feature
hugo_toggle_feature(feature_key, enabled)
  → {feature_key, enabled, config}
```

**HTTP Endpoints** (Next.js API routes):
```
POST /api/hugo/context
  body: {user_id, user_role}
  returns: full context object

GET /api/hugo/relationship/:cliente_id/:proveedor_id
  returns: relationship summary

POST /api/hugo/feature-flags
  body: {feature_key, enabled, config}
  returns: updated flag

GET /api/hugo/feature-flags?group=admin
  returns: all flags for group
```

### 2.3 Chat Layer (Hugo AI Enhancement)

**Current State**: Hugo in `api/hugo/chat.ts` uses:
- Regional prompts from `config_sistema`
- Groq + Gemini LLMs
- No memory beyond single conversation

**New State**:
1. Load user context via `hugo_get_user_context()`
2. Inject memory into system prompt:
   ```
   "You're talking to [CLIENT_NAME] who has hired 15 providers, 
    prefers budget-friendly services, and last worked with Juan on plumbing (4 stars).
    His repeated provider is Roberto (8 services, 4.8 stars).
    Recent issue: delayed service 3 days ago."
   ```
3. Log interaction via `hugo_log_interaction()`
4. Trigger proactive actions (disputes, quality alerts)

### 2.4 Control Panel Layer (Hugo Management UI)

**New Sections in AdminPanel**:

#### 4a. Feature Flags Dashboard
```
┌─ FEATURE FLAGS ────────────────────┐
│ ☑ Client App Enabled               │
│   └─ Real-time notifications       │
│   └─ Voice commands                │
│ ☑ Provider App Enabled             │
│   └─ Smart job matching            │
│ ☑ Hugo Memory System               │
│   └─ Persistence level: FULL       │
│ ☑ Analytics Engine                 │
│ ☑ Relationship Reports             │
│ ☐ Experimental: Voice Full-Control │
└────────────────────────────────────┘
```

Each toggle:
- Updates `hugo_feature_flags` table
- Real-time push to clients/providers via Supabase
- No redeploy needed

#### 4b. Client-Provider Relationships Dashboard
```
┌─ RELATIONSHIPS (Filter: Active) ────┐
│ [Search client...] [Filter...]      │
│                                      │
│ Cliente: Ana (São Paulo)            │
│   ├─ Roberto (Electrician) [4.8★]   │
│   │  └─ 12 services, $3,400 total   │
│   │  └─ Last: 2026-07-05            │
│   │  └─ Repeat likelihood: 92%      │
│   ├─ João (Plumber) [3.2★]          │
│   │  └─ 3 services, $850 total      │
│   │  └─ Status: ⚠ DISPUTE OPEN     │
│   └─ [+ View All (14)]              │
└─────────────────────────────────────┘
```

Click on relationship → detailed view:
- Full service history
- Communication timeline
- Dispute history
- Quality trends
- Admin notes

#### 4c. Hugo Insights Panel
```
┌─ HUGO MEMORY INSIGHTS ───────────────┐
│                                       │
│ Top Patterns (24h):                  │
│ • Clients preferring same provider:  │
│   └─ 34% repeat rate (↑ 12% from avg)│
│                                       │
│ • Provider reliability:               │
│   └─ Roberto: 98% acceptance rate    │
│   └─ João: 73% acceptance rate       │
│                                       │
│ • Quality Trends:                    │
│   └─ Weekend services: 4.1★ (vs 3.8★)│
│   └─ Electrical work: 4.6★ (top cat) │
│                                       │
│ • Potential Issues:                  │
│   └─ 3 disputes opened in last 24h   │
│   └─ 2 providers under-performing    │
│                                       │
│ [Export Report as PDF] [Voice Reset] │
└────────────────────────────────────────┘
```

### 2.5 Voice Layer (Future - Voice-Ready Architecture)

**Voice Commands** (Voiceflow/Twilio integration):
```
Admin voice: "Enable bulk approval for electrical services"
  → Updates feature flag + applies bulk action

Provider voice: "Who's my best client this month?"
  → Hugo queries memory: returns top client + repeat likelihood

Client voice: "Find me a plumber like the one I used last time"
  → Hugo finds relationship → find similar providers → sort by compatibility
```

**Already Structured For**:
- API endpoints are query-friendly (structured JSON responses)
- Feature flags enable/disable features without code changes
- RLS ensures voice commands respect permissions

---

## 3. INTEGRATION WITH EXISTING SYSTEM

### Current Architecture (Unchanged)
```
client.html / provider.html → Supabase RT → AdminPanel.tsx
                          ↘                ↗
                        api/hugo/chat.ts
                       (Groq/Gemini LLMs)
```

### New Hugo Architecture (Additive)
```
client.html / provider.html
         ↓
   [LOAD: hugo_get_user_context()]
         ↓
   hugo_interaction_log.insert()
         ↓
   api/hugo/chat.ts
   └─ Enhanced prompt with memory
   └─ Groq/Gemini (same LLMs)
         ↓
   [RESPONSE] → [LOG: hugo_interaction_log.insert()]
         ↓
   AdminPanel.tsx (NEW sections)
   ├─ Feature Flags Dashboard
   ├─ Relationships View
   └─ Hugo Insights Panel
```

**No Breaking Changes**:
- Existing chats continue working
- New memory loads parallel to old system
- Gradual rollout via feature flags

---

## 4. IMPLEMENTATION ROADMAP

### Phase 1: Memory Infrastructure (Week 1)
- [ ] Create 5 new tables (hugo_*) in Supabase
- [ ] Write RLS policies (admins can edit, users see own data)
- [ ] Create RPCs for CRUD operations
- [ ] Migrate historical data: `servicios` → `hugo_service_memory`
- **Deliverable**: Database ready, no UI changes yet

### Phase 2: Query Layer (Week 2)
- [ ] Build RPCs (hugo_get_user_context, hugo_get_relationship_summary, etc.)
- [ ] Build HTTP endpoints (`/api/hugo/context`, `/api/hugo/relationship/...`)
- [ ] Add caching layer (Redis or in-memory)
- [ ] Write integration tests
- **Deliverable**: All queries tested, <2s response time

### Phase 3: Chat Integration (Week 3)
- [ ] Modify `api/hugo/chat.ts` to load context
- [ ] Inject memory into system prompt
- [ ] Test with sample conversations
- [ ] Verify no regression in existing flows
- **Deliverable**: Hugo chat now context-aware

### Phase 4: Control Panel UI (Week 4)
- [ ] Build Feature Flags Dashboard (toggles)
- [ ] Build Relationships Dashboard (client-provider view)
- [ ] Build Hugo Insights Panel (metrics)
- [ ] Wire up real-time updates
- **Deliverable**: Admin can manage Hugo system from UI

### Phase 5: Voice Architecture (Week 5)
- [ ] Design voice command spec
- [ ] Build Voiceflow/Twilio bridge
- [ ] Test sample commands (3-5 flows)
- [ ] Document voice API contract
- **Deliverable**: Voice-ready architecture (implementation later)

---

## 5. FEATURE FLAGS STRATEGY (Modular Design)

All features toggleable via `hugo_feature_flags` table:

```json
{
  "feature_key": "hugo_memory_enabled",
  "descripcion": "Load user context into Hugo prompts",
  "enabled": true,
  "grupo": "client_app",
  "config": {
    "max_history_items": 20,
    "memory_cache_ttl_seconds": 3600,
    "include_disputes": true
  }
}
```

**Admin Control**:
- Toggle without deploy
- A/B test new features
- Gradual rollout (A% users get new feature)
- Emergency disable if issues arise

---

## 6. DATA FLOW EXAMPLES

### Example 1: Client Requesting Service (Memory Loaded)

```
1. Cliente Ana opens client.html
2. Hugo loads context:
   └─ hugo_get_user_context(ana_id, 'cliente')
   └─ Returns: {name, preferences, history, repeat_providers}
3. Ana: "Find me a plumber like the one I used last time"
4. Hugo injects memory:
   "Ana usually hires plumbers on weekends for $100-200, 
    rates them 4.2 stars average. Last one was João (3.2★, dispute open).
    Better option: Roberto (4.8★, plumber specialty)."
5. Hugo responds with recommendation + context
6. hugo_interaction_log.insert({tipo: 'solicitud', contexto: {...}})
```

### Example 2: Admin Toggling Feature

```
1. Admin clicks "Enable Relationship Insights"
2. Updates: hugo_feature_flags 
   SET enabled = true 
   WHERE feature_key = 'relationship_reports'
3. Real-time push → AdminPanel refreshes
4. Insights panel now visible to all admins
5. No code deploy, no server restart
```

### Example 3: Relationship Quality Alert

```
1. João (provider) rejection rate rises to 75%
2. Background job: hugo_memory_insights.update()
3. Flags degradation → generates alert
4. AdminPanel.HugoInsights shows: "⚠ João underperforming"
5. Admin can: a) contact João, b) deprioritize in matching, c) suspend
```

---

## 7. SECURITY & RLS

### Data Visibility Rules
- **Clients** can see: their own history, providers they've worked with, quality ratings
- **Providers** can see: their own history, clients they've worked with (anonymized), quality ratings
- **Admins** can see: everything, can edit notes/flags

```sql
-- RLS Policy: Clients see only their relationships
CREATE POLICY "clients_see_own_relationships"
  ON hugo_client_provider_relationships
  FOR SELECT
  USING (
    cliente_id = auth.uid() 
    OR EXISTS(SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin)
  );
```

---

## 8. SUCCESS CRITERIA & METRICS

| Metric | Target | How to Measure |
|--------|--------|---|
| Hugo recall accuracy | >95% | Manual test: "Who am I?" Q&A with sample users |
| Context load time | <500ms | Instrument `hugo_get_user_context()` |
| Admin UI responsiveness | <1s toggle | Time feature flag update in AdminPanel |
| Memory migration | 100% | Verify all historical servicios migrated |
| Voice command success | TBD Phase 5 | Sample 10 commands, log success rate |

---

## 9. RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Existing chats break | HIGH | Use feature flag: gradual rollout (10% → 50% → 100%) |
| DB query slow on large datasets | MEDIUM | Add indexes on `cliente_id`, `proveedor_id`, implement caching |
| Memory privacy leak | HIGH | Audit RLS policies, test visibility per role |
| Voice misuse (e.g., "approve all disputes") | MEDIUM | Implement voice confirmation, restricted command set |

---

## 10. DELIVERABLES SUMMARY

### By End of Week 1
- [ ] Database schema created + populated
- [ ] RLS policies tested
- [ ] Query performance baseline established

### By End of Week 2
- [ ] All RPCs working + cached
- [ ] HTTP endpoints tested
- [ ] Integration tests passing

### By End of Week 3
- [ ] Hugo chat context-aware
- [ ] Zero regression on existing flows
- [ ] A/B test data collection

### By End of Week 4
- [ ] Full control panel UI (Feature Flags, Relationships, Insights)
- [ ] Admin docs + training materials
- [ ] Internal beta testing complete

### By End of Week 5
- [ ] Voice architecture documented
- [ ] Sample voice commands working
- [ ] Ready for external beta (if approved)

---

## 11. APPROVAL REQUIREMENTS

**This plan requires explicit approval before ANY coding begins.**

Please confirm:
- [ ] Database schema approach is acceptable
- [ ] Feature flags strategy aligns with business goals
- [ ] Relationship data collection (service history, ratings) is compliant
- [ ] Voice architecture roadmap is feasible
- [ ] Weekly phased rollout is preferred delivery method

**Questions for Sergio**:
1. Should relationship data include disputes? (current proposal: yes, but admin can hide)
2. Voice commands: what's the minimum viable set? (current: 3-5 core commands)
3. Client-Provider visibility: should clients see provider email? (current proposal: no, only name + rating)
4. Feature flag A/B testing: desired granularity? (per-user? per-region? per-app?)

---

**Status**: ⏳ AWAITING YOUR APPROVAL  
**Next Step**: Review plan, ask questions, and I'll implement Phase 1

