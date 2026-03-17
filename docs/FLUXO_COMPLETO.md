# Fluxo Completo: Campanhas WhatsApp com Grupos e Conversão

## Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE CAMPANHA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SETUP INICIAL                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Chips   │───▶│ Segmentos│───▶│ Grupos   │───▶│ Templates│              │
│  │ (n chips)│    │ (tags)   │    │ (1/grupo)│    │ (variáveis)│            │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│  [health=healthy] [filtros]    [invite link]   [{link_grupo}]              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  2. EXECUÇÃO DA CAMPANHA                                                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Fila    │───▶│   Chip   │───▶│  Envio   │───▶│ Tracking │              │
│  │ (queue)  │    │  Router  │    │ (anti-ban)│   │ (webhook)│              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│  [prioridade]    [scoring]     [15-60s delay]  [delivered/read]            │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  3. CONVERSÃO & MONITORAMENTO                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Reply   │───▶│Group Join│───▶│ Funil    │───▶│  AI      │              │
│  │  (inbound)│   │ (webhook)│    │(dash)    │    │Analysis  │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│  [resposta]      [entrou]       [KPIs]         [tags auto]                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Passo 1: Configurar Chips

### O que já existe ✅
- Tabela `chips` com 8 estados de saúde
- Cron de health check a cada 30s
- Auto-restart quando desconecta
- Detecção de ban/quarentena
- Contadores diários/horários

### O que fazer
1. Acesse `/chips` para cadastrar os chips
2. Cada chip precisa de:
   - Nome (ex: "Chip Advogados 01")
   - Telefone normalizado (E.164)
   - `instanceName` (nome na Evolution API)
   - Segmentos atribuídos (`assignedSegments`)
   - Limites diários/horários

### Exemplo de configuração
```typescript
// Chip para segmento "advogados"
{
  name: "Chip Advogados 01",
  phone: "5511999888777",
  instanceName: "advogados_01",
  enabled: true,
  healthStatus: "healthy",
  dailyLimit: 200,
  hourlyLimit: 25,
  assignedSegments: ["advogados"],  // Tag do segmento
}
```

### Failover automático
```
Chip queima (banned/quarantined)
       │
       ▼
Mensagens pendentes → status "queued"
       │
       ▼
Chip Router seleciona outro chip
       │
       ▼
Continua envio automaticamente
```

---

## Passo 2: Criar Segmentos

### O que já existe ✅
- Página `/segmentacao` com filtro builder
- Import CSV com mapeamento
- Tabela `segmentVoters` para associação

### O que fazer
1. Importar base CSV em `/segmentacao/importar`
2. Criar segmentos com filtros (ex: "Advogados", "Mães", "Casamento")
3. Adicionar tag ao segmento para matching com chip/grupo

### Estrutura de segmento
```typescript
{
  name: "Advogados",
  filters: JSON.stringify({
    operator: "AND",
    filters: [
      { field: "tags", operator: "contains", value: "advogado" }
    ]
  }),
  // tag para matching
  segmentTag: "advogados", // ← Adicionar ao schema
}
```

---

## Passo 3: Criar Grupos para cada Segmento

### O que já existe ✅
- Tabela `whatsappGroups` com capacidade
- Webhook `GROUP_PARTICIPANTS_UPDATE` para sync
- Detecção de overflow (90%)
- Função `getOrCreateGroupForSegment()`

### O que fazer
1. Acesse `/grupos` para criar/gerenciar grupos
2. Cada grupo precisa:
   - Nome (ex: "Advogados - Eleição 2026")
   - Segmento tag
   - Chip responsável
   - Admins (números promovidos automaticamente)

### Exemplo de grupo
```typescript
{
  name: "Advogados - Eleição 2026",
  segmentTag: "advogados",
  chipId: "uuid-do-chip-advogados",
  chipInstanceName: "advogados_01",
  maxSize: 1024,
  currentSize: 0,
  status: "active",
  admins: ["5511888777666", "5511777666555"], // Promovidos automaticamente
}
```

### Overflow automático
```
Grupo atinge 90% (922/1024)
       │
       ▼
Alerta no dashboard
       │
       ▼
Criar "Advogados - Eleição 2026 (2)"
       │
       ▼
Novo link gerado
       │
       ▼
Campanha usa novo link automaticamente
```

---

