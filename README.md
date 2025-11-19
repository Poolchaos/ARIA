# ARIA: Adaptive Responsive Intelligence Assistant

**A privacy-first, multi-user household voice assistant**

ARIA is a self-hosted voice assistant designed for small households (2-5 members) to coordinate calendars, manage tasks, share shopping lists, track budgets, and stay organized—all through natural conversation.

## Features

- **Voice-First Interaction:** Talk to ARIA naturally, get spoken responses
- **Multi-User Support:** Separate personal data, shared household resources
- **Privacy-First:** Self-hosted on your server, zero telemetry, you own your data
- **Multi-LLM Support:** Choose Claude, Gemini, OpenAI, or local models (Ollama)
- **Household Coordination:** Shared calendars, shopping lists, budget tracking
- **Personal Productivity:** Tasks, notes, break reminders, focus sessions
- **Beautiful UI:** Mobile-first web app, animated particle face, light/dark themes

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + Three.js
- **Backend:** Node.js + Express + Prisma (SQLite)
- **Agent:** Python + FastAPI + LangChain
- **Deployment:** Docker Compose (single command setup)

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/ARIA.git
cd ARIA

# Setup environment
cp .env.example .env
# Edit .env with your API keys (Claude, Gemini, or OpenAI)

# Launch with Docker
docker-compose up -d

# Access ARIA
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Python Agent: http://localhost:8000
```

## Documentation

- [Business Requirements](docs/plans/business-requirements.md)
- [Technical Architecture](docs/plans/technical-architecture.md)
- [Phase 0 Implementation Guide](docs/plans/phase-0-checklist.md)
- [Project Rules](docs/_rules/project_rules.md)

## Development Status

**Phase 0: Foundations** (In Progress)
- [ ] Docker setup
- [ ] Authentication system
- [ ] Frontend scaffold
- [ ] Theme system

See [Phase 0 Checklist](docs/plans/phase-0-checklist.md) for detailed progress.

## License

MIT License - 100% free and open source

## Contributing

See [Core Rules](docs/_rules/core_rules.md) for development standards and workflow.
