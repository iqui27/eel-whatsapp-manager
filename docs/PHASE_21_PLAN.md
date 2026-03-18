# Phase 21: Campaign-Group Integration & Setup Wizard

## Overview

Este plano conecta todos os componentes já implementados em um fluxo coeso e profissional, além de adicionar um wizard de configuração para facilitar o onboarding.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │  CHIP   │────▶│SEGMENT  │────▶│  GROUP  │────▶│CAMPAIGN │              │
│   │         │     │         │     │         │     │         │              │
│   │ health  │     │ tag     │     │ invite  │     │ template│              │
│   │ limits  │     │ voters  │     │ capacity│     │ queue   │              │
│   └─────────┘     └─────────┘     └─────────┘     └─────────┘              │
│        │               │               │               │                    │
│        │               │               │               │                    │
│        ▼               ▼               ▼               ▼                    │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                     MESSAGE QUEUE                                 │      │
│   │  ┌─────────────────────────────────────────────────────────┐    │      │
│   │  │ resolvedMessage = template.replace('{link_grupo}', link) │    │      │
│   │  └─────────────────────────────────────────────────────────┘    │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 21 Breakdown

### PLAN 21-01: Schema Enhancement & Segment-Group Mapping

**Objective:** Adicionar campos necessários para associar segmentos a grupos e chips.

**Tasks:**
1. Add `segmentTag` to segments table
2. Add migration for new field
3. Update segment CRUD to handle tag
4. Add segment selection in chip form
5. Add segment selection in group form
6. Create helper function `getSegmentGroupMapping()`

**Files to modify:**
- `src/db/schema.ts` - Add segmentTag field
- `drizzle/0010_segment_tag.sql` - Migration
- `src/lib/db-segments.ts` - CRUD updates
- `src/app/chips/page.tsx` - Segment selection UI
- `src/app/grupos/page.tsx` - Segment selection UI

---

### PLAN 21-02: Campaign Queue Integration with Group Links

**Objective:** Fazer a hidratação da fila resolver automaticamente o `{link_grupo}` baseado no segmento.

**Tasks:**
1. Create `resolveCampaignVariables()` function
2. Update `hydrateCampaignToQueue()` to use resolver
3. Add group lookup by segment tag
4. Handle missing group (create or error)
5. Cache resolved links during campaign execution
6. Update webhook handlers to track campaign context

**Files to modify:**
- `src/lib/campaign-groups.ts` - Enhance resolver
- `src/lib/db-message-queue.ts` - Update hydration
- `src/app/api/cron/campaigns/route.ts` - Use resolver

---

### PLAN 21-03: Automatic Group Overflow

**Objective:** Detectar quando grupo está cheio e criar overflow automaticamente.

**Tasks:**
1. Create overflow detection cron job
2. Implement `createOverflowGroupIfNeeded()` function
3. Update campaign to use new group link
4. Add notification system for overflow events
5. Update dashboard alerts with overflow warnings
6. Create API endpoint for manual overflow trigger

**Files to create/modify:**
- `src/app/api/cron/group-overflow/route.ts` - New cron
- `src/lib/db-groups.ts` - Overflow functions
- `src/lib/notifications.ts` - New notification helper
- `src/components/alerts-panel.tsx` - Overflow alerts

---

### PLAN 21-04: Chip Failover Enhancement

**Objective:** Melhorar o sistema de failover para trocar de chip automaticamente quando queimar.

**Tasks:**
1. Enhance `selectBestChip()` with fallback chain
2. Add chip backup assignment in segments
3. Create `handleChipFailure()` orchestration function
4. Update message queue to handle chip switch
5. Add notification for chip failure events
6. Update operations dashboard with chip swap indicator

**Files to modify:**
- `src/lib/chip-router.ts` - Enhanced fallback
- `src/lib/db-message-queue.ts` - Chip switch handling
- `src/app/api/cron/chip-health/route.ts` - Failure handling
- `src/components/chip-health-grid.tsx` - Swap indicator

---

### PLAN 21-05: Setup Wizard Implementation

**Objective:** Criar wizard guiado para configuração inicial do sistema.

**Tasks:**
1. Create wizard shell with step navigation
2. Step 1: Chip configuration with QR code scan
3. Step 2: CSV import with smart column detection
4. Step 3: Segment creation with auto-detection
5. Step 4: Group creation with segment linking
6. Step 5: Campaign creation with preview
7. Add progress persistence (resume if abandoned)
8. Add skip/revisit functionality

**Files to create:**
- `src/app/setup/page.tsx` - Wizard main page
- `src/app/setup/chips/page.tsx` - Step 1
- `src/app/setup/import/page.tsx` - Step 2
- `src/app/setup/segments/page.tsx` - Step 3
- `src/app/setup/groups/page.tsx` - Step 4
- `src/app/setup/campaign/page.tsx` - Step 5
- `src/lib/setup-wizard.ts` - State management
- `src/components/setup-wizard-nav.tsx` - Navigation

