# BLACKTOWER™ TIMEKEEPER SUITE — AI Intelligence & Forensic Upgrade

This upgrade evolves the existing **BLACKTOWER™ Field Proof & Timestamp Terminal** into an **AI-Native Temporal Intelligence & Forensic Time Operating System** while preserving all existing timestamp tools, authentication flows, Telegram dispatch, and cyber-industrial aesthetics. It introduces cryptographic SHA-256 proof binding, deterministic security hardening, and four core intelligence capabilities: **Temporal Anomaly Detection**, **AI Geospatial Timeline**, **Multimodal Forensic Proof Verification**, and **Context Switching Detection**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been locked in based on your specifications and clarifications:

- **Confirmed Decision 1 — Server-Side Execution via Supabase Edge Functions Only**: All privileged Gemini analysis endpoints will be implemented strictly as Supabase Edge Functions (`Deno.serve`). No local Express server or duplicate backend API layer will be created. All API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`) remain strictly server-side.
- **Confirmed Decision 2 — Activity Capture for Context Switching**: The system combines automatic event logging of observable application interactions (proof captures, timestamp conversions, time delta calculations, countdowns) with a manual **Session & Focus Block Logger** (`CONTENT`, `ADMIN`, `CLIENT`, `FIELD_OPS`, `RESEARCH`, `SYSTEM`). No false claims of OS-wide monitoring are made.
- **Confirmed Decision 3 — Unified 5-Tab Command Terminal**: The main workspace is organized into a unified command terminal with a compact operational status header and five primary navigation views: **TIME**, **PROOF**, **TIMELINE**, **FORENSICS**, and **INTELLIGENCE**.
- **Confirmed Decision 4 — 4-Layer Data Trust Model & Graceful AI Degradation**: Deterministic mathematics (SHA-256 hashing, Haversine distance, velocity, clock drift, event intervals, context switch frequency) are computed first (Level 2). Gemini interprets structured evidence via strict JSON schemas (Level 3). If Gemini times out or is unavailable, the system never destroys evidence or fabricates a rejection—it marks `AI VERIFICATION: UNAVAILABLE` and falls back to `FINAL VERDICT: REVIEW` while preserving deterministic pass/fail checks (Level 4).

---

## 1. Overview & Core Concept

- **What It Does**: Extends the existing timestamp utilities and camera-based `PhotoProof` workflow with four deterministic-first, AI-interpreted forensic engines:
  1. **Phase 0 Security & Cryptographic Upgrade**: Eliminates hardcoded credentials in `seed-users`, secures administrative seeding, fixes the `has_role` RLS execution permission, replaces `Math.random()` reference generation with `crypto.getRandomValues()`, and replaces the truncated Base64 watermark with a true **Web Crypto API SHA-256** digest over canonical metadata and image bytes.
  2. **Temporal Anomaly Detection (Feature 5)**: Analyzes chronological sequences of `proof_records` to detect client/server clock drift, abnormal gaps, future timestamps, duplicate timestamps, rapid-fire bursts, and out-of-order sequences, paired with Gemini structured risk interpretation.
  3. **AI Geospatial Timeline (Feature 6)**: Transforms GPS-tagged proof records into a chronological movement ledger computing Haversine distance, elapsed duration, and estimated travel speed ($\text{km/h}$) between consecutive checkpoints to flag physically impossible or unusual transit patterns.
  4. **AI Forensic Proof Verification (Feature 7)**: Upgrades `PhotoProof` into a 5-pillar verification system (**Cryptographic Integrity**, **Metadata Integrity**, **Temporal Integrity**, **Geolocation Integrity**, and **Gemini Vision Forensic Signals**) that inspects captured frames for screen-of-screen spoofing, printed photos, or synthetic overlays while explicitly communicating probabilistic limitations.
  5. **Context Switching Detection (Feature 10)**: Tracks observable workspace sessions and tool interactions to compute a deterministic **Context Switching Index** (total switches, switches/hour, average focus block, longest uninterrupted session, fragmentation percentage) with AI operational assessment.
- **Target Audience / Persona**: Field operators, security auditors, and engineering personnel operating under BLACKTOWER™ verification protocols.
- **Key Value**: Turns passive time utilities and isolated photo proofs into a verifiable chain of temporal, geographic, visual, and operational evidence without sacrificing deterministic rigor.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Compact Operational Status Strip (Home Header Summary)**:
   - Immediately below the top bar, a high-density telemetry strip displays 8 real-time operational indicators: **CURRENT TIME**, **ACTIVE SESSION**, **LATEST PROOF**, **TEMPORAL STATUS**, **LOCATION STATUS**, **FORENSIC STATUS**, **CONTEXT SWITCHING**, and **AI INTELLIGENCE**. Clicking any indicator jumps directly to its corresponding module.
2. **TIME View (Existing Utilities + Shared Time Engine)**:
   - Houses all 6 existing precision timestamp tools (`LiveClock`, `TimestampConverter`, `TimeDifference`, `EpochCountdown`, `WorldClocks`, `TimestampFormats`) powered by a consolidated shared time engine to eliminate redundant React timer churn, plus a quick **Active Session Control** bar to start/switch categorized work blocks.
3. **PROOF View (Upgraded Multimodal PhotoProof)**:
   - Displays live UTC time, GPS coordinates with one-click refresh and reverse-geocoded place name, and a cryptographically generated `BT-...` reference ID.
   - Upon capture, computes the canonical **SHA-256** digest, runs client anti-cheat diagnostics (`runAntiCheat`), and dispatches to the backend verification pipeline.
   - Displays the live **5-Pillar Forensic Status Matrix** (`CRYPTOGRAPHIC`, `TEMPORAL`, `GPS`, `DEVICE`, `VISUAL FORENSICS`, and `FINAL VERDICT`) with expandable signal evidence and explicit limitation disclosures.
4. **TIMELINE View (AI Geospatial Timeline)**:
   - Renders a vertical forensic movement chain (`TIME ↓ LOCATION ↓ PROOF ↓ TIME GAP & HAVERSINE TRANSIT ↓ NEXT LOCATION`).
   - Each node displays exact timestamp, local timezone, coordinates, accuracy ($\pm\text{m}$), resolved location name, proof ref, anti-cheat score, and verification badge.
   - Connector segments between events display deterministic distance ($\text{km}$), elapsed minutes, estimated speed ($\text{km/h}$), and AI plausibility classification (`NORMAL`, `REVIEW`, `HIGHLY UNUSUAL`). Includes an optional tactical SVG coordinate vector plot alongside the primary forensic ledger.
5. **FORENSICS View (Temporal Anomaly & Proof Audit Ledger)**:
   - Inspects historical `proof_records` and `forensic_verifications`, allowing operators to verify SHA-256 digests, inspect full multimodal visual forensic breakdowns, and trigger **Temporal Anomaly Detection** across their proof history to surface clock drift, sequence violations, or abnormal capture gaps.
6. **INTELLIGENCE View (Focus & Context Switching Intelligence)**:
   - Allows operators to log or switch active task categories (`CONTENT`, `ADMIN`, `CLIENT`, `FIELD_OPS`, `RESEARCH`) while automatically recording observable tool interactions.
   - Displays the deterministic **Context Switching Index** (`CONTEXT SWITCHES`, `SWITCHES / HOUR`, `AVERAGE FOCUS BLOCK`, `FRAGMENTATION %`, `AI ASSESSMENT`) alongside a chronological session transition tape and on-demand Gemini pattern analysis.

### Visual Identity & Theme

- **Aesthetic Direction**: Preserves the existing **BLACKTOWER™ Cyber-Industrial Forensic Terminal** identity—dark tactical surfaces, high information density, crisp 1px structural borders, and precise operational terminology (`VERIFIED`, `REVIEW`, `ANOMALY`, `TEMPORAL DRIFT`, `LOCATION INTEGRITY`, `VISUAL RISK`, `CONTEXT SWITCH`).
- **Color Palette & Mood**:
  - **Canvas (`--background`)**: Deep tactical obsidian slate `hsl(220 20% 6%)`
  - **Elevated Surfaces (`--card` / `--secondary`)**: `hsl(220 18% 10%)` and `hsl(220 15% 16%)`
  - **Primary Accent (`--primary`)**: High-contrast tactical cyan `hsl(195 100% 50%)` with subtle `.glow-cyan` and `.border-glow` accents
  - **Semantic Verdict Tokens**: Emerald (`VERIFIED` / `PASS` / `NORMAL`), Amber (`REVIEW` / `MODERATE`), and Crimson `hsl(0 72% 51%)` (`REJECTED` / `ANOMALY` / `HIGH RISK`) always paired with explicit text labels and icons.
- **Typography & Hierarchy**:
  - **Display & Section Headers**: `Orbitron` (`font-display`) with wide tracking for terminal headers and status classifications.
  - **Telemetry, Hashes, Coordinates & Timestamps**: `JetBrains Mono` (`font-mono tabular-nums`) ensuring strict vertical alignment across all clocks, SHA-256 digests, and metrics.
  - **Prose & Analytical Summaries**: Clean readable body typography (`font-body`).
- **Interactive Feedback & Motion**:
  - Instant tab switching ($\le 150\text{ms}$), deterministic metrics rendered immediately with zero latency, and clear skeleton/spinner states during user-triggered or capture-triggered Edge Function AI evaluations.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: 4-Layer Separation of Deterministic Math vs. Probabilistic AI**
  - *Chosen Approach*: All arithmetic—SHA-256 digests, Haversine distances, transit speeds ($\text{km/h}$), clock drift seconds, inter-event time gaps, and context switch rates—is calculated deterministically in TypeScript modules first. Gemini receives the pre-computed structured metrics (and image bytes for Feature 7) and returns schema-validated JSON interpretations.
  - *Why*: Prevents LLM arithmetic hallucinations, guarantees cryptographic integrity, and ensures the application remains 100% functional even if AI services are unreachable.
- **Decision 2: Consolidated Shared Time Engine (`useTimeEngine`)**
  - *Chosen Approach*: Replace the 5 separate `setInterval` timers across `LiveClock`, `EpochCountdown`, `PhotoProof`, `WorldClocks`, and `TimestampFormats` with a shared time hook using `requestAnimationFrame` only for active sub-second displays and a single shared 1Hz tick for second-level displays.
  - *Why*: Eliminates redundant React render loops while keeping sub-second precision where visually required.
- **Decision 3: Additive Database Schema & Edge Function Consolidation**
  - *Chosen Approach*: Preserve `profiles`, `user_roles`, and `proof_records` intact. Add a new migration creating `temporal_analyses`, `geospatial_events`, `forensic_verifications`, and `time_sessions` with strict RLS policies, plus fix the `has_role` execution grant for `authenticated` users. Implement Edge Functions that use `@google/genai` (`gemini-3.8-flash`) with `responseSchema` and structured fallback handling.
  - *Why*: Protects existing production data and RLS boundaries while making every AI assessment auditable and linked to source record IDs.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                   BLACKTOWER™ CLIENT TERMINAL (React 18 + TypeScript)                │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Navigation Bar: [BLACKTOWER™] ── [TIME | PROOF | TIMELINE | FORENSICS |    │  │
│  │                                       INTELLIGENCE] ── [User / Sign Out]       │  │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Compact Operational Status Strip (8 Live Telemetry & Verdict Indicators)       │  │
│  └───────┬────────────────┬──────────────────┬──────────────────┬─────────────────┘  │
│          │                │                  │                  │                    │
│          ▼                ▼                  ▼                  ▼                    │
│  ┌──────────────┐ ┌──────────────┐  ┌────────────────┐ ┌──────────────────────────┐  │
│  │  TIME VIEW   │ │  PROOF VIEW  │  │ TIMELINE VIEW  │ │ FORENSICS & INTELLIGENCE │  │
│  │ - LiveClock  │ │ - PhotoProof │  │ - Chronological│ │ - 5-Pillar Forensic Audit│  │
│  │ - Converter  │ │ - WebCrypto  │  │   Movement Map │ │ - Temporal Anomaly Scan  │  │
│  │ - TimeDiff   │ │   SHA-256    │  │ - Haversine &  │ │ - Focus Session Logger   │  │
│  │ - Countdown  │ │ - AntiCheat  │  │   Velocity HUD │ │ - Context Switch Index   │  │
│  │ - WorldClocks│ │ - 5-Pillar   │  │ - Plausibility │ │ - Activity Transition    │  │
│  │ - Formats    │ │   Verdict UI │  │   Inspector    │ │   Tape & AI Assessment   │  │
│  └──────┬───────┘ └──────┬───────┘  └───────┬────────┘ └────────────┬─────────────┘  │
│         │                │                  │                       │                │
│         ▼                ▼                  ▼                       ▼                │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ LEVEL 2: DETERMINISTIC COMPUTATION ENGINE (Client & Shared Pure Functions)     │  │
│  │ - SHA-256 Canonical Digest (Web Crypto API) & CSPRNG Ref Generator             │  │
│  │ - Temporal Metrics (Clock Drift, Event Gaps, Frequency, Sequence Ordering)     │  │
│  │ - Geospatial Metrics (Haversine Distance km, Elapsed min, Velocity km/h)       │  │
│  │ - Context Switch Metrics (Transitions, Switches/hr, Avg Block, Fragmentation%) │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────────────────────┼────────────────────────────────────────┘
                                              │ Authenticated HTTPS (Bearer JWT)
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND LAYER (PostgreSQL + RLS + Edge Functions)         │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Deno Edge Functions (@google/genai SDK — gemini-3.8-flash + responseSchema)    │  │
│  │ 1. telegram-proof      : Server clock check + Multimodal Forensic Verification │  │
│  │                          + Telegram Group/Admin Dispatch + DB Persistence      │  │
│  │ 2. temporal-analysis   : Evaluates deterministic temporal & geospatial metrics │  │
│  │                          and context-switching telemetry -> Structured JSON    │  │
│  │ 3. seed-users          : Secured via Timing-Safe Secret / Admin Role Check;    │  │
│  │                          zero hardcoded passwords                              │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────┘  │
│                                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Schema (RLS Enforced)                                               │  │
│  │ - profiles, user_roles (with fixed has_role execute permission)                │  │
│  │ - proof_records        (source evidence: timestamp, GPS, SHA-256, anti-cheat)  │  │
│  │ - forensic_verifications (5-pillar breakdown, visual signals, limitations)     │  │
│  │ - temporal_analyses    (risk_level, risk_score, anomalies[], source_record_ids)│  │
│  │ - geospatial_events    (from/to proof refs, distance_km, speed_kmh, status)    │  │
│  │ - time_sessions        (category, label, start_at, end_at, duration_sec, type) │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

1. **Cryptographic Proof Binding (Level 1 & Level 2)**:
   - Reference numbers use `crypto.getRandomValues(new Uint32Array(6))` to generate collision-resistant `BT-<TIMESTAMP_B36>-<CSPRNG>` IDs.
   - SHA-256 digest is computed via `crypto.subtle.digest("SHA-256", ...)` over canonicalized string `v1|${refNumber}|${isoTime}|${unixTime}|${lat}|${lon}|${accuracy}|${imageDataHash}` and displayed in full 64-character hex (with short prefix in the canvas HUD and full hex in the forensic verification panel and `proof_records.hash`).
2. **Additive Database Tables (Supabase Migration)**:
   - `forensic_verifications`: Links `proof_record_id` → stores `cryptographic_status`, `metadata_status`, `temporal_status`, `geolocation_status`, `visual_forensics_status`, `visual_risk_score`, `confidence`, `signals` (`jsonb`), `limitations` (`text[]`), `summary`, `final_verdict`, and `model_id`.
   - `temporal_analyses`: Stores `user_id`, `source_record_ids` (`uuid[]`), `deterministic_metrics` (`jsonb`), `risk_level` (`NORMAL | REVIEW | SUSPICIOUS`), `risk_score`, `anomalies` (`jsonb`), `summary`, `recommended_action`, and `model_id`.
   - `geospatial_events`: Stores `user_id`, `proof_record_id`, `prev_proof_record_id`, `distance_km`, `elapsed_minutes`, `estimated_speed_kmh`, `plausibility_status` (`NORMAL | REVIEW | HIGHLY_UNUSUAL`), and `ai_interpretation`.
   - `time_sessions`: Stores `user_id`, `category` (`CONTENT | ADMIN | CLIENT | FIELD_OPS | RESEARCH | SYSTEM`), `activity_label`, `source_type` (`MANUAL | AUTO_TOOL | PROOF_EVENT`), `started_at`, `ended_at`, and `duration_seconds`.
3. **Interactive Component & State Mapping**:
   - **PhotoProof Capture Flow**: Capturing a frame immediately runs client `runAntiCheat()` + `resolveLocationName()` + `computeProofSha256()`, renders deterministic pillar statuses (`CRYPTOGRAPHIC`, `TEMPORAL`, `GPS`, `DEVICE`), and invokes the Edge Function for multimodal inspection and Telegram dispatch. If the Edge Function or Gemini is unreachable, the UI preserves the local proof record, sets `VISUAL FORENSICS: UNAVAILABLE`, and computes `FINAL VERDICT: REVIEW` (or `REJECTED` if a critical deterministic check failed).
   - **Timeline & Anomaly Flows**: Clicking **"RUN TEMPORAL ANOMALY SCAN"** or **"ANALYZE MOVEMENT PLAUSIBILITY"** computes deterministic metrics across the loaded `proof_records` immediately in the UI and invokes `temporal-analysis` for structured Gemini interpretation, persisting the resulting audit record.
   - **Focus & Context Switching Flow**: Starting/switching a session category in the top bar or Intelligence tab logs a timestamped transition in `time_sessions` (backed by Supabase + local cache for instant responsiveness). Tool usages (converting timestamps, calculating time deltas, setting countdowns, capturing proofs) optionally log lightweight observable transitions so the **Context Switching Index** updates in real time.
