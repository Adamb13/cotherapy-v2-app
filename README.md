# CoTherapy.ai Demo

A working React demo of CoTherapy, an AI-powered intersession support tool for therapists.

## Features

- **Therapist Intake**: Configure TAM (Therapeutic Alignment Model) and DSP (Dialogue Style Parameters)
- **Post-Session Review**: AI extracts clinical moments and KTMs from session notes
- **Pre-Session Review**: Review intersession chat excerpts and provide feedback
- **Client Chat**: Real-time chat with tier detection (safety escalation)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:5173

## Database (Supabase)

This demo connects to your existing Supabase project. The `.env` file is pre-configured with your credentials.

If you need to set up a new database:
1. Create a project at https://supabase.com
2. Run the schema SQL from `CoTherapy_Schema_2025-01-11.sql`
3. Run the sample data SQL from `CoTherapy_SampleData_2025-01-11.sql`
4. Update `.env` with your project URL and anon key

## Demo Mode

The app runs in demo mode by default, which:
- Uses hardcoded therapist/client IDs from sample data
- Bypasses authentication
- Generates mock AI responses (no Claude API needed)

To add real Claude AI responses, you would add:
```
VITE_ANTHROPIC_API_KEY=your-key
```
And modify `src/lib/ai.js` to use the real Anthropic SDK.

## Deploy to Vercel

```bash
# Build
npm run build

# The 'dist' folder contains your static site
# Deploy to Vercel:
npx vercel
```

Or connect your Git repo to Vercel for automatic deployments.

## Flows

### Therapist Flow
1. **Intake** → Configure modality, DSP preferences, boundaries
2. **Post-Session** → Paste notes → Review AI-extracted moments → Approve KTMs → Set integration direction
3. **Pre-Session** → Review chat excerpts → Provide DSP feedback

### Client Flow
1. **Chat** → Message the AI → Tier detection handles safety escalation

## Tech Stack

- React 18
- Vite
- Supabase (PostgreSQL + Auth)
- No build-time TypeScript (plain JS for simplicity)

## Notes

- This is a demo/prototype, not production code
- AI responses are mocked - add Anthropic API for real responses
- Auth is bypassed in demo mode
- Row-Level Security is configured in the database schema