---

### PLAN 21-06: Dashboard Enhancement & Guidance

**Objective:** Melhorar o dashboard com informações claras, tooltips e guias.

**Tasks:**
1. Add onboarding tooltips to operations dashboard
2. Create status cards with clear indicators
3. Add "what to do next" suggestions
4. Create quick actions panel
5. Add help links to documentation
6. Implement notification center
7. Add keyboard shortcuts

**Files to modify:**
- `src/app/operacoes/page.tsx` - Enhanced dashboard
- `src/components/quick-actions-panel.tsx` - New component
- `src/components/notification-center.tsx` - New component
- `src/components/onboarding-tooltips.tsx` - New component

---

### PLAN 21-07: Message History & Analytics

**Objective:** Criar histórico completo de mensagens com busca e analytics.

**Tasks:**
1. Create message history page with filters
2. Add search functionality (by phone, name, content)
3. Add export functionality (CSV, PDF)
4. Create analytics charts (delivery timeline, response rates)
5. Add per-campaign message logs
6. Add per-chip message logs
7. Create API endpoints for history queries

**Files to create:**
- `src/app/historico/page.tsx` - Enhanced history page
- `src/app/api/messages/history/route.ts` - History API
- `src/app/api/messages/search/route.ts` - Search API
- `src/components/message-history-table.tsx` - New component
- `src/components/message-analytics-charts.tsx` - New component

---

## Execution Order & Dependencies

```
PLAN 21-01 (Schema) 
    │
    ├──────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
PLAN 21-02 (Queue)                   PLAN 21-04 (Failover)
    │                                      │
    ▼                                      │
PLAN 21-03 (Overflow)  ◄─────────────────┘
    │
    │
    ├──────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
PLAN 21-05 (Wizard)                  PLAN 21-06 (Dashboard)
    │                                      │
    └──────────────────┬───────────────────┘
                       │
                       ▼
                PLAN 21-07 (History)
```

---

## Wave Execution

### Wave 1: Foundation (Parallel)
- PLAN 21-01: Schema Enhancement
- PLAN 21-04: Failover Enhancement

### Wave 2: Core Integration (Sequential, depends on Wave 1)
- PLAN 21-02: Queue Integration
- PLAN 21-03: Group Overflow

### Wave 3: User Experience (Parallel, depends on Wave 2)
- PLAN 21-05: Setup Wizard
- PLAN 21-06: Dashboard Enhancement

### Wave 4: Analytics (Sequential, depends on Wave 3)
- PLAN 21-07: Message History

---

## Testing Strategy

### Unit Tests
- `resolveCampaignVariables()` function
- `selectBestChip()` with fallback
- `createOverflowGroupIfNeeded()` logic
- Wizard state management

### Integration Tests
- Campaign → Queue → Group link flow
- Chip failover end-to-end
- Overflow detection and creation
- Wizard step completion

### E2E Tests
- Complete setup wizard flow
- Campaign execution with group link
- Chip failure and recovery
- Group overflow trigger

---

## Success Criteria

1. **Segment-Group Mapping**: Criar segmento → automaticamente sugerir chip e grupo
2. **Campaign Variables**: `{link_grupo}` resolve para o grupo correto do segmento
3. **Group Overflow**: Grupo cheio → novo grupo criado → link atualizado automaticamente
4. **Chip Failover**: Chip queima → mensagens redirecionadas → notificação enviada
5. **Setup Wizard**: Novo usuário consegue configurar tudo em < 10 minutos
6. **Dashboard**: Operador entende status do sistema em < 30 segundos
7. **Message History**: Buscar qualquer mensagem em < 3 segundos

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Migration failure | Backup before migration, rollback script |
| Group creation rate limit | Batch creation, exponential backoff |
| Chip ban cascade | Stagger sends, multiple chips per segment |
| Wizard abandonment | Progress persistence, email reminder |
| Performance degradation | Pagination, caching, query optimization |

---

## Estimated Effort

| Plan | Duration | Complexity |
|------|----------|------------|
| 21-01 | 2-3 hours | Medium |
| 21-02 | 3-4 hours | High |
| 21-03 | 2-3 hours | Medium |
| 21-04 | 2-3 hours | Medium |
| 21-05 | 4-5 hours | High |
| 21-06 | 2-3 hours | Medium |
| 21-07 | 3-4 hours | Medium |

**Total: ~20-25 hours**

---

## Ready to Execute?

Confirme e vou começar a implementação pelo PLAN 21-01 (Schema Enhancement).