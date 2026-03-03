# EEL — Dashboard Overhaul Roadmap

> Transformar o EEL de um dashboard funcional básico em um produto de nível startup unicórnio.
> Bonito, minimalista, UI/UX intuitiva, mobile-ready, dark/light mode.

## Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| **Database** | Supabase (PostgreSQL) | Migrar de JSON local para banco real |
| **Tema** | Dark + Light com toggle | Usuário escolhe |
| **Charts** | Recharts | Leve, React-native, boa DX |
| **Animations** | Framer Motion | Padrão React para micro-interações |
| **Toasts** | Sonner | Melhor DX, bonito por padrão |
| **Icons** | Lucide React | Já no projeto, substituir emojis |
| **Design** | Paper (Pencil) first | Design completo antes de codar |
| **Mobile** | Responsivo, mobile-friendly | Funcionar em celular |
| **ORM** | Drizzle ORM | Type-safe, leve, edge-compatible |

## Stack Final

- Next.js 16 + React 19
- Tailwind CSS 4 + shadcn/ui
- Supabase PostgreSQL + Drizzle ORM
- Recharts (gráficos)
- Framer Motion (animações)
- Sonner (toasts)
- Lucide React (ícones)

---

## Fases

### Phase 1: Design System + Paper Prototyping 🎨
**Status:** Em progresso
**Goal:** Design completo no Paper antes de escrever código

**Screens a criar:**
1. Design System Components (palette, typography, buttons, inputs, cards, tables)
2. Dashboard Desktop (sidebar + KPIs + charts + activity feed)
3. Dashboard Mobile (responsive)
4. Chips Page (desktop + mobile)
5. Contacts Page (desktop + mobile)
6. Clusters Page (desktop + mobile)
7. History Page (desktop + mobile)
8. Settings Page (desktop + mobile)
9. Login Page (dark theme premium)

**Requirements:** [DESIGN-01, DESIGN-02, DESIGN-03]

---

### Phase 2: Foundation — Supabase + Design System Code 🏗️
**Status:** Pendente
**Goal:** Migrar dados para Supabase e implementar design system em código

**Tasks:**
- [ ] Setup Drizzle ORM + Supabase connection
- [ ] Schema: chips, contacts, clusters, logs, sessions, config
- [ ] Migration script (JSON → PostgreSQL)
- [ ] Implementar design tokens (CSS variables dark/light)
- [ ] Atualizar shadcn components com novo tema
- [ ] Sidebar component (collapsible, animated)
- [ ] Skeleton loaders, Sonner toasts
- [ ] Substituir todos os emojis por Lucide icons

**Requirements:** [INFRA-01, INFRA-02, DS-01, DS-02]

---

### Phase 3: Layout & Navigation Overhaul 📐
**Status:** Pendente
**Goal:** Nova sidebar, command palette, navigation patterns

**Tasks:**
- [ ] Sidebar collapsible com Framer Motion
- [ ] Dark/Light toggle no header
- [ ] Command palette (⌘K) com busca global
- [ ] Breadcrumbs
- [ ] Layout responsivo mobile-first
- [ ] Bottom navigation (mobile)

**Requirements:** [NAV-01, NAV-02, NAV-03]

---

### Phase 4: Dashboard Premium + Charts 📊
**Status:** Pendente
**Goal:** Dashboard de nível unicórnio com dados reais

**Tasks:**
- [ ] KPI cards com micro-animações e gradientes
- [ ] Line chart: warming timeline (últimos 7/30 dias)
- [ ] Donut chart: success vs error rate
- [ ] Bar chart: chips mais ativos
- [ ] Activity feed em tempo real
- [ ] Status indicators animados
- [ ] Empty states ilustrados

**Requirements:** [DASH-01, DASH-02, DASH-03]

---

### Phase 5: Pages Overhaul 📱
**Status:** Pendente
**Goal:** Todas as páginas redesenhadas com UX premium

**Tasks:**
- [ ] Chips: tabela avançada, bulk actions, filtros compostos
- [ ] Contacts: busca avançada, edição inline, tags visuais
- [ ] Clusters: visual pipeline, drag & drop reorder
- [ ] History: timeline visual, infinite scroll, export
- [ ] Settings: seções colapsáveis, validação em tempo real
- [ ] Login: split screen premium, animação de entrada

**Requirements:** [PAGES-01, PAGES-02, PAGES-03, PAGES-04, PAGES-05]

---

### Phase 6: Polish & Animations ✨
**Status:** Pendente
**Goal:** Micro-interações, page transitions, onboarding

**Tasks:**
- [ ] Framer Motion page transitions
- [ ] Hover/click micro-interações em todos os elementos
- [ ] Empty states com ilustrações SVG
- [ ] Onboarding flow (primeiro uso)
- [ ] Loading states premium (skeleton + shimmer)
- [ ] Final QA: mobile, dark mode, performance

**Requirements:** [POLISH-01, POLISH-02, POLISH-03]

---

## Referências de Design

Inspiração visual para o Paper:
- Linear.app (sidebar + navigation)
- Vercel Dashboard (minimalismo + dark mode)
- Stripe Dashboard (charts + data density)
- Cal.com (open source elegance)
- Raycast (command palette)
