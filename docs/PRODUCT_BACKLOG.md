# CoTherapy Product Backlog

**Last updated:** 2026-03-27
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

### Demo Data (Sprint 2 — March 2026)
- ✅ **P9: Multi-client demo data seed** — 5 synthetic clients with clinician-written content + 2 sandbox clients
  - Sarah L. (IFS): preference learning demo with 6 sessions, 35 messages, therapist corrections
  - David R. (CBT): routine workflow demo with high approval rate
  - Michael T. (Integrative): post-crisis demo with Route E, crisis notification
  - Emily K. (CBT): inactive/pre-activation demo showing consent gate
  - James P. (Psychodynamic): sensitivity flag demo with containment
  - npm scripts: `seed:demo`, `seed:sandbox`, `seed:all`

---

## Sprint 2 — Pre-Engineer Demo Build

### Priority Order

#### P9: Multi-client demo data seed ✅
Status: COMPLETE
Seed script created and verified. 5 demo clients + 2 sandbox clients with varied scenarios.

#### P6: Review Queue / My Practice dashboard ✅
Status: COMPLETE (verifying)
Cross-client review queue showing unreviewed moments, chat messages, crisis alerts, post-crisis clients.

#### P12: Client App — Intersession Coaching Experience
Status: IN PROGRESS
Standalone client-facing web app. Mobile-first. Separate route/layout from therapist views. Consumes existing /api/chat endpoint and dyad state machine. No real auth (demo mode, matching therapist app).

PRD source: Section 3.3 (Client Onboarding Sequence), Onboarding Workflow Spec v4

Sub-items (build in order):

**P12a: Client app shell + state-driven views**
Separate route with client layout (no therapist nav). Dyad state drives what the client sees:
- invited/consent_pending: not reachable (no account yet)
- account_created: welcome screen, "your therapist is setting things up"
- configured/inactive: waiting screen, "your therapist will open coaching when ready"
- active: chat interface (P12c)
- post_crisis: hold screen, "your therapist has been notified," grounding resources
- deactivated: paused screen with crisis resources
Brand palette, no therapist chrome. Crisis resources visible on every non-chat state.

**P12b: Client consent + onboarding flow**
Consent/TOS screen (maps to Onboarding Spec Step 3). Explains: what CoTherapy is, what the AI does and does not do, what the therapist sees, data storage, right to withdraw. Accept creates account, decline notifies therapist. Welcome screen post-consent with crisis resources. No chat access yet.
For demo: stub the invite link, simulate the consent gate toggle.

**P12c: Intersession coaching chat UX**
Chat interface consuming /api/chat. Session boundary enforcement:
- Turn counter (shows remaining turns, configurable per Policy Pack usage_constraints)
- Session timer (countdown, configurable per Policy Pack usage_constraints)
- Sessions-per-week tracking
- Session end state: summary of conversation, next session date (if set), crisis resources
- Limit-hit states: "You've used your sessions for this week" / "Session complete"
- Post-crisis mode: chat locked, supportive/grounding message, therapist notified
Safety routing already functional in API. Client UX just needs to render the states.

**P12d: Client deactivation + edge state screens**
What the client sees when:
- Therapist deactivates coaching (message + crisis resources)
- Therapist reactivates (welcome back, context preserved)
- Usage constraints change mid-period
These are static screens driven by dyad state + Policy Pack fields. Small scope but required for end-to-end demo.

#### P8: Policy Pack edit + restore UI
Status: PROMPT WRITTEN, READY TO BUILD
Currently read-only Config History tab. Add edit capability and version restore. Each edit writes to policy_pack_edits correction table. Feeds preference learning loop.

#### P7: DSP Evolution Panel ("Your AI has learned...")
Status: PROMPT NOT YET WRITTEN
Shows therapists what the system has learned from their corrections. Review counts, active learned preferences, correction examples, reset button. Key investor/therapist demo screen — makes preference learning flywheel visible.

#### P10: Onboarding flow polish
Status: PROMPT NOT YET WRITTEN
Clinical language pass on TAM questionnaire, modality explanations, UX improvements. Prep for live demos with Melanie and Jackie. Connects to P12b — therapist-side and client-side onboarding testable together.

---

## Icebox (Engineer Territory)

### Security & Infrastructure
- 🧊 Row-Level Security (RLS) policies
- 🧊 Real authentication (replacing demo auth for both therapist and client apps)
- 🧊 Production error handling and logging
- 🧊 Multi-user/multi-therapist support
- 🧊 Real-time subscriptions for crisis alerts
- 🧊 CI/CD pipeline
- ✅ Automated test suite — Playwright UI tests (24 tests, 7 spec files)

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
| TIM | Therapeutic Intensity Model (intervention depth, Levels 1-5) | ✅ UI selector implemented (Session Notes right panel) |

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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes.

---

## Notes

1. **Prototype vs. Production:** This backlog reflects founder-built prototype work. Items in Icebox require proper engineering discipline (testing, security, scalability).

2. **Demo Data:** Synthetic demo data will be clinically validated composites, not real patient data. All scenarios reflect realistic clinical situations without PHI.

3. **Regulatory Compliance:** All development follows CURES regulatory framework:
   - **Function 1:** CDS-exempt therapist tools (Post-Session, Pre-Session views)
   - **Function 2:** Coaching delivery on pre-approved content (Intersession Coaching)

4. **Data Asset Strategy:** The 4 correction tables are the core data asset. Every therapist action writes a structured record — this is what makes the AI learnable and the system defensible.

5. **Advisory Validation:** Several PRD features require clinical advisory board review before implementation (TIM levels, crisis detection criteria, usage constraint defaults). See PRD Advisory Validation Tracker.
