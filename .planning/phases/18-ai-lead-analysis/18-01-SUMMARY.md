---
phase: 18-ai-lead-analysis
plan: "01"
subsystem: gemini-integration, ai-analysis, auto-tagging
tags: [gemini, ai, sentiment-analysis, lead-profiling, auto-tagging]
dependency_graph:
  requires: [17]
  provides: [gemini-module, ai-analysis, auto-tagging-pipeline]
  affects: [src/lib/gemini.ts, src/lib/ai-analysis.ts, src/db/schema.ts, src/app/api/webhook/route.ts]
tech_stack:
  added: ["@google/generative-ai"]
  patterns: [real-time-analysis, ai-webhook-trigger, auto-tagging]
key_files:
  created:
    - src/lib/gemini.ts
    - src/lib/ai-analysis.ts
    - src/app/api/ai/analyze/route.ts
    - src/app/api/voters/[id]/ai/route.ts
    - drizzle/0009_ai_analysis.sql
  modified:
    - src/db/schema.ts
    - src/app/api/webhook/route.ts
decisions:
  - "Gemini Flash (gemini-2.0-flash) for fast analysis"
  - "AI analysis triggered on every inbound message"
  - "Auto-tagging enabled by default (AI_AUTO_TAG env var)"
  - "ai_analyses table stores analysis history"
  - "voter table gets aiTier, aiSentiment, aiRecommendedAction fields"
metrics:
  duration: "20 min"
  completed: "2026-03-17"
  tasks_completed: 6
  files_changed: 8
---

# Phase 18 Plan 01: Gemini Module + Real-Time Analysis Summary

Integrated Google Gemini AI for real-time lead analysis with sentiment classification, intent detection, and auto-tagging.

## What Was Built

### Task 1: Gemini Module

**File:** `src/lib/gemini.ts`

**Functions:**
- `analyzeMessage()` — sentiment, intent, suggested tags, recommended action
- `profileLead()` — tier (hot/warm/cold/dead), engagement prediction, best contact time
- `quickSentimentCheck()` — fast sentiment only
- `isGeminiConfigured()` — check for API key

**Model:** gemini-2.0-flash

### Task 2: AI Fields in Schema

**voters table additions:**
- `aiTier` — hot | warm | cold | dead
- `aiSentiment` — positive | neutral | negative
- `aiLastAnalyzed` — timestamp
- `aiAnalysisSummary` — text summary
- `aiRecommendedAction` — suggested next step

**New ai_analyses table:**
- voterId, conversationId, voterPhone
- messageType, messageText
- sentiment, intent, suggestedTags, recommendedAction
- confidence, summary

### Task 3: Real-Time Analysis Trigger

**File:** `src/lib/ai-analysis.ts`

- `triggerAnalysis()` — called when inbound message arrives
- `storeAnalysis()` — persist to DB
- `updateVoterAnalysis()` — update voter record
- `applyAutoTags()` — add suggested tags to voter
- `profileVoter()` — full lead profiling
- `getVotersNeedingProfiling()` — find stale profiles

### Task 4: Webhook Integration

**In messages.upsert handler:**
- After storing message, trigger AI analysis
- Store analysis results
- Auto-apply suggested tags (if AI_AUTO_TAG !== 'false')

### Task 5: API Routes

**`/api/ai/analyze` (POST):**
- Analyze message with optional voter context
- Store or return analysis

**`/api/voters/[id]/ai` (GET/POST):**
- Get AI insights for voter
- Re-run profiling

### Task 6: Migration SQL

- `drizzle/0009_ai_analysis.sql`
- Adds columns to voters
- Creates ai_analyses table with indexes

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ Gemini module compiles and exports
- ✅ AI fields added to schema
- ✅ Webhook triggers analysis
- ✅ API routes created
- ✅ Migration SQL created
- ✅ TypeScript compiles cleanly
- ✅ Commit: 1e0983d