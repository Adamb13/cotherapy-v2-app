# CoTherapy Changelog

All notable changes to the prototype are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

---

## [0.2.1] - 2026-03-26

### Added
- Product backlog document aligned with PRD v2.1 for CTO reference
- Changelog for tracking prototype evolution

---

## [0.2.0] - 2026-03-25

### Added
- **Preference Learning Infrastructure** (Sprint 1 complete):
  - Four structured correction tables (`moment_reviews`, `response_reviews`, `safety_overrides`, `policy_pack_edits`) with reason code dropdowns
  - Therapist review UI for approving, editing, or rejecting AI-proposed content
  - DSP learning loop that aggregates therapist corrections into learned preferences and injects them into system prompts
  - Audit trail columns on messages (`route`, `policy_pack_version`, `model_version`, `safety_score`)
- Consent-gated client onboarding flow with holding state before first session review
- Therapist notification system for crisis alerts (Route E triggers)
- Pause button for active clients on My Practice view
- Project documentation structure (`/docs/context/`, `/docs/skills/`)
- CLAUDE.md project context for AI-assisted development
- Founder-clinician output style for Claude Code

### Changed
- Post-crisis screen now properly blocks all chat until therapist review
- Improved paused client state handling with clearer user messaging

### Fixed
- Post-crisis screen display and navigation flow
- Paused client state not persisting correctly

---

## [0.1.1] - 2026-03-19

### Added
- Server-side API endpoints via Vercel serverless functions (`/api/chat`, `/api/extract-moments`, `/api/generate-ktms`)
- CORS headers for cross-origin API requests

### Changed
- Safety routes aligned with PRD v2.1 specification (5-route system: A-E)
- API key moved from client-side to server-side for security

### Fixed
- **Security**: API key no longer exposed in client JavaScript bundle

---

## [0.1.0] - 2026-03-18

### Added
- **Core Prototype** (initial working demo):
  - My Practice view (therapist dashboard with client list)
  - Client Setup view (add clients, configure dyad)
  - Post-Session Review view (paste notes, extract moments, generate KTMs)
  - Pre-Session Brief view (review chat history, provide feedback)
  - Intersession Coaching with 5-route safety system (Routes A-E all functional)
  - Dyad state machine (database-enforced: inactive → active → paused → post_crisis)
  - Policy Pack versioning and configuration
  - TAM (Therapeutic Alignment Model) questionnaire
  - DSP (Dialogue Style Parameters) configuration
  - KTM (Key Therapeutic Messages) generation and approval
  - Crisis detection with Route E escalation and 988 hotline
