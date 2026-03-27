# CoTherapy Product Backlog

**Last updated:** 2026-03-26
**Maintained by:** Adam Blackman (Founder/CEO)
**PRD Version:** v2.1 (2026-03-25)

---

## Status Legend
- ✅ Complete
- 🔨 In Progress
- ⬜ Planned
- 🧊 Icebox (post-engineer)

---

## Completed (Prototype Phase)

### Core Views & Systems
- ✅ My Practice view (therapist dashboard)
- ✅ Client Setup view
- ✅ Post-Session Review view (moment review, KTM generation)
- ✅ Pre-Session Brief view (chat history review, response feedback)
- ✅ Intersession Coaching with 5-route safety system (all routes functional)
- ✅ Dyad state machine (database-enforced)
- ✅ 3 API endpoints (`/api/chat`, `/api/extract-moments`, `/api/generate-ktms`)

### Preference Learning Infrastructure (Sprint 1 — March 2026)
- ✅ Audit trail columns on messages (`route`, `policy_pack_version`, `model_version`, `safety_score`)
- ✅ 4 structured correction tables (`moment_reviews`, `response_reviews`, `safety_overrides`, `policy_pack_edits`) with reason code dropdowns
- ✅ DSP learning loop (aggregate corrections → `dsp_learned_preferences` → inject into prompts)
- ✅ Client consent gate and holding state before first session review
- ✅ Therapist crisis notification system

---

## Next Up (Sprint 2 — Pre-Engineer Demo Build)

### Phase 1 — Demo Foundation
- ⬜ **P9: Multi-client demo data seed**
  - 3-5 synthetic clients with varied scenarios (active w/ history, post-crisis holding, newly onboarded, paused, crisis escalation history)
  - Schema-mapped: client profiles, session notes, extracted moments, chat histories, KTMs, safety events
  - Supabase seed script
  - **Priority: HIGH — blocks all subsequent views**

### Phase 2 — Therapist Workflow
- ⬜ **P6: Review Queue (therapist inbox)**
  - Cross-client dashboard: unreviewed moments, flagged messages, crisis alerts, post-crisis clients
  - Sort/filter by urgency, client, type
  - Click-through to Post-Session and Pre-Session views
  - *Depends on: P9*

- ⬜ **P8: Policy Pack edit + restore UI**
  - Convert read-only Config History tab to editable
  - Version history with point-in-time restore
  - Writes to `policy_pack_edits` table (already exists)
  - *Depends on: P9*

### Phase 3 — Intelligence Layer Showcase
- ⬜ **P7: DSP Evolution Panel ("Your AI has learned...")**
  - Aggregate correction counts from 4 review tables
  - Display active learned preferences with correction examples
  - Reset/rollback capability
  - **Key demo screen: shows preference learning flywheel in action**
  - *Depends on: P6, P9*

### Phase 4 — Demo Polish
- ⬜ **P10: Onboarding flow polish**
  - Clinical language pass on TAM questionnaire
  - Modality explanations (IFS, CBT, ACT, psychodynamic)
  - UX refinements for live therapist demos

---

## Icebox (Engineer Territory)

### Security & Infrastructure
- 🧊 Row-Level Security (RLS) policies
- 🧊 Real authentication (replace demo auth)
- 🧊 Production error handling and logging
- 🧊 Multi-user/multi-therapist support
- 🧊 Real-time subscriptions for crisis alerts
- 🧊 CI/CD pipeline
- 🧊 Automated test suite

### PRD v2.1 Features (Not Yet Implemented)
- 🧊 **TIM (Therapeutic Intensity Model)**: 5-level intervention depth system (Levels 1-5: Reflect & Resource → Deep Engagement). Governs AI's permitted therapeutic ambition per dyad.
- 🧊 **TQE (Therapeutic Quality Evaluator)**: 5th stage of evaluator pipeline. Scores responses against modality fidelity and DSP adherence. Evolves from generic rubrics to personalized criteria via preference learning.
- 🧊 **Full 5-stage Evaluator Pipeline**: Safety Scan → Route Boundary Check → PHI-Lint → Response Constraints → TQE
- 🧊 **Informed Consent Versioning**: Versioned consent records linked to TOS version, re-consent flagging on TOS changes
- 🧊 **Toggle Overrides for TIM**: Enable/disable specific capabilities within TIM levels
- 🧊 **Usage Constraints**: Sessions per period, turns per session, session duration limits

