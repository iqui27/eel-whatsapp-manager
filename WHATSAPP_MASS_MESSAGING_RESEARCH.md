# WhatsApp Mass Messaging System - Research Document
## 100K Leads Across Multiple Groups via Evolution API v2

**Last Updated:** March 2026
**Scope:** Anti-ban strategy, Evolution API v2 integration, chip rotation, lead tracking, AI analysis

---

## Table of Contents

1. [WhatsApp Anti-Ban Best Practices](#1-whatsapp-anti-ban-best-practices)
2. [Evolution API v2 - Complete Reference](#2-evolution-api-v2---complete-reference)
3. [Chip Rotation Strategy](#3-chip-rotation-strategy)
4. [Lead Conversion Tracking](#4-lead-conversion-tracking)
5. [AI for Lead Analysis (Gemini)](#5-ai-for-lead-analysis-gemini)
6. [Architecture Recommendation](#6-architecture-recommendation)

---

## 1. WhatsApp Anti-Ban Best Practices

### 1.1 Understanding WhatsApp's Detection System

WhatsApp uses a multi-layered detection system:

- **Rate analysis:** Measures messages sent per minute/hour/day
- **Pattern detection:** Identical messages sent to many recipients
- **Recipient behavior:** How many recipients report/block you
- **Account age/reputation:** New accounts get less trust
- **Contact relationship:** Messages to non-contacts are higher risk
- **Session anomalies:** Unusual online/offline patterns, multiple devices

> **Critical fact:** WhatsApp does NOT officially allow bots or unofficial clients on their platform. The Baileys-based approach (used by Evolution API) reverse-engineers WhatsApp Web protocol. This is inherently risky.

### 1.2 Sending Rate Limits - Conservative Numbers

| Scenario | Rate | Notes |
|---|---|---|
| **New number (Day 1-3)** | 5-10 messages/day | Only to existing contacts |
| **New number (Week 1)** | 20-30 messages/day | Gradually add non-contacts |
| **New number (Week 2-3)** | 50-80 messages/day | Mix contacts and non-contacts |
| **Warmed number (1+ months)** | 100-200 messages/day | With message variation |
| **Well-established number (3+ months)** | 200-500 messages/day | Maximum safe ceiling |
| **Per-hour cap** | Max 20-30 messages/hour | Never burst all at once |
| **Delay between messages** | 15-60 seconds minimum | Use random delays (see below) |
| **Daily absolute ceiling** | 500 messages/chip | Even for old numbers |

**For 100K leads across groups:** You need **minimum 20-30 active chips** operating simultaneously, assuming 200-300 msg/day/chip and spreading over 2-3 weeks.

### 1.3 Warm-Up Schedule for New Numbers

```
PHASE 1 (Days 1-3): "Human Seeding"
├── Receive messages first (have a friend/bot message YOU)
├── Reply to those messages naturally
├── Join 2-3 groups, send messages in them
├── Add number to personal contacts list
├── Set profile picture, status, and about
├── Send 5-10 messages ONLY to saved contacts
└── Use the phone for normal WhatsApp activity

PHASE 2 (Days 4-7): "Light Outreach"
├── Send 20-30 messages/day
├── Mix: 60% contacts, 40% non-contacts
├── Reply to responses conversationally
├── Random delay: 30-90 seconds between messages
├── Avoid sending between 00:00-06:00
└── Gradually increase by 5 messages/day

PHASE 3 (Week 2-3): "Ramp Up"
├── 50-100 messages/day
├── Begin group creation (max 1 group/day per chip)
├── Add members to groups (max 50 additions/day)
├── Start with invite links instead of direct adds
├── Monitor for warnings/temporary bans
└── If temporary ban occurs: STOP for 48-72 hours

PHASE 4 (Week 4+): "Cruising"
├── 150-300 messages/day (based on feedback)
├── Full message variation active
├── Group management at scale
├── Continue monitoring block/report rate
└── If block rate > 2-3%: reduce volume immediately
```

### 1.4 Message Variation Techniques

**Never send the same message twice.** WhatsApp hashes message content and flags identical copies.

#### Strategy 1: Template with Spinning

```javascript
const templates = [
  "Oi {name}! {greeting} Temos {offer} para você. {cta}",
  "{greeting} {name}! {offer} disponível agora. {cta}",
  "E aí {name}, {greeting}! Olha só: {offer}. {cta}",
];

const spins = {
  greeting: ["tudo bem?", "como vai?", "tudo certo?", "beleza?", "tudo joia?"],
  offer: [
    "uma oportunidade incrível",
    "algo especial",
    "uma novidade que vai te interessar",
    "uma proposta imperdível",
  ],
  cta: [
    "Quer saber mais?",
    "Posso te contar?",
    "Te interessou?",
    "Vamos conversar?",
    "Posso explicar melhor?",
  ],
};
```

#### Strategy 2: Character-Level Variation (anti-hash)

```javascript
function addInvisibleVariation(text) {
  // Insert zero-width characters at random positions
  const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
  let result = '';
  for (const char of text) {
    result += char;
    if (Math.random() < 0.1) {
      result += zwChars[Math.floor(Math.random() * zwChars.length)];
    }
  }
  return result;
}
```

> **Warning:** Zero-width character injection is becoming detectable. Prefer natural language variation instead.

#### Strategy 3: Structural Variation

- Randomize paragraph order where possible
- Add/remove greetings, closings, emojis
- Vary use of bold, italic, formatting
- Include/exclude the link in different messages
- Alternate between text-only and text+image

### 1.5 Best Sending Time Windows (Brazil/LATAM)

| Priority | Window | Rationale |
|---|---|---|
| **Best** | 09:00-11:30 | Morning engagement, people checking phones |
| **Good** | 14:00-17:00 | Afternoon, after lunch |
| **Acceptable** | 18:00-21:00 | Evening, higher response but more reports |
| **Avoid** | 00:00-07:00 | Suspicious activity, very high ban risk |
| **Avoid** | 22:00-23:59 | Late sends look spammy |

**Distribution strategy:**
```
Daily sending window: 09:00-20:00 (11 hours)
Target: 200 messages per chip
Average: ~18 messages/hour
Actual: Random distribution, heavier in morning
```

### 1.6 Signs of Impending Ban & Early Detection

| Signal | Severity | Action |
|---|---|---|
| Messages stuck on single checkmark (✓) for 5+ minutes | **Medium** | Slow down, check connection |
| `CONNECTION_UPDATE` webhook returns `close` | **High** | Stop sending, check instance |
| Message delivery rate drops below 80% | **High** | Stop chip, switch to backup |
| Getting `408` or `500` errors from Evolution API | **Medium** | Wait 5 min, retry |
| "This account is not allowed" error | **Critical** | Number is banned |
| `status: 'close'` in connectionState | **High** | Attempt reconnect, if fail = banned |
| Temporary ban message (24h/48h/72h) | **Critical** | Stop entirely, wait FULL duration + 24h |
| Phone receives security code SMS | **Warning** | Session may be revoked |
| QR code keeps re-requesting | **High** | Session invalidated |

**Health Check Implementation:**

```javascript
// Poll every 30 seconds per instance
async function checkChipHealth(instanceName) {
  const res = await fetch(
    `${BASE_URL}/instance/connectionState/${instanceName}`,
    { headers: { apikey: API_KEY } }
  );
  const data = await res.json();

  return {
    instance: instanceName,
    state: data.instance?.state, // 'open' | 'close' | 'connecting'
    healthy: data.instance?.state === 'open',
    timestamp: Date.now(),
  };
}
```

### 1.7 Recovery Strategies When Banned

| Type | Duration | Recovery |
|---|---|---|
| **Temporary ban** | 24-72 hours | Wait full duration + 24h buffer, then resume at 50% volume |
| **Permanent ban** | Indefinite | Number is lost. Appeal via app (rarely works) |
| **Account restriction** | Varies | Can still receive messages, can't send. Wait it out. |

**Pre-ban checklist:**
- Immediately stop all outbound messages on that chip
- Mark chip as `quarantined` in your system
- Re-route its message queue to the next healthy chip
- Don't disconnect the instance (stay connected to gather info)
- After cooldown, restart with 25% of previous volume

**Number recovery tips:**
- Use a real phone with the SIM for a few days after temp ban
- Send ONLY to contacts who message you first
- Do NOT immediately reconnect to Evolution API
- Re-warm for 1 week before API reconnection

### 1.8 Personal WhatsApp vs WhatsApp Business API

| Feature | Personal (Baileys) | Official Business API (Cloud API) |
|---|---|---|
| **Cost** | Free (just SIM) | Per-conversation pricing (~$0.03-0.08/convo) |
| **Ban risk** | HIGH | Very LOW (Meta-approved) |
| **Rate limit** | Unofficial ~200-500/day | 80 msg/sec (official) |
| **Template messages** | Not required | Required for first outreach |
| **Approval needed** | No | Yes (Meta Business verification) |
| **Groups support** | Full | No group management via Cloud API |
| **Group creation** | Yes | No |
| **Group invite links** | Yes | No |
| **Read receipts** | Via webhook | Via webhook |
| **Best for** | Group-based funnels, guerrilla marketing | Transactional, large-scale 1:1 messaging |

**Recommendation for this use case:** Since the strategy involves creating **groups** and adding members via invite links, the **Baileys-based approach** (personal WhatsApp through Evolution API) is the only viable option. The official Business API does not support group operations.

---

## 2. Evolution API v2 - Complete Reference

### 2.1 Base Configuration

- **API Version:** 2.1.1
- **Base URL:** `https://{your-server}/`
- **Auth:** API Key header (`apikey: YOUR_KEY`)
- **Engine options:** `WHATSAPP-BAILEYS` (unofficial) or `WHATSAPP-BUSINESS` (official Cloud API)

### 2.2 Instance Management

#### Create Instance

```bash
POST /instance/create
```

```json
{
  "instanceName": "chip-01",
  "token": "my-custom-apikey-123",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS",
  "rejectCall": true,
  "msgCall": "Não posso atender agora.",
  "groupsIgnore": false,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false,
  "proxyHost": "proxy.example.com",
  "proxyPort": "8080",
  "proxyProtocol": "http",
  "proxyUsername": "user",
  "proxyPassword": "pass",
  "webhook": {
    "url": "https://your-server.com/webhook/chip-01",
    "byEvents": true,
    "base64": false,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE",
      "GROUPS_UPSERT",
      "GROUP_PARTICIPANTS_UPDATE"
    ]
  }
}
```

**Response (201):**
```json
{
  "instance": {
    "instanceName": "chip-01",
    "instanceId": "af6c5b7c-ee27-4f94-9ea8-192393746ddd",
    "status": "created"
  },
  "hash": {
    "apikey": "my-custom-apikey-123"
  }
}
```

**Key settings:**
- `alwaysOnline: false` — Set to false! Always online is a red flag for detection.
- `readMessages: false` — Don't auto-read, let the system decide when to mark as read.
- `proxyHost/proxyPort` — **Essential for multi-chip.** Each chip should use a different proxy/IP.

#### Check Connection State (Reliable Health Check)

```bash
GET /instance/connectionState/{instanceName}
```

**Response:**
```json
{
  "instance": {
    "instanceName": "chip-01",
    "state": "open"   // "open" | "close" | "connecting"
  }
}
```

**Reliability note:** This endpoint can sometimes return stale data. For reliable monitoring, combine with:

1. **Webhook `CONNECTION_UPDATE` events** — These are real-time push notifications:
```json
// Webhook payload for CONNECTION_UPDATE
{
  "event": "CONNECTION_UPDATE",
  "instance": "chip-01",
  "data": {
    "state": "open",     // or "close"
    "statusReason": 200  // or 401 (logged out), 408 (timeout), 515 (restart needed)
  }
}
```

2. **Fetch Instances endpoint** — More complete info:
```bash
GET /instance/fetchInstances?instanceName=chip-01
```

**Response:**
```json
[{
  "instance": {
    "instanceName": "chip-01",
    "instanceId": "af6c5b7c-...",
    "owner": "5531982968XX@s.whatsapp.net",
    "profileName": "Business Name",
    "status": "open",
    "apikey": "my-custom-apikey-123",
    "integration": {
      "integration": "WHATSAPP-BAILEYS"
    }
  }
}]
```

3. **Heartbeat pattern** (recommended):
```javascript
// Every 30s, poll connectionState + track last webhook event time
async function reliableHealthCheck(instanceName) {
  const [stateRes, lastWebhook] = await Promise.all([
    fetch(`${BASE}/instance/connectionState/${instanceName}`, { headers }),
    getLastWebhookTimestamp(instanceName), // from your DB
  ]);

  const state = (await stateRes.json()).instance?.state;
  const webhookStale = Date.now() - lastWebhook > 120_000; // 2 min

  if (state === 'open' && !webhookStale) return 'healthy';
  if (state === 'open' && webhookStale) return 'degraded'; // connected but no events
  if (state === 'connecting') return 'reconnecting';
  return 'disconnected';
}
```

#### Restart Instance

```bash
PUT /instance/restart/{instanceName}
```

#### Connect Instance (QR Code)

```bash
GET /instance/connect/{instanceName}
```

Returns QR code for scanning.

#### Logout / Delete Instance

```bash
DELETE /instance/logout/{instanceName}
DELETE /instance/delete/{instanceName}
```

### 2.3 Sending Messages

#### Send Text Message

```bash
POST /message/sendText/{instanceName}
```

```json
{
  "number": "5511999999999",
  "text": "Olá! Tudo bem? Tenho uma oportunidade para você.",
  "delay": 3000,
  "linkPreview": true
}
```

**Key parameters:**
- `number`: Full number with country code (e.g., `5511999999999`)
- `delay`: **Presence simulation in milliseconds.** Sends "typing..." status for this duration before the message. Use 2000-5000ms for realism.
- `linkPreview`: Show URL previews. Set `true` for messages with links.
- `mentionsEveryOne`: Use in groups to @everyone.
- `mentioned`: Array of specific JIDs to mention.

**Response (201):**
```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE594145F4C59B4"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá! Tudo bem? Tenho uma oportunidade para você."
    }
  },
  "messageTimestamp": "1717689097",
  "status": "PENDING"
}
```

#### Send Media Message (Image/Video/Document)

```bash
POST /message/sendMedia/{instanceName}
```

```json
{
  "number": "5511999999999",
  "mediatype": "image",
  "mimetype": "image/png",
  "caption": "Confira nossa proposta especial!",
  "media": "https://example.com/image.png",
  "fileName": "proposta.png",
  "delay": 3000
}
```

#### Send to Group

Use the group JID instead of a phone number:

```json
{
  "number": "120363295648424210@g.us",
  "text": "Mensagem para o grupo todo!"
}
```

### 2.4 Group Management

#### Create Group

```bash
POST /group/create/{instanceName}
```

```json
{
  "subject": "🔥 Oportunidade Exclusiva - Turma 47",
  "description": "Grupo exclusivo para membros interessados em...",
  "participants": [
    "5511999999999",
    "5511888888888"
  ]
}
```

**Limits:**
- Max group size: **1024 members** (WhatsApp limit)
- Creating too many groups quickly (>2-3/day) triggers detection
- Add initial participants carefully (max 5-10 at creation)

#### Add/Remove/Promote/Demote Members

```bash
POST /group/updateParticipant/{instanceName}?groupJid=120363295648424210@g.us
```

```json
{
  "action": "add",
  "participants": ["5511999999999", "5511888888888"]
}
```

**Actions:**
- `add` — Add members to group
- `remove` — Remove members from group
- `promote` — Make member an admin
- `demote` — Remove admin rights

**Adding admins specifically:**
```json
{
  "action": "promote",
  "participants": ["5511999999999"]
}
```

**Rate limit for adding members:**
- Max ~20-30 members per add operation
- Wait 30-60 seconds between batches
- Max ~50-100 new members per group per day
- If adding many, use invite links instead

#### Fetch Group Invite Code

```bash
GET /group/inviteCode/{instanceName}?groupJid=120363295648424210@g.us
```

**Response:**
```json
{
  "inviteUrl": "https://chat.whatsapp.com/DgQvyfXzY01B6rGrpZpYze",
  "inviteCode": "DgQvyfXzY01B6rGrpZpYze"
}
```

#### Monitor If Group Is Full

```bash
GET /group/fetchAllGroups/{instanceName}?getParticipants=true
```

**Response includes `size` field:**
```json
[{
  "id": "120363295648424210@g.us",
  "subject": "Oportunidade Exclusiva - Turma 47",
  "size": 847,
  "creation": 1714769954,
  "owner": "553198296801@s.whatsapp.net",
  "restrict": false,
  "announce": false
}]
```

**Check specific group member count:**
```bash
GET /group/participants/{instanceName}?groupJid=120363295648424210@g.us
```

```json
{
  "participants": [
    { "id": "553198296801@s.whatsapp.net", "admin": "superadmin" },
    { "id": "5511999999999@s.whatsapp.net", "admin": null }
  ]
}
```

**Group fullness monitoring logic:**
```javascript
async function checkGroupCapacity(instanceName, groupJid) {
  const res = await fetch(
    `${BASE}/group/participants/${instanceName}?groupJid=${groupJid}`,
    { headers }
  );
  const data = await res.json();
  const count = data.participants?.length || 0;
  const MAX = 1024;

  return {
    groupJid,
    currentSize: count,
    maxSize: MAX,
    available: MAX - count,
    isFull: count >= MAX,
    nearFull: count >= MAX * 0.9, // 90%+ = near full
  };
}
```

#### Fetch All Groups

```bash
GET /group/fetchAllGroups/{instanceName}?getParticipants=false
```

Returns array of all groups the instance is a member of, with `size` field for quick capacity check without fetching every participant.

#### Revoke Invite Code

```bash
PUT /group/revokeInviteCode/{instanceName}?groupJid=120363295648424210@g.us
```

Useful when a group reaches capacity — revoke the link so no more joins via old links.

### 2.5 Webhook Events for Delivery Tracking

Configure webhook with these events for full delivery tracking:

```json
{
  "url": "https://your-server.com/webhook",
  "webhook_by_events": true,
  "events": [
    "SEND_MESSAGE",
    "MESSAGES_UPDATE",
    "MESSAGES_UPSERT",
    "CONNECTION_UPDATE",
    "GROUPS_UPSERT",
    "GROUP_PARTICIPANTS_UPDATE"
  ]
}
```

#### Key Events and Their Data

**`SEND_MESSAGE`** — Fires when YOUR message is sent:
```json
{
  "event": "SEND_MESSAGE",
  "instance": "chip-01",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": true,
      "id": "BAE594145F4C59B4"
    },
    "status": "PENDING",
    "messageTimestamp": "1717689097"
  }
}
```

**`MESSAGES_UPDATE`** — Fires when message status changes (delivery, read):
```json
{
  "event": "MESSAGES_UPDATE",
  "instance": "chip-01",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": true,
      "id": "BAE594145F4C59B4"
    },
    "update": {
      "status": 3  // 0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED
    }
  }
}
```

**Message status codes:**
| Code | Meaning | WhatsApp Visual |
|---|---|---|
| 0 | ERROR | ❌ |
| 1 | PENDING | 🕐 (clock) |
| 2 | SERVER_ACK | ✓ (single grey check) |
| 3 | DELIVERY_ACK | ✓✓ (double grey check) |
| 4 | READ | ✓✓ (double blue check) |
| 5 | PLAYED | ✓✓ (for audio/video) |

**`MESSAGES_UPSERT`** — Fires when you RECEIVE a message (lead replied):
```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "chip-01",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "AABBCC112233"
    },
    "message": {
      "conversation": "Sim, tenho interesse!"
    },
    "messageTimestamp": "1717689200"
  }
}
```

**`GROUP_PARTICIPANTS_UPDATE`** — Fires when members join/leave groups:
```json
{
  "event": "GROUP_PARTICIPANTS_UPDATE",
  "instance": "chip-01",
  "data": {
    "id": "120363295648424210@g.us",
    "participants": ["5511999999999@s.whatsapp.net"],
    "action": "add"   // "add" | "remove" | "promote" | "demote"
  }
}
```

### 2.6 Rate Limiting and Connection Stability

**Evolution API itself does not impose rate limits** — it passes messages directly to WhatsApp. The limits come from WhatsApp's detection.

**Connection stability tips:**
- Use Redis for session persistence (`CACHE_REDIS_ENABLED=true`)
- Set `CACHE_REDIS_URI` and `CACHE_REDIS_PREFIX_KEY`
- Use PostgreSQL for data persistence (not SQLite for production)
- Use proxy per instance to prevent IP-based blocking
- Set `DEL_INSTANCE=false` in env to keep instances on restart
- Use `syncFullHistory: false` on create to reduce initial load

---

## 3. Chip Rotation Strategy

### 3.1 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   MESSAGE QUEUE                       │
│              (Redis/RabbitMQ/SQS)                     │
│                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Lead 1  │ │ Lead 2  │ │ Lead 3  │ │ Lead N  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼───────────┼───────────┼───────────┼──────────┘
        │           │           │           │
   ┌────▼───────────▼───────────▼───────────▼────┐
   │              CHIP ROUTER                      │
   │    (Selects healthiest available chip)         │
   └──┬──────┬──────┬──────┬──────┬──────┬────────┘
      │      │      │      │      │      │
   ┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐
   │Chip1││Chip2││Chip3││Chip4││Chip5││ChipN│
   │ 🟢  ││ 🟢  ││ 🔴  ││ 🟢  ││ 🟡  ││ 🟢  │
   └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘
   (banned chip is auto-skipped, queue redistributed)
```

### 3.2 Chip States

```typescript
enum ChipStatus {
  HEALTHY = 'healthy',          // 🟢 Fully operational
  DEGRADED = 'degraded',        // 🟡 Connected but slow/warnings
  COOLDOWN = 'cooldown',        // 🟠 Daily limit reached, resting
  QUARANTINED = 'quarantined',  // 🔴 Temp ban, waiting to recover
  BANNED = 'banned',            // ⛔ Permanently banned
  WARMING_UP = 'warming_up',    // 🔵 New number in warm-up phase
  DISCONNECTED = 'disconnected' // ⚫ No connection / needs QR scan
}

interface ChipState {
  instanceName: string;
  phone: string;
  status: ChipStatus;
  messagesSentToday: number;
  messagesSentThisHour: number;
  dailyLimit: number;             // Based on warm-up phase
  hourlyLimit: number;
  lastMessageAt: Date | null;
  lastHealthCheck: Date;
  bannedAt: Date | null;
  cooldownUntil: Date | null;
  assignedSegments: string[];     // Lead segments this chip handles
  errorCount: number;
  blockRate: number;              // % of recipients who blocked
  proxy: string;
}
```

### 3.3 Automatic Chip Rotation Logic

```typescript
class ChipRouter {
  private chips: Map<string, ChipState>;
  private queue: MessageQueue;

  /**
   * Select the best chip to send a message.
   * Priority: healthy > least-used today > matching segment > random
   */
  selectChip(leadSegment: string): ChipState | null {
    const candidates = Array.from(this.chips.values())
      .filter(c => c.status === 'healthy' || c.status === 'degraded')
      .filter(c => c.messagesSentToday < c.dailyLimit)
      .filter(c => c.messagesSentThisHour < c.hourlyLimit)
      .filter(c => {
        // Enforce minimum delay between messages
        if (!c.lastMessageAt) return true;
        const elapsed = Date.now() - c.lastMessageAt.getTime();
        return elapsed > 15_000; // 15s minimum gap
      });

    if (candidates.length === 0) return null;

    // Prefer chips assigned to this segment
    const segmentMatch = candidates.filter(
      c => c.assignedSegments.includes(leadSegment)
    );

    const pool = segmentMatch.length > 0 ? segmentMatch : candidates;

    // Pick the one with fewest messages sent today (load balance)
    pool.sort((a, b) => a.messagesSentToday - b.messagesSentToday);

    // Add randomness to avoid patterns
    const topN = pool.slice(0, Math.min(3, pool.length));
    return topN[Math.floor(Math.random() * topN.length)];
  }

  /**
   * Handle chip failure: re-queue messages and quarantine chip
   */
  async handleChipFailure(instanceName: string, reason: string) {
    const chip = this.chips.get(instanceName);
    if (!chip) return;

    chip.status = ChipStatus.QUARANTINED;
    chip.bannedAt = new Date();
    chip.cooldownUntil = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    // Re-queue all pending messages from this chip
    const pendingMessages = await this.queue.getMessagesByChip(instanceName);
    for (const msg of pendingMessages) {
      msg.assignedChip = null; // Un-assign so router picks a new chip
      await this.queue.requeue(msg);
    }

    // Alert operations team
    await this.notify(`Chip ${instanceName} quarantined: ${reason}`);
  }
}
```

### 3.4 Assigning Chips to Lead Segments

**Strategy: Segment affinity with fallback**

```
Segment "Premium"    → Chips 1, 2 (primary), any chip (fallback)
Segment "Standard"   → Chips 3, 4, 5 (primary), any chip (fallback)
Segment "Cold"       → Chips 6, 7, 8 (primary), any chip (fallback)
Segment "Re-engage"  → Chips 9, 10 (primary), any chip (fallback)
```

**Why segment affinity matters:**
- Different segments have different block rates
- Cold leads block more → dedicate "expendable" chips
- Premium/warm leads block less → protect your best chips
- If a "cold" chip gets banned, premium chips are unaffected

### 3.5 Health Monitoring System

```typescript
class ChipHealthMonitor {
  private CHECK_INTERVAL = 30_000; // 30 seconds

  async monitorAll() {
    for (const [name, chip] of this.chips) {
      const health = await this.checkHealth(name);

      // Update state based on health check
      if (health.state === 'close') {
        // Try restart first
        await this.restartInstance(name);
        await this.delay(5000);
        const recheck = await this.checkHealth(name);

        if (recheck.state !== 'open') {
          await this.handleChipFailure(name, 'Disconnected after restart');
        }
      }

      // Check daily limits
      if (chip.messagesSentToday >= chip.dailyLimit) {
        chip.status = ChipStatus.COOLDOWN;
        chip.cooldownUntil = this.getNextDayStart();
      }

      // Check block rate
      if (chip.blockRate > 0.03) { // 3% block rate
        chip.dailyLimit = Math.floor(chip.dailyLimit * 0.5); // Halve the limit
        await this.notify(`Chip ${name} block rate ${chip.blockRate}% - reducing volume`);
      }
    }
  }

  private async checkHealth(instanceName: string) {
    const res = await fetch(
      `${BASE}/instance/connectionState/${instanceName}`,
      { headers: { apikey: API_KEY } }
    );
    return (await res.json()).instance;
  }

  private async restartInstance(instanceName: string) {
    await fetch(
      `${BASE}/instance/restart/${instanceName}`,
      { method: 'PUT', headers: { apikey: API_KEY } }
    );
  }
}
```

### 3.6 Graceful Failover Without Message Loss

**Message lifecycle:**

```
1. Lead enters queue → status: QUEUED
2. Chip selected     → status: ASSIGNED (chipId saved)
3. API call made     → status: SENDING
4. 201 response      → status: SENT (messageId saved)
5. MESSAGES_UPDATE   → status: DELIVERED / READ / FAILED
```

**Failover rules:**
- If status is `QUEUED` or `ASSIGNED`: Simply re-route to another chip
- If status is `SENDING` and no response in 30s: Mark as `RETRY`, re-queue
- If status is `SENT` but no delivery webhook in 5 min: Don't re-send (might be delivered, webhook missed)
- Max retry per message: 3 attempts across different chips
- After 3 failures: Mark as `UNDELIVERABLE`, move to dead letter queue

```typescript
interface QueuedMessage {
  id: string;
  leadPhone: string;
  leadSegment: string;
  text: string;
  assignedChip: string | null;
  status: 'queued' | 'assigned' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'retry';
  retryCount: number;
  maxRetries: 3;
  evolutionMessageId: string | null;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
}
```

---

## 4. Lead Conversion Tracking

### 4.1 Key Metrics for WhatsApp Campaigns

| Metric | How to Track | Target |
|---|---|---|
| **Sent** | `SEND_MESSAGE` webhook or API 201 response | 100% of queue |
| **Delivered** | `MESSAGES_UPDATE` with status=3 | >90% |
| **Read** | `MESSAGES_UPDATE` with status=4 | >40% |
| **Replied** | `MESSAGES_UPSERT` from the lead's number | >5-15% |
| **Link Clicked** | UTM params + redirect tracker | >3-8% |
| **Group Joined** | `GROUP_PARTICIPANTS_UPDATE` action=add | Varies |
| **Converted** | CRM webhook / manual tag | >1-3% |
| **Blocked** | Detection via failed delivery on follow-up | <3% |
| **Reported** | Cannot directly detect; inferred from bans | <0.5% |

### 4.2 Funnel Visualization

```
100,000 leads imported
    │
    ├── 95,000 messages sent (95% — some numbers invalid)
    │       │
    │       ├── 85,500 delivered (90% of sent)
    │       │       │
    │       │       ├── 42,750 read (50% of delivered)
    │       │       │       │
    │       │       │       ├── 6,412 replied (15% of read)
    │       │       │       │       │
    │       │       │       │       ├── 2,137 clicked link (5% of read)
    │       │       │       │       │       │
    │       │       │       │       │       ├── 1,068 joined group (2.5% of read)
    │       │       │       │       │       │       │
    │       │       │       │       │       │       └── 427 converted (1% of read)
    │       │       │       │       │       │
    │       │       │       │
    │       │       │       └── 36,338 read but no reply (silent readers)
    │       │       │
    │       │       └── 42,750 not read (inbox but ignored)
    │       │
    │       └── 9,500 not delivered (offline, number invalid, blocked)
    │
    └── 5,000 invalid numbers (not on WhatsApp)
```

### 4.3 Tracking Group Joins from Campaigns

**Strategy: Unique invite links per campaign/segment**

```javascript
// Create a unique group per campaign batch
async function createCampaignGroup(instanceName, campaignId, batchNumber) {
  const res = await fetch(`${BASE}/group/create/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      subject: `Grupo VIP - Turma ${batchNumber}`,
      description: `Grupo exclusivo - Campanha ${campaignId}`,
      participants: [] // Empty, will use invite link
    })
  });

  const group = await res.json();
  const groupJid = group.id; // e.g., "120363295648424210@g.us"

  // Get invite link
  const inviteRes = await fetch(
    `${BASE}/group/inviteCode/${instanceName}?groupJid=${groupJid}`,
    { headers }
  );
  const invite = await inviteRes.json();

  return {
    groupJid,
    inviteUrl: invite.inviteUrl,
    inviteCode: invite.inviteCode,
    campaignId,
    batchNumber,
  };
}
```

**Track joins via webhook:**
```javascript
// In your webhook handler for GROUP_PARTICIPANTS_UPDATE
app.post('/webhook/group-participants-update', (req, res) => {
  const { data } = req.body;

  if (data.action === 'add') {
    for (const participant of data.participants) {
      const phone = participant.replace('@s.whatsapp.net', '');

      // Look up which campaign sent this lead the invite link
      const campaign = db.findCampaignByGroupAndLead(data.id, phone);

      if (campaign) {
        db.updateLeadFunnel(phone, {
          joinedGroup: true,
          joinedGroupAt: new Date(),
          campaignId: campaign.id,
          groupJid: data.id,
        });
      }
    }
  }

  res.sendStatus(200);
});
```

### 4.4 A/B Testing Message Variants

```typescript
interface ABTest {
  id: string;
  name: string;
  variants: {
    id: string;       // "A" | "B" | "C"
    text: string;
    weight: number;   // 0.33 each for 3 variants
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    clicked: number;
    groupJoined: number;
    converted: number;
  }[];
  startedAt: Date;
  status: 'running' | 'completed';
  winnerVariant: string | null;
}

// Assignment logic
function assignVariant(test: ABTest, leadId: string): string {
  // Deterministic assignment based on lead ID (reproducible)
  const hash = hashCode(leadId + test.id);
  let cumWeight = 0;
  const rand = (hash % 1000) / 1000;

  for (const variant of test.variants) {
    cumWeight += variant.weight;
    if (rand <= cumWeight) return variant.id;
  }
  return test.variants[0].id;
}

// Statistical significance check
function isSignificant(variantA: Variant, variantB: Variant): boolean {
  // Minimum sample: 1000 per variant for reliable results
  if (variantA.sent < 1000 || variantB.sent < 1000) return false;

  const rateA = variantA.replied / variantA.delivered;
  const rateB = variantB.replied / variantB.delivered;

  // Simple Z-test for proportions
  const pooledRate = (variantA.replied + variantB.replied) /
                     (variantA.delivered + variantB.delivered);
  const se = Math.sqrt(pooledRate * (1 - pooledRate) *
             (1/variantA.delivered + 1/variantB.delivered));
  const z = Math.abs(rateA - rateB) / se;

  return z > 1.96; // 95% confidence
}
```

### 4.5 Link Click Tracking

Use short URL redirects with UTM parameters:

```
https://your-tracker.com/r/{unique-lead-code}
  → redirects to → https://final-destination.com/?utm_source=whatsapp&utm_campaign={campaign}&utm_content={variant}
```

Or use a URL shortener service that provides click analytics per unique link.

---

## 5. AI for Lead Analysis (Gemini)

### 5.1 Gemini API Overview for This Use Case

**Recommended models:**

| Task | Model | Cost (approx.) | Speed |
|---|---|---|---|
| Message classification | `gemini-2.0-flash` | $0.10/1M input tokens | Very fast |
| Sentiment analysis | `gemini-2.0-flash` | $0.10/1M input tokens | Very fast |
| Lead profiling (complex) | `gemini-2.0-pro` | $1.25/1M input tokens | Moderate |
| Batch processing | `gemini-2.0-flash` | $0.025/1M (batch, 50% discount) | Slow (24h) |

**Pricing estimate for 100K leads:**
- Average response: 50 tokens
- Average prompt (with context): 200 tokens
- Total per analysis: ~250 tokens
- 100K analyses: 25M tokens
- **Cost with Flash:** ~$2.50 (real-time) or ~$0.63 (batch)

### 5.2 Sentiment Analysis on Responses

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeLeadResponse(leadPhone, conversation) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analyze this WhatsApp conversation with a lead and return JSON:

Conversation:
${conversation.map(m => `${m.from === 'bot' ? 'Agent' : 'Lead'}: ${m.text}`).join('\n')}

Return ONLY valid JSON:
{
  "sentiment": "positive" | "negative" | "neutral" | "interested" | "skeptical",
  "interest_level": 1-10,
  "intent": "buy" | "question" | "objection" | "not_interested" | "spam" | "unknown",
  "tags": ["tag1", "tag2"],
  "suggested_action": "follow_up" | "send_offer" | "add_to_group" | "remove" | "escalate_human",
  "summary": "One line summary of lead's state"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}
```

### 5.3 Auto-Tagging Based on Content

```javascript
async function autoTagLead(leadPhone, messages) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Based on this person's WhatsApp messages, assign relevant tags.

Messages:
${messages.map(m => m.text).join('\n---\n')}

Available tags: [
  "price_sensitive", "decision_maker", "needs_more_info",
  "ready_to_buy", "competitor_mention", "budget_concern",
  "time_constraint", "high_value", "tire_kicker",
  "influencer", "referral_potential", "technical_question",
  "emotional_buyer", "logical_buyer", "needs_social_proof"
]

Return JSON: { "tags": [...], "confidence": 0.0-1.0, "reasoning": "..." }`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}
```

### 5.4 Cost-Effective Batch Processing vs Real-Time

#### Real-Time Analysis (recommended for replies)

Use when a lead replies — analyze immediately to decide next action:

```javascript
// Triggered by MESSAGES_UPSERT webhook
async function onLeadReply(leadPhone, message) {
  const conversation = await db.getConversation(leadPhone);
  conversation.push({ from: 'lead', text: message });

  // Real-time analysis with Flash (fast, cheap)
  const analysis = await analyzeLeadResponse(leadPhone, conversation);

  // Take action based on analysis
  switch (analysis.suggested_action) {
    case 'send_offer':
      await queueMessage(leadPhone, templates.offer);
      break;
    case 'add_to_group':
      await queueGroupInvite(leadPhone);
      break;
    case 'escalate_human':
      await notifyHumanAgent(leadPhone, analysis.summary);
      break;
    case 'remove':
      await db.markLeadAsUninterested(leadPhone);
      break;
  }

  await db.updateLeadTags(leadPhone, analysis.tags);
  await db.updateLeadSentiment(leadPhone, analysis.sentiment);
}
```

#### Batch Processing (recommended for bulk profiling)

Use for nightly analysis of all leads that didn't respond:

```javascript
// Run nightly at 02:00
async function batchProfileLeads() {
  const unanalyzedLeads = await db.getLeadsWithoutProfile();

  // Gemini batch API — submit all at once, results within 24h
  // 50% cost discount on batch
  const batchRequests = unanalyzedLeads.map(lead => ({
    customId: lead.phone,
    model: "gemini-2.0-flash",
    contents: [{
      parts: [{
        text: `Profile this lead based on their data:
          Phone: ${lead.phone}
          Source: ${lead.source}
          Messages sent: ${lead.messagesSent}
          Messages read: ${lead.messagesRead}
          Replies: ${lead.replies.length}
          Reply texts: ${lead.replies.map(r => r.text).join(' | ')}
          Groups joined: ${lead.groupsJoined}

          Return JSON: {
            "score": 1-100,
            "tier": "hot" | "warm" | "cold" | "dead",
            "next_action": "...",
            "best_time_to_contact": "morning" | "afternoon" | "evening"
          }`
      }]
    }]
  }));

  // Submit batch (process asynchronously)
  // Note: Actual Gemini batch API may differ; check latest docs
  for (const batch of chunk(batchRequests, 100)) {
    await submitBatch(batch);
  }
}
```

### 5.5 Lead Scoring Model

```javascript
function calculateLeadScore(lead) {
  let score = 0;

  // Engagement signals
  if (lead.messageDelivered) score += 5;
  if (lead.messageRead) score += 10;
  if (lead.replied) score += 25;
  if (lead.clickedLink) score += 20;
  if (lead.joinedGroup) score += 30;
  if (lead.repliedMultiple) score += 15;

  // AI-derived signals
  if (lead.sentiment === 'positive') score += 15;
  if (lead.sentiment === 'interested') score += 20;
  if (lead.tags.includes('ready_to_buy')) score += 25;
  if (lead.tags.includes('decision_maker')) score += 15;
  if (lead.tags.includes('high_value')) score += 20;

  // Negative signals
  if (lead.blocked) score -= 100;
  if (lead.sentiment === 'negative') score -= 20;
  if (lead.tags.includes('tire_kicker')) score -= 15;
  if (!lead.messageRead && lead.daysSinceSent > 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}
```

---

## 6. Architecture Recommendation

### 6.1 Capacity Planning for 100K Leads

```
Target: 100,000 leads
Strategy: Send invite links to join groups

Assumptions:
  - Max 300 messages/chip/day (conservative)
  - Max 1,024 members per group
  - 11 hours sending window per day (09:00-20:00)
  - 25% of leads join groups

Required chips:    100,000 / 300 = ~334 chip-days
With 30 chips:     334 / 30 = ~11 days to send all messages
With 50 chips:     334 / 50 = ~7 days to send all messages
With 20 chips:     334 / 20 = ~17 days

Groups needed:     100,000 * 0.25 / 1,024 = ~25 groups (if 25% join)
                   100,000 * 0.10 / 1,024 = ~10 groups (if 10% join)
```

**Recommended setup:**
- **30-50 chips** (WhatsApp numbers with SIMs)
- **30-50 different proxies/IPs** (one per chip)
- **10-20 warm-up chips** in reserve (rotating in as others get banned)
- **Expect 10-20% chip attrition** (bans) during a 100K campaign

### 6.2 Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│        Dashboard (Next.js / React)                   │
│   Campaign management, funnel viz, A/B results       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                   Backend API                        │
│              (Node.js / NestJS)                       │
│    Campaign engine, chip router, lead management     │
└──┬──────────┬──────────┬──────────┬─────────────────┘
   │          │          │          │
┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌──▼──────────────┐
│Queue│  │  DB   │  │ Cache │  │  Webhook Server  │
│Redis│  │Postgres│  │ Redis │  │   (Express)      │
│/SQS │  │       │  │       │  │                   │
└─────┘  └───────┘  └───────┘  └──────────────────┘
                                        │
                               ┌────────▼────────┐
                               │  Evolution API   │
                               │   (Docker)        │
                               │  30-50 instances  │
                               └──────────────────┘
                                        │
                               ┌────────▼────────┐
                               │   Gemini API     │
                               │  (AI Analysis)    │
                               └──────────────────┘
```

### 6.3 Recommended Daily Workflow

```
06:00  - Health check all chips, restart any disconnected
08:00  - Load day's message queue from DB
09:00  - Begin sending (ramp up slowly)
09:30  - Full sending speed (all chips active)
12:00  - Midday pause (reduce to 50% speed for 1 hour)
13:00  - Resume full speed
17:00  - Begin winding down
19:00  - Reduce to 30% speed
20:00  - Stop all outbound messages
21:00  - Run batch AI analysis on day's responses
22:00  - Generate daily report
23:00  - Process dead-letter queue, update lead scores
00:00  - Reset daily counters for all chips
02:00  - Run batch Gemini profiling on unanalyzed leads
```

### 6.4 Risk Mitigation Summary

| Risk | Mitigation |
|---|---|
| Mass chip bans | 20% reserve chips, warm-up pipeline always running |
| Message queue loss | Redis persistence + PostgreSQL backup for all messages |
| Evolution API downtime | Health checks every 30s, auto-restart, alert system |
| WhatsApp detects pattern | Message variation, random delays, IP diversity |
| Group reaches 1024 limit | Auto-detect via size check, create new group, update invite link |
| Low delivery rate | A/B test messages, adjust sending times, check number validity first |
| Legal/compliance | Opt-in mechanism, easy unsubscribe, respect block signals |

---

## Appendix A: Evolution API v2 Quick Reference

### All Endpoints Used

| Purpose | Method | Endpoint |
|---|---|---|
| Create instance | POST | `/instance/create` |
| Check connection | GET | `/instance/connectionState/{instance}` |
| Fetch all instances | GET | `/instance/fetchInstances` |
| Restart instance | PUT | `/instance/restart/{instance}` |
| Connect (QR) | GET | `/instance/connect/{instance}` |
| Logout | DELETE | `/instance/logout/{instance}` |
| Delete instance | DELETE | `/instance/delete/{instance}` |
| Send text | POST | `/message/sendText/{instance}` |
| Send media | POST | `/message/sendMedia/{instance}` |
| Send audio | POST | `/message/sendAudio/{instance}` |
| Create group | POST | `/group/create/{instance}` |
| Update members | POST | `/group/updateParticipant/{instance}?groupJid=` |
| Get invite code | GET | `/group/inviteCode/{instance}?groupJid=` |
| Revoke invite | PUT | `/group/revokeInviteCode/{instance}?groupJid=` |
| Fetch all groups | GET | `/group/fetchAllGroups/{instance}?getParticipants=` |
| Fetch group members | GET | `/group/participants/{instance}?groupJid=` |
| Find group by JID | GET | `/group/findGroupJid/{instance}?groupJid=` |
| Set webhook | POST | `/webhook/instance` |
| Find webhook | GET | `/webhook/find/{instance}` |

### Auth Header

```
apikey: YOUR_API_KEY
Content-Type: application/json
```

### Number Formats

- Individual: `5511999999999` (country code + number, no +, no spaces)
- Group JID: `120363295648424210@g.us`
- Individual JID: `5511999999999@s.whatsapp.net`

---

## Appendix B: Webhook Event Summary

| Event | Fires When | Use For |
|---|---|---|
| `SEND_MESSAGE` | You send a message | Track sent count |
| `MESSAGES_UPDATE` | Status changes (delivered/read) | Delivery & read tracking |
| `MESSAGES_UPSERT` | You receive a message | Lead replied detection |
| `CONNECTION_UPDATE` | Connection state changes | Health monitoring |
| `GROUPS_UPSERT` | Group created/updated | Group tracking |
| `GROUP_PARTICIPANTS_UPDATE` | Member join/leave/promote/demote | Group join tracking |
| `QRCODE_UPDATED` | QR code changes | Auto-reconnection |

---

## Appendix C: Message Status Codes

| Code | Name | Meaning |
|---|---|---|
| 0 | ERROR | Message failed to send |
| 1 | PENDING | Sent to server, waiting |
| 2 | SERVER_ACK | Server received (✓) |
| 3 | DELIVERY_ACK | Delivered to device (✓✓) |
| 4 | READ | Read by recipient (✓✓ blue) |
| 5 | PLAYED | Audio/video played |
