# CoTherapy.ai

AI-powered intersession support tool for therapists. This is a working React demo/prototype.

## Features

### Therapist Views
- **My Practice** - Configure TAM (Therapeutic Alignment Model) and DSP (Dialogue Style Parameters)
- **Client Setup** - Onboard clients, manage dyad states (Active, Paused, Archived)
- **Post-Session** - AI extracts clinical moments and KTMs from session notes
- **Pre-Session** - Review intersession chat excerpts, view config history

### Client View
- **Chat** - Real-time AI chat with 3-tier safety detection and escalation

### Core Systems
- **Dyad State Machine** - Tracks therapist-client relationship lifecycle (Invited → Pending Config → Active → Paused → Archived)
- **Policy Pack Versioning** - Point-in-time snapshots of configuration for audit/compliance
- **HITL Feedback** - Human-in-the-loop feedback on AI responses

## Setup

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/Adamb13/cotherapy-v2-app.git
cd cotherapy-v2-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your credentials to .env (see Environment Variables below)

# Start development server
npm run dev
```

Open http://localhost:5173

### Environment Variables

Create a `.env` file with:

```bash
# Supabase (get from supabase.com dashboard → Settings → API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Anthropic (get from console.anthropic.com)
VITE_ANTHROPIC_API_KEY=sk-ant-your-key
```

### Database Setup (New Projects Only)

If setting up a fresh Supabase project:

1. Create a project at https://supabase.com
2. Run the schema SQL from `CoTherapy_Schema_2025-01-11.sql`
3. Run the sample data SQL from `CoTherapy_SampleData_2025-01-11.sql`
4. Update `.env` with your project URL and anon key

## Development Workflow

### Branch Strategy

**Do not push directly to `main`.** Use feature branches and pull requests:

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push your branch
git push -u origin feature/your-feature-name

# Create a PR on GitHub to merge into main
```

### Building for Production

```bash
npm run build
```

The `dist` folder contains the static site.

## Deployment

The repo is connected to Vercel for automatic deployments. Pushing to `main` triggers a production deploy.

## Tech Stack

- React 18
- Vite 6
- Supabase (PostgreSQL)
- Claude Sonnet 4 (Anthropic API)
- Plain JavaScript (no TypeScript)

## Project Structure

```
src/
├── App.jsx              # Main app with routing and nav
├── lib/
│   ├── supabase.js      # Supabase client
│   ├── db.js            # Database functions, dyad state machine
│   └── ai.js            # Claude API integration
├── pages/
│   ├── TherapistSettings.jsx  # My Practice - TAM/DSP config
│   ├── ClientOnboarding.jsx   # Client list and onboarding
│   ├── PostSession.jsx        # Session review and KTM generation
│   ├── PreSession.jsx         # Chat review and config history
│   └── ClientChat.jsx         # Client-facing chat interface
└── index.css            # Global styles
```

## Demo Access

The demo is password-protected. Contact the team for access credentials.

## Notes

- This is a prototype, not production code
- RLS (Row-Level Security) is configured in the database schema
- The 3-tier safety system escalates based on detected content