---

## Architecture Notes for CTO

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite 6 |
| Backend | Vercel Serverless Functions |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (via AWS Bedrock) |

### Platform Architecture (PRD v2.1)
The product separates into two layers:
- **Therapy Governance Runtime (TGR)**: Model-agnostic control plane — Policy Packs, Memory Governance, Safety Router, HITL Console, Audit/Change Control, Evaluation Gates
- **Reference Application**: Therapist/client-facing UX built on TGR

### Key Systems (Current State)
- **Safety Router:** 5-route classification (A-E) with Policy Pack governance
- **Preference Learning:** 4 correction tables → DSP learned preferences → prompt injection
- **Memory Architecture:** Two-tier system per PRD v2.0 — Tier 0 (ephemeral) + Tier 1 (continuity, with sensitivity flags). Behavioral control via Policy Pack, not access control.

### Five Configuration Components (PRD v2.1)
| Component | Description | Status |
|-----------|-------------|--------|
| TAM | Therapeutic Alignment Model (therapist + client levels) | ✅ Implemented |
| DSP | Dialogue Style Parameters (tone, warmth, directiveness) | ✅ Implemented |
| KTMs | Key Therapeutic Messages (approved insights/reframes) | ✅ Implemented |
| Integration Direction | Focus area for intersession (Reflective/Behavioral/Cognitive/Somatic/Stabilization) | ✅ Implemented |
| TIM | Therapeutic Intensity Model (intervention depth, Levels 1-5) | 🧊 Not yet implemented |

### Regulatory Positioning (PRD Section 1.3)
- **Function 1 (CDS-exempt):** Therapist-facing clinical decision support — AI surfaces candidate KTMs for therapist review. Designed to satisfy CURES Act Section 520(o)(1)(E).
- **Function 2 (Wellness):** Client-facing intersession coaching — delivers therapist-approved content within governance protocols. Not intended for diagnosis or treatment selection.

### Reference Documentation
- `/docs/context/regulatory.md` — CURES framework and clinical constraints
- `/docs/context/architecture.md` — Data architecture and preference learning schema
- `/docs/skills/safety-routing.md` — Full 5-route system specification
- `CoTherapy_PRD_v2_1_2026-03-25.docx` — Full system specification

---

## Terminology Note (PRD v2.1)
Per regulatory alignment, use these terms consistently:
- ✅ "Intersession Coaching" (not "AI therapy" or "intersession chat")
- ✅ "Coaching companion" (not "therapist" or "counselor")
- ✅ "Therapist-approved content within governance protocols" (not "autonomous AI interaction")
- ✅ "Reinforcement" or "coaching" (not "therapy" or "treatment")

---

## Notes

1. **Prototype vs. Production:** This backlog reflects founder-built prototype work. Items in Icebox require proper engineering discipline (testing, security, scalability).

2. **Demo Data:** Synthetic demo data will be clinically validated composites, not real patient data. All scenarios reflect realistic clinical situations without PHI.

3. **Regulatory Compliance:** All development follows CURES regulatory framework:
   - **Function 1:** CDS-exempt therapist tools (Post-Session, Pre-Session views)
   - **Function 2:** Coaching delivery on pre-approved content (Intersession Coaching)

4. **Data Asset Strategy:** The 4 correction tables are the core data asset. Every therapist action writes a structured record — this is what makes the AI learnable and the system defensible.

5. **Advisory Validation:** Several PRD features require clinical advisory board review before implementation (TIM levels, crisis detection criteria, usage constraint defaults). See PRD Advisory Validation Tracker.