## Passo 4: Criar Template de Mensagem

### O que já existe ✅
- Editor de campanha com variáveis
- Preview em tempo real
- CTA score
- Variação de mensagens (spintax, emoji, greetings)

### Variáveis disponíveis
```text
{nome}          → Nome do eleitor
{telefone}      → Telefone
{zona}          → Zona eleitoral
{link_grupo}    → Link do grupo do segmento (RESOLVIDO AUTOMATICAMENTE)
{candidato}     → Nome do candidato
{cargo}         → Cargo
{partido}       → Partido
```

### Exemplo de template
```text
Olá {nome}! 👋

Sou da equipe do {candidato}, candidato a {cargo}.

Identificamos que você é um profissional importante na sua região. 
Queremos convidá-lo para um grupo exclusivo de advogados que apoiam nossa campanha!

🔗 Entre agora: {link_grupo}

Juntos, vamos fazer a diferença!
```

---

## Passo 5: Criar e Executar Campanha

### Fluxo de criação
```
1. /campanhas/nova
       │
       ▼
2. Nome + Segmento
       │
       ▼
3. Template com {link_grupo}
       │
       ▼
4. Selecionar chip (ou auto)
       │
       ▼
5. Agendar ou enviar agora
       │
       ▼
6. Hidratação → Fila → Envio
```

### Resolução automática do link_grupo
```typescript
// Na hora de hidratar a fila:
async function hydrateCampaignQueue(campaignId: string) {
  // 1. Buscar segmento da campanha
  const campaign = await getCampaign(campaignId);
  const segment = await getSegment(campaign.segmentId);
  
  // 2. Buscar grupo para o segmento
  const group = await getGroupForSegment(segment.tag); // ← Pega grupo ativo com capacidade
  
  // 3. Se não tem grupo, criar
  if (!group) {
    const chip = await selectBestChip(segment.id);
    const result = await getOrCreateGroupForSegment(
      segment.tag,
      segment.name,
      chip,
      evolutionConfig,
      adminPhones
    );
  }
  
  // 4. Resolver template com {link_grupo}
  const resolvedTemplate = template.replace('{link_grupo}', group.inviteUrl);
  
  // 5. Criar mensagens na fila
  for (const voter of voters) {
    await createQueueMessage({
      campaignId,
      voterId: voter.id,
      voterPhone: voter.phone,
      resolvedMessage: personalizeTemplate(resolvedTemplate, voter),
      segmentId: segment.id,
    });
  }
}
```

---

## Passo 6: Monitoramento

### Dashboard de Operações (`/operacoes`)

#### KPIs em tempo real
- Mensagens enviadas
- Taxa de entrega
- Taxa de leitura
- Taxa de resposta
- Conversão para grupo

#### Chip Health Grid
```
🟢 Chip Advogados 01    45/200 hoje    2m atrás
🟢 Chip Mães 01         78/200 hoje    5m atrás
🔴 Chip Casamentos 01   QUARENTENA     1h atrás
```

#### Campanhas ativas
```
┌─────────────────────────────────────────────────────┐
│ Campanha Advogados                                  │
│ ████████████████████░░░░░░░░░░  45% (450/1000)     │
│ Entregues: 420 | Lidas: 280 | Respostas: 45        │
└─────────────────────────────────────────────────────┘
```

#### Grupos
```
┌─────────────────────────────────────┐
│ Advogados - Eleição 2026            │
│ ████████████████████████░░░░  89%   │
│ 912/1024 ⚠️ CRIAR OVERFLOW         │
└─────────────────────────────────────┘
```

#### Mensagens recentes
```
📤 Chip Advogados 01 → Maria Silva: "Olá Maria!..." ✓✓
📥 Chip Mães 01     ← João Santos: "Quero participar!"
📤 Chip Mães 01     → João Santos: "Perfeito! Entre..." ✓
```

---

## Passo 7: Conversão e Follow-up

### Funil de conversão
```
Enviados: 10.000 (100%)
    │
    ▼
Entregues: 9.200 (92%)
    │
    ▼
Lidos: 5.500 (60%)
    │
    ▼
Responderam: 800 (8.7%)
    │
    ▼
Entraram no grupo: 450 (56% dos que responderam)
```

