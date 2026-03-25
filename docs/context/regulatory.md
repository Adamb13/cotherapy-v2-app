# Regulatory Positioning — CURES Framework & Language Rules

> Read this file before modifying any client-facing AI text, consent language,
> system prompts, UI copy, or error messages. Regulatory language is not optional.

## Two-Function Architecture

CoTherapy is positioned as two distinct software functions:

### Function 1: CURES-Exempt Clinical Decision Support (CDS) — Therapist-Facing
The post-session system that extracts clinical moments and generates KTMs for
therapist review. Qualifies for CURES CDS exemption because:
- Therapist independently reviews every output before it reaches the client
- Therapist can accept, modify, or reject any AI suggestion
- Therapist is not required to follow the AI's recommendations
- Output is intended to support, not replace, clinical judgment

### Function 2: Intersession Coaching System — Client-Facing
Delivers therapist-approved content to the client between sessions. This is
NOT CDS — it's a separate function that reinforces what the therapist has
already approved. It does not diagnose, treat, prescribe, or make clinical
decisions.

## Key Phrase
"The client isn't having therapy. The client is doing their homework."
Use "coaching" not "homework" when speaking with therapists.

## Language Rules — ALWAYS Use
- "Intersession coaching" NOT "intersession therapy" or "treatment"
- "Delivers therapist-approved KTMs within governance protocols" NOT "AI operates autonomously"
- "Practice management tool" NOT "clinical tool" or "treatment tool"
- "Coaching" or "reinforcement" NOT "therapy" or "treatment" for client-facing interactions
- "Therapist independently reviews" — required for CURES CDS exemption
- TIM levels = "reinforcement depth" NOT "therapeutic intensity"
- The AI "supports reflection" and "reinforces session themes"
- Reference the therapist as authority: "as you and [therapist] discussed"

## Language Rules — NEVER Use
- Never describe AI as "providing therapy" or "treating" the client
- Never say "autonomous AI therapy" or "AI-driven treatment"
- Never claim AI "diagnoses" or "assesses" clinical conditions
- Never describe AI as making "clinical decisions"
- Never position AI as "co-therapist" in regulatory/legal contexts
- Never use "I recommend" or "based on my assessment" in AI voice
- Never imply AI operates independently of therapist governance

## What Function 2 Explicitly Does NOT Do
- No real-time clinical monitoring
- No autonomous crisis assessment (Route E = notification + resources, not intervention)
- No treatment plan modification
- No medication or regimen selection
- No independent clinical interpretation
- No diagnosis or differential diagnosis

## What This Means for Code

### System Prompts (ai.js)
The AI's self-description in system prompts must reflect coaching positioning:
- "You are a coaching companion that helps clients reflect on and practice
  what they've discussed with their therapist"
- NOT: "You are a therapeutic AI" or "You provide therapy between sessions"

### UI Text (all .jsx files)
- Tab labels, headers, descriptions should use "coaching" language
- Client-facing: "Your coaching check-in" not "Your therapy session"
- Therapist-facing: "Intersession coaching review" not "AI therapy review"

### Error Messages and Safety Responses
- Always reference "your therapist" as the clinical authority
- Route E: directs to human resources (988, therapist) — AI does NOT perform
  crisis intervention, it connects to humans who do

### Consent Language
- Must include: AI disclosure, coaching (not therapy) characterization,
  data handling, crisis protocols, scope limitations
- Template for therapist to incorporate into their practice intake

## Regulatory Background

### Current Status
- Hooper Lundy (health regulatory firm) took position that CoTherapy
  constitutes a medical device requiring FDA approval
- Our counter-position: two-function architecture separates CDS
  (therapist-facing, CURES-exempt) from coaching (client-facing, not a device)
- Ben at Gunderson reviewing CURES position — awaiting written opinion
- IL and CA state-level AI therapy regulations may impose additional restrictions

### Competitor Positioning (for reference)
- Slingshot/Ash: positions as "wellness" (no therapist in loop = easier argument)
- SonderMind: positions as "practice management"
- Both operate without FDA clearance

### Cautionary Precedents
- Woebot: $123.5M raised, shut down
- Pear Therapeutics: 3 FDA-cleared products, Chapter 11 bankruptcy
- Kintsugi: $16M spent on regulatory alone, never filed
- Lesson: Don't pursue FDA prematurely. If CURES holds, FDA becomes future
  strategic option (competitive moat), not launch requirement

### Positive Precedent
- RecovryAI: FDA Breakthrough Device Designation granted March 2026 for
  patient-facing clinical AI — track for reference

### Why CoTherapy Can't Claim "Wellness"
Ash can claim wellness because there's no therapist. The moment you put a
licensed therapist in the loop — configuring AI based on clinical sessions,
reviewing outputs — you've implicitly claimed clinical purpose. Our positioning
is the two-function split, not wellness.
