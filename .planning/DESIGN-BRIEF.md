# EEL — Design Brief para Paper

## Produto
**EEL** — WhatsApp Chip Manager
Dashboard para gerenciar chips WhatsApp, aquecimento automático, contatos e clusters de mensagens.

## Público
Operadores de marketing digital que gerenciam múltiplos chips WhatsApp.

## Vibe
- **Startup unicórnio** — profissional, premium, confiável
- **Minimalista** — sem ruído visual, cada pixel tem propósito
- **Intuitivo** — zero curva de aprendizado

## Referências Visuais
| App | O que pegar |
|-----|-------------|
| Linear | Sidebar, navigation, command palette |
| Vercel | Dark mode, tipografia, spacing |
| Stripe | Data visualization, tabelas, density |
| Cal.com | Forms, settings, elegância open source |
| Raycast | Command palette, micro-interações |

---

## Color System

### Light Mode
| Token | Uso | Valor |
|-------|-----|-------|
| `--bg-primary` | Background principal | `#FAFAFA` |
| `--bg-surface` | Cards, sidebar | `#FFFFFF` |
| `--bg-elevated` | Modals, popovers | `#FFFFFF` |
| `--text-primary` | Texto principal | `#0A0A0A` |
| `--text-secondary` | Texto secundário | `#6B7280` |
| `--text-muted` | Texto desabilitado | `#9CA3AF` |
| `--border` | Bordas | `#E5E7EB` |
| `--accent` | CTA, links, ativo | `#2563EB` |
| `--success` | Conectado, sucesso | `#10B981` |
| `--warning` | Aquecendo | `#F59E0B` |
| `--destructive` | Erro, delete | `#EF4444` |

### Dark Mode
| Token | Uso | Valor |
|-------|-----|-------|
| `--bg-primary` | Background principal | `#09090B` |
| `--bg-surface` | Cards, sidebar | `#111113` |
| `--bg-elevated` | Modals, popovers | `#1A1A1E` |
| `--text-primary` | Texto principal | `#FAFAFA` |
| `--text-secondary` | Texto secundário | `#A1A1AA` |
| `--text-muted` | Texto desabilitado | `#52525B` |
| `--border` | Bordas | `#27272A` |
| `--accent` | CTA, links, ativo | `#3B82F6` |
| `--success` | Conectado, sucesso | `#22C55E` |
| `--warning` | Aquecendo | `#EAB308` |
| `--destructive` | Erro, delete | `#EF4444` |

---

## Typography

| Nível | Size | Weight | Line Height | Uso |
|-------|------|--------|-------------|-----|
| H1 | 28px | 700 | 1.2 | Título da página |
| H2 | 20px | 600 | 1.3 | Título de seção |
| H3 | 16px | 600 | 1.4 | Título de card |
| Body | 14px | 400 | 1.5 | Texto padrão |
| Small | 13px | 400 | 1.5 | Labels, metadata |
| Caption | 11px | 500 | 1.4 | Badges, tags |

**Font:** Geist Sans (já no projeto)

---

## Spacing Scale

| Token | Value | Uso |
|-------|-------|-----|
| `--space-1` | 4px | Micro gaps |
| `--space-2` | 8px | Tight spacing |
| `--space-3` | 12px | Default gap |
| `--space-4` | 16px | Section gap |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Page sections |

---

## Component Specs

### Sidebar
- **Width expanded:** 240px
- **Width collapsed:** 64px (icon only)
- **Background:** `--bg-surface`
- **Active item:** `--accent` background com 10% opacity, text `--accent`
- **Icons:** Lucide, 18px
- **Transition:** 200ms ease

### KPI Cards
- **Height:** ~100px
- **Corners:** 12px
- **Padding:** 20px
- **Icon:** Lucide em container 40x40 com background gradient
- **Value:** 28px bold
- **Label:** 13px muted
- **Trend indicator:** ↑/↓ com cor verde/vermelha

### Data Tables
- **Header:** 13px semibold, muted, uppercase tracking
- **Rows:** 14px, 52px height
- **Hover:** subtle background change
- **Actions:** icon buttons 32x32
- **Pagination:** no infinite scroll

### Buttons
- **Primary:** `--accent` bg, white text, 36px height
- **Secondary:** transparent, `--border` border, 36px height
- **Ghost:** transparent, hover bg
- **Destructive:** red variant
- **Corners:** 8px
- **Font:** 14px medium

### Inputs
- **Height:** 36px
- **Border:** `--border`
- **Focus:** `--accent` ring
- **Corners:** 8px
- **Font:** 14px

---

## Screen Layouts

### Dashboard (Desktop) — 1440x900
```
┌──────────────────────────────────────────────┐
│ [Sidebar 240px] │ [Main Content]             │
│                 │                             │
│ Logo            │ Header: "Dashboard"         │
│ ─────────────── │ Subtitle + Dark/Light toggle│
│ 📊 Dashboard    │                             │
│ 📱 Chips        │ [KPI] [KPI] [KPI] [KPI]    │
│ 👥 Contatos     │                             │
│ 🧩 Clusters     │ [Line Chart ──────────────] │
│ 📜 Histórico    │                             │
│ ⚙️ Config       │ [Donut Chart] [Activity]    │
│                 │                             │
│ ─────────────── │                             │
│ [Status: API ●] │                             │
│ [Logout]        │                             │
└──────────────────────────────────────────────┘
```

### Dashboard (Mobile) — 390x844
```
┌──────────────┐
│ ≡  EEL  🌙   │
│              │
│ [KPI] [KPI]  │
│ [KPI] [KPI]  │
│              │
│ [Chart ────] │
│              │
│ [Activity──] │
│              │
│──────────────│
│ 📊  📱  👥  ⚙️ │
└──────────────┘
```

---

## States para cada componente

Cada componente deve ter:
1. **Default** — estado normal
2. **Hover** — feedback visual
3. **Active/Pressed** — clicado
4. **Disabled** — desabilitado
5. **Loading** — skeleton
6. **Empty** — sem dados
7. **Error** — com erro