### Webhooks que rastreiam
```typescript
// 1. Mensagem entregue/lida
MESSAGES_UPDATE → updateMessageDeliveryStatus()

// 2. Resposta do eleitor
MESSAGES_UPSERT → recordReply() + triggerAI()

// 3. Entrou no grupo
GROUP_PARTICIPANTS_UPDATE → recordGroupJoin()
```

### AI Analysis automática
```typescript
// Para cada resposta:
const analysis = await analyzeMessage(phone, message);
// {
//   sentiment: "positive",
//   intent: "support",
//   suggestedTags: ["interessado", "advogado", "sp"],
//   recommendedAction: "Adicionar ao grupo VIP"
// }

// Auto-aplicar tags
await applyAutoTags(voterId, analysis.suggestedTags);

// Atualizar tier do lead
await updateVoterTier(voterId, "hot");
```

---

## Passo 8: HITL - Assumir Conversas

### O que já existe ✅
- Página `/conversas` com queue
- Painel de chat em tempo real
- Contexto do voter ao lado
- Priorização automática

### Fluxo
```
1. Resposta chega → webhook
       │
       ▼
2. AI analisa → intent/sentiment
       │
       ▼
3. Se precisa atenção → status "open"
       │
       ▼
4. Aparece na queue de /conversas
       │
       ▼
5. Agente assume → status "assigned"
       │
       ▼
6. Responde manualmente
       │
       ▼
7. Resolve → status "resolved"
```

---

## Wizard de Configuração (Sugerido)

### Página: `/setup/campanha`

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETUP WIZARD                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASSO 1/5: Configurar Chips                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Quantos chips você tem? [ 3 ]                               ││
│  │                                                             ││
│  │ Chip 1:                                                     ││
│  │   Nome: [Chip Advogados    ]  Telefone: [5511999888777   ] ││
│  │   Segmento: [advogados     ]  Limite dia: [200           ] ││
│  │   Status: 🟢 Conectado                                      ││
│  │                                                             ││
│  │ Chip 2:                                                     ││
│  │   Nome: [Chip Mães         ]  Telefone: [5511888777666   ] ││
│  │   Segmento: [maes          ]  Limite dia: [200           ] ││
│  │   Status: 🟢 Conectado                                      ││
│  │                                                             ││
│  │ [+ Adicionar Chip]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                              [Próximo →]                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASSO 2/5: Importar Eleitores                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Arraste seu CSV aqui ou clique para selecionar             ││
│  │                                                             ││
│  │ 📄 eleitores.csv (50.000 linhas)                           ││
│  │                                                             ││
│  │ Mapeamento:                                                 ││
│  │   nome → name ✓                                             ││
│  │   telefone → phone ✓                                        ││
│  │   zona → zone ✓                                             ││
│  │   tags → tags ✓                                             ││
│  │                                                             ││
│  │ [Ver preview] [Importar]                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                              [← Voltar] [Próximo →]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASSO 3/5: Criar Segmentos                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Segmentos detectados automaticamente:                       ││
│  │                                                             ││
│  │ ✅ Advogados (2.500 eleitores)                              ││
│  │    Chip: Chip Advogados 01                                  ││
│  │    Grupo: [Criar grupo automaticamente]                     ││
│  │                                                             ││
│  │ ✅ Mães (3.200 eleitores)                                   ││
│  │    Chip: Chip Mães 01                                       ││
│  │    Grupo: [Criar grupo automaticamente]                     ││
│  │                                                             ││
│  │ ✅ Casamento Comunitário (1.800 eleitores)                  ││
│  │    Chip: [Selecionar chip...]                               ││
│  │    Grupo: [Criar grupo automaticamente]                     ││
│  │                                                             ││
│  │ [+ Criar segmento manual]                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              [← Voltar] [Próximo →]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASSO 4/5: Criar Grupos WhatsApp                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Grupos que serão criados:                                   ││
│  │                                                             ││
│  │ 📱 Advogados - Eleição 2026                                 ││
│  │    Chip: Chip Advogados 01                                  ││
│  │    Admins: [5511888777666, 5511777666555]                   ││
│  │    Link: (gerado após criação)                              ││
│  │                                                             ││
│  │ 📱 Mães - Eleição 2026                                      ││
│  │    Chip: Chip Mães 01                                       ││
│  │    Admins: [5511888777666, 5511777666555]                   ││
│  │    Link: (gerado após criação)                              ││
│  │                                                             ││
│  │ [Criar todos os grupos agora]                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              [← Voltar] [Próximo →]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASSO 5/5: Criar Template e Campanha                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Nome da campanha: [Campanha Advogados    ]                  ││
│  │                                                             ││
│  │ Template:                                                   ││
│  │ ┌─────────────────────────────────────────────────────────┐ ││
│  │ │ Olá {nome}! 👋                                          │ ││
│  │ │                                                         │ ││
│  │ │ Sou da equipe do {candidato}, candidato a {cargo}.      │ ││
│  │ │                                                         │ ││
│  │ │ Queremos convidá-lo para nosso grupo exclusivo!         │ ││
│  │ │                                                         │ ││
│  │ │ 🔗 Entre agora: {link_grupo}                            │ ││
│  │ └─────────────────────────────────────────────────────────┘ ││
│  │                                                             ││
│  │ Variáveis disponíveis: {nome} {telefone} {zona} {link_grupo}││
│  │                                                             ││
│  │ Segmento: [Advogados          ▼]                           ││
│  │ Chip: [Auto (recomendado)      ▼]                          ││
│  │ Agendamento: [Agora             ▼]                         ││
│  │                                                             ││
│  │ [Criar campanha e começar a enviar]                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                              [← Voltar] [Finalizar]              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementação

