# Phase 21: Campaign-Group Integration & Setup Wizard

## Phase Goal

Conectar todos os componentes do sistema em um fluxo coeso e profissional, permitindo que operadores criem e executem campanhas WhatsApp com grupos de conversão de forma simples e monitorada.

---

## Plans Overview

| Plan | Name | Wave | Duration | Status |
|------|------|------|----------|--------|
| 21-01 | Schema Enhancement & Segment-Group Mapping | 1 | 2-3h | ⬜ Pending |
| 21-02 | Campaign Queue Integration with Group Links | 2 | 3-4h | ⬜ Pending |
| 21-03 | Automatic Group Overflow | 2 | 2-3h | ⬜ Pending |
| 21-04 | Chip Failover Enhancement | 1 | 2-3h | ⬜ Pending |
| 21-05 | Setup Wizard Implementation | 3 | 4-5h | ⬜ Pending |
| 21-06 | Dashboard Enhancement & Guidance | 3 | 2-3h | ⬜ Pending |
| 21-07 | Message History & Analytics | 4 | 3-4h | ⬜ Pending |

**Total Estimated: 18-25 hours**

---

## Execution Waves

### Wave 1 (Parallel)
```
21-01 Schema Enhancement    21-04 Chip Failover
        │                           │
        └───────────┬───────────────┘
                    │
                    ▼
              Wave 1 Complete
```

### Wave 2 (Sequential)
```
Wave 1 Complete
        │
        ▼
21-02 Campaign Queue Integration
        │
        ▼
21-03 Automatic Group Overflow
        │
        ▼
              Wave 2 Complete
```

### Wave 3 (Parallel)
```
Wave 2 Complete
        │
        ├───────────────────────────┐
        ▼                           ▼
21-05 Setup Wizard          21-06 Dashboard Enhancement
        │                           │
        └───────────┬───────────────┘
                    │
                    ▼
              Wave 3 Complete
```

### Wave 4 (Sequential)
```
Wave 3 Complete
        │
        ▼
21-07 Message History & Analytics
        │
        ▼
          Phase 21 Complete ✅
```

---

## Dependencies Graph

```
21-01 ─────────────────────────────────────────┐
  │                                             │
  │                                             │
  ▼                                             ▼
21-02 ────────────────────────────────┐    21-04
  │                                    │      │
  ▼                                    │      │
21-03 ─────────────────────────────────┼──────┘
                                       │
                                       ▼
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
                 21-05                               21-06
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                                    21-07
```

---

## Success Metrics

### Functional Requirements
- [ ] Segment can have `segmentTag` for identification
- [ ] Chip can have multiple `assignedSegments`
- [ ] Group can be linked to one `segmentTag`
- [ ] `{link_grupo}` resolves automatically in templates
- [ ] Groups overflow at 90% capacity
- [ ] Chips failover to backup automatically
- [ ] Setup wizard guides new users
- [ ] Dashboard shows clear status and actions
- [ ] Message history is searchable

### Performance Requirements
- [ ] Campaign hydration < 5 seconds for 10k voters
- [ ] Group link resolution < 100ms
- [ ] Message search < 3 seconds
- [ ] Dashboard load < 2 seconds

### User Experience Requirements
- [ ] New user can complete setup in < 10 minutes
- [ ] Operator understands system status in < 30 seconds
- [ ] Common actions accessible in < 2 clicks

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Migration breaks existing data | High | Low | Backup, rollback script |
| Evolution API rate limits | Medium | Medium | Batch operations, caching |
| Large CSV import performance | Medium | Medium | Streaming, chunking |
| Chip ban cascade | High | Low | Multiple chips per segment |
| Wizard abandonment | Medium | Medium | Progress persistence |

---

## Notes

- This phase connects all previously implemented components
- Focus on user experience and automation
- Comprehensive testing after each wave
- Documentation updates throughout