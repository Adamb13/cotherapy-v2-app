# CoTherapy Project Rules

## General
- Explain changes in non-technical terms before asking to commit

## Security
- ALWAYS check for exposed API keys before pushing code
- Run: `git diff --staged | grep -iE "sk-ant|sk-proj|api[_-]?key.*=.*['\"][a-zA-Z0-9]"`
- Never use `VITE_` prefix for sensitive keys (exposes to browser)
- Confirm `.env` is in `.gitignore`

## Safety-Critical Code
- Route E (crisis detection) must ALWAYS return hardcoded responses - never rely on AI
- Test crisis patterns thoroughly before deploying

## Development
- Topics to avoid is CLIENT-specific, not therapist-global
- Use serverless functions (`/api/*`) for all AI calls - keeps keys server-side
