# CoTherapy.ai — Claude Code Context

## What This Is

Therapist-supervised AI for intersession client support. React 18 + Vite 6 + Supabase + Vercel + Claude API.

## Documentation Standards

Write excellent documentation with every change:
- Add clear comments in code explaining WHY, not just what
- Every new function gets a comment block: what it does, what it takes, what it returns
- Every new table or column gets a comment explaining its purpose in the system
- Update CLAUDE.md if the change affects architecture, safety, or schema
- Commit messages must be descriptive: "feat: add moment_reviews table with reason code dropdowns for therapist corrections" not "add table"

## Safety Rules (Never Violate)

- Route E crisis response MUST include 988 hotline number
- Hardcoded fallback crisis response must exist independent of AI
- Post-crisis mode blocks ALL chat until therapist reviews
- Client cannot chat unless dyad status is ACTIVE
- Safety route priority: E → D → B → C → A (most dangerous first)
- Never modify safety patterns in ai.js without explicit approval

## Regulatory Language (Never Violate)

- AI is a "coaching companion" — NEVER "therapist" or "counselor"
- Interactions are "coaching" or "reinforcement" — NEVER "therapy" or "treatment"
- AI "reinforces session themes" — NEVER "provides treatment"
- The therapist is the clinical authority. AI NEVER claims clinical authority
- See /docs/context/regulatory.md for full CURES framework and prohibited language

## Data Asset Rule

Every therapist action (approve, edit, reject, override) MUST write a structured record with a reason code to the appropriate review table. This is core data flow, not optional logging.

## Key Files

- src/lib/ai.js — Safety routing + Claude API + system prompt assembly
- src/lib/db.js — All Supabase queries, Policy Pack, dyad state machine
- src/pages/ClientChat.jsx — Client chat with dyad state checks
- src/pages/PostSession.jsx — Session notes → moments → KTMs → review
- src/pages/PreSession.jsx — Chat review, feedback, DSP feedback, config history
- src/pages/TherapistSettings.jsx — Therapist onboarding wizard
- src/pages/ClientOnboarding.jsx — Client management + activation

## Deeper Documentation (Read Before Modifying These Areas)

Context (rules and constraints):
- /docs/context/regulatory.md — CURES framework, FDA positioning, language rules
- /docs/context/architecture.md — Data architecture, memory tiers, preference learning schema

Skills (how we do things here):
- /docs/skills/safety-routing.md — Full 5-route system, regex patterns, crisis handling
- /docs/skills/prompting.md — System prompt assembly, DSP injection, token limits
- /docs/skills/supabase-patterns.md — Schema, JSONB patterns, query patterns
- /docs/skills/deployment.md — Vercel, GitHub, Supabase SQL-first workflow

## Coding Standards

- Plain JavaScript (no TypeScript)
- Supabase client for all DB operations
- API keys server-side only (Vercel env vars)
- Commits: feat:/fix:/refactor: prefix
- Each feature = one commit
- Database changes in Supabase SQL Editor BEFORE code changes

## Release Notes

After every feature or significant change, add an entry to /docs/CHANGELOG.md under [Unreleased]. Group entries as Added/Changed/Fixed. This is automatic — do it on every commit, no need to ask.

When I say "cut a release":
1. Move all [Unreleased] items into a new versioned entry with today's date
2. Git tag the release: git tag -a v0.X.0 -m "[summary]"
3. Push tag: git push origin v0.X.0
4. Confirm what was tagged and the rollback command if needed

Version numbering: increment minor version (0.2.0 → 0.3.0) for each weekly release. Use patch (0.3.1) for mid-week hotfixes.

Do NOT auto-tag or auto-version without explicit instruction.