### Já implementado ✅
- [x] Tabela de chips com health monitoring
- [x] Cron de health check (30s)
- [x] Auto-restart de chips desconectados
- [x] Tabela de grupos com capacidade
- [x] Webhook GROUP_PARTICIPANTS_UPDATE
- [x] Tabela de fila de mensagens
- [x] Chip router com scoring
- [x] Anti-ban (delays, variações)
- [x] Tracking de delivery (MESSAGES_UPDATE)
- [x] Tracking de conversão (reply, group_join)
- [x] AI analysis (Gemini)
- [x] Dashboard de operações
- [x] Página de conversas HITL

### Precisa conectar 🔧
- [ ] `segmentTag` no schema de segments
- [ ] Resolução automática de `{link_grupo}` na hidratação
- [ ] Overflow automático de grupos
- [ ] Wizard de setup
- [ ] Dashboard mais informativo com guias

### Melhorias sugeridas 📈
- [ ] Notificações push quando chip queima
- [ ] Alertas por email/telegram
- [ ] Relatórios automáticos por período
- [ ] A/B testing de templates
- [ ] Agendamento inteligente (horários melhores)

---

## Resumo do Fluxo Completo

```
1. CONFIGURAR
   ├── Cadastrar chips (1 por segmento recomendado)
   ├── Importar CSV de eleitores
   ├── Criar segmentos com tags
   └── Criar grupos para cada segmento

2. CRIAR CAMPANHA
   ├── Selecionar segmento
   ├── Escrever template com {link_grupo}
   ├── Configurar chip (ou auto)
   └── Agendar ou enviar

3. EXECUÇÃO
   ├── Hidratar fila com voters do segmento
   ├── Resolver {link_grupo} → grupo ativo do segmento
   ├── Router seleciona chip por scoring
   ├── Enviar com delay anti-ban
   └── Atualizar status via webhook

4. MONITORAR
   ├── Dashboard de operações (tempo real)
   ├── Health dos chips
   ├── Capacidade dos grupos
   ├── KPIs de conversão
   └── Fila de mensagens

5. CONVERTER
   ├── Rastrear entregas/leituras
   ├── Rastrear respostas
   ├── Rastrear entradas no grupo
   ├── AI analisa respostas
   └── Auto-tags em leads quentes

6. INTERAGIR
   ├── HITL para conversas que precisam atenção
   ├── Assumir e responder manualmente
   ├── Resolver e marcar como feito
   └── Follow-up automático

7. ESCALAR
   ├── Overflow de grupos (automático)
   ├── Failover de chips (automático)
   ├── Novos chips para demanda
   └── Novos segmentos conforme necessário
```

---

## Próximos Passos

1. **Adicionar `segmentTag` ao schema de segments**
2. **Conectar resolução de `{link_grupo}` na hidratação da fila**
3. **Implementar overflow automático**
4. **Criar wizard de setup**
5. **Melhorar dashboard com guias e tooltips**

Quer que eu implemente alguma dessas partes agora?