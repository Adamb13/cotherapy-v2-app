# CoTherapy Changelog

All notable changes to the prototype are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

(none)

---

## [0.3.0] - 2026-03-27

### Added
- **My Practice Dashboard (P6)**: New therapist home screen with searchable, sortable client table
  - Columns: Client, Status, Alerts, Pending Review, Last Session, Next Session, Last Chat
  - Pending Review shows combined count of unreviewed moments + flagged messages (green ✓ if clear, amber count if pending)
  - Next Session with smart formatting (blue "Today, 2:00 PM", "Tomorrow", or date)
  - Search and status filters (All/Active/Pending/Inactive)
  - Sort order: alert rows → active → pending → inactive → alphabetical within each group
- **Client Overview page**: Landing page when opening a client from dashboard
  - Summary stats grid (Modality, Sessions, Last Session, Last Chat, Activity, Pending Review)
  - Action cards: Add Session Notes, Review Chats, Client Settings
  - Pause/Resume button, Crisis alert banner with navigation to crisis review
- **Crisis Alert Nav Indicator**: Pulsing red dot with "N crisis alerts" text in navigation bar
  - Persistent across all pages — therapist sees alerts immediately regardless of which page they're on
  - 8px dot with expanding pulse ring animation (2 second loop)
  - Clicking navigates to My Practice dashboard where crisis client is highlighted
- **Crisis Review & Resolution Flow**: Full-screen crisis review page with:
  - Chat transcript with Route E trigger message highlighted
  - Timeline showing when crisis was detected and chat locked
  - Safety classification details explaining why Route E was triggered
  - Three resolution options: clear & resume, clear & adjust settings, keep hold
  - Optional clinical note field for audit documentation
  - All actions logged in `safety_overrides` table for compliance
- **Playwright UI test suite** — 24 automated tests across 7 spec files:
  - Dashboard, Client Overview, Session Notes, Chat Review, Client Settings, Special States, Navigation
  - Shared helpers: `login()`, `openClient()`, `clickActionCard()`, `clickBreadcrumbBack()`
  - npm scripts: `test:ui` (headless) and `test:ui:headed` (visible browser)
  - Testing section added to CLAUDE.md
- **Next Session scheduling**: `next_session_date` column on clients table
- **Multi-client demo data seed (P9)**: 5 synthetic clients + 2 sandbox clients
  - npm scripts: `seed:demo`, `seed:sandbox`, `seed:all`
- Placeholder stub docs for architecture, safety-routing, prompting, supabase-patterns, deployment
- Design spec saved to docs/reference/session-notes-design.md

### Changed
- **Session Notes redesigned as 60/40 split panel** — left panel for notes workspace, right panel for intersession configuration (always visible, both scroll independently)
- Brand green palette applied throughout: teal #1a3a3a, sage #7d9a8c, sageLight #f0f5f2, panelBg #faf9f6
- Integration direction rebuilt as radio card style with circle indicators
- TIM levels: compact horizontal selector with labels on all 5 options, sentence case
- All selected states unified: bg #f0f5f2, border #7d9a8c, text #1a3a3a — no exceptions
- All focus states use sage (#7d9a8c) instead of browser blue
- **My Practice dashboard polish**: sans-serif title, brand teal Add Client button, filter chips, warm table header, amber review counts (red reserved for crisis), row dimming for inactive/pending, outlined Open button
- Renamed navigation: "Session Notes" (was Post-Session), "Chat Review" (was Pre-Session)
- Moved personal config to CLAUDE.local.md (local only, not tracked in git)

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
